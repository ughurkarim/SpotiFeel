"""Server-side sessions and request-forgery protection.

The browser receives only a signed, opaque session id. Spotify tokens remain in
SQLite for local development/tests or Redis in production.
"""

import hashlib
import hmac
import json
import logging
import os
import secrets
import sqlite3
import time
from pathlib import Path

from flask import jsonify, request, session
from flask.sessions import SessionInterface, SessionMixin
from itsdangerous import BadSignature, Signer
from werkzeug.datastructures import CallbackDict


LOGGER = logging.getLogger(__name__)
UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


class ServerSideSession(CallbackDict, SessionMixin):
    def __init__(self, initial=None, sid=None, new=False):
        super().__init__(initial)
        self.sid = sid
        self.new = new
        self.modified = False


class SQLiteSessionStore:
    def __init__(self, path):
        self.path = str(path)
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as connection:
            connection.execute("CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, payload TEXT NOT NULL, expires_at INTEGER NOT NULL)")

    def _connect(self):
        return sqlite3.connect(self.path, timeout=5)

    def get(self, sid):
        now = int(time.time())
        with self._connect() as connection:
            row = connection.execute("SELECT payload, expires_at FROM sessions WHERE sid = ?", (sid,)).fetchone()
            if not row:
                return None
            if row[1] <= now:
                connection.execute("DELETE FROM sessions WHERE sid = ?", (sid,))
                return None
            return json.loads(row[0])

    def set(self, sid, payload, expires_at):
        serialized = json.dumps(payload, separators=(",", ":"))
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO sessions(sid, payload, expires_at) VALUES (?, ?, ?) "
                "ON CONFLICT(sid) DO UPDATE SET payload=excluded.payload, expires_at=excluded.expires_at",
                (sid, serialized, expires_at),
            )
            connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (int(time.time()),))

    def delete(self, sid):
        with self._connect() as connection:
            connection.execute("DELETE FROM sessions WHERE sid = ?", (sid,))


class RedisSessionStore:
    def __init__(self, url):
        try:
            import redis
        except ImportError as exc:  # pragma: no cover - exercised by deployment configuration
            raise RuntimeError("The redis package is required when REDIS_URL is configured") from exc
        self.client = redis.Redis.from_url(url, decode_responses=True)

    def get(self, sid):
        payload = self.client.get(f"spotifeel:session:{sid}")
        return json.loads(payload) if payload else None

    def set(self, sid, payload, expires_at):
        ttl = max(1, expires_at - int(time.time()))
        self.client.setex(f"spotifeel:session:{sid}", ttl, json.dumps(payload, separators=(",", ":")))

    def delete(self, sid):
        self.client.delete(f"spotifeel:session:{sid}")


class OpaqueSessionInterface(SessionInterface):
    session_class = ServerSideSession
    salt = "spotifeel-server-session"

    def __init__(self, store):
        self.store = store

    def _signer(self, app):
        return Signer(app.secret_key, salt=self.salt)

    def open_session(self, app, request):
        signed_sid = request.cookies.get(self.get_cookie_name(app))
        sid = None
        if signed_sid:
            try:
                sid = self._signer(app).unsign(signed_sid).decode("utf-8")
            except BadSignature:
                sid = None
        if sid:
            stored = self.store.get(sid)
            if stored is not None:
                return self.session_class(stored, sid=sid)
        return self.session_class(sid=secrets.token_urlsafe(32), new=True)

    def save_session(self, app, session_obj, response):
        cookie_name = self.get_cookie_name(app)
        if not session_obj:
            self.store.delete(session_obj.sid)
            response.delete_cookie(cookie_name, path=self.get_cookie_path(app), domain=self.get_cookie_domain(app))
            return
        expires = self.get_expiration_time(app, session_obj)
        expires_at = int(expires.timestamp()) if expires else int(time.time() + app.permanent_session_lifetime.total_seconds())
        self.store.set(session_obj.sid, dict(session_obj), expires_at)
        signed_sid = self._signer(app).sign(session_obj.sid.encode("utf-8")).decode("utf-8")
        response.set_cookie(
            cookie_name,
            signed_sid,
            expires=expires,
            httponly=self.get_cookie_httponly(app),
            secure=self.get_cookie_secure(app),
            samesite=self.get_cookie_samesite(app),
            path=self.get_cookie_path(app),
            domain=self.get_cookie_domain(app),
        )


def _is_production():
    return any(
        os.getenv(name, "").strip().lower() == "production"
        for name in ("SPOTIFEEL_ENV", "VERCEL_ENV", "FLASK_ENV")
    )


def configure_security(app, base_dir, redirect_uri=None):
    production = _is_production()
    secret = os.getenv("FLASK_SECRET") or os.getenv("FLASK_SECRET_KEY")
    if production and (not secret or len(secret) < 32):
        raise RuntimeError("Production requires FLASK_SECRET with at least 32 characters")
    if not secret:
        secret = secrets.token_urlsafe(48)
        LOGGER.warning("FLASK_SECRET is unset; using an ephemeral development secret")

    redis_url = os.getenv("REDIS_URL")
    if production and not redis_url:
        raise RuntimeError("Production requires REDIS_URL for durable server-side sessions")
    store = RedisSessionStore(redis_url) if redis_url else SQLiteSessionStore(os.getenv("SESSION_DB_PATH") or Path(base_dir) / ".sessions.sqlite3")

    app.secret_key = secret
    app.session_interface = OpaqueSessionInterface(store)
    app.config.update(
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SECURE=production or (redirect_uri or "").startswith("https://"),
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_NAME="spotifeel_session",
        PERMANENT_SESSION_LIFETIME=60 * 60 * 24 * 14,
    )

    @app.before_request
    def protect_state_changes():
        if request.method not in UNSAFE_METHODS or not request.path.startswith("/api/"):
            return None
        expected = session.get("csrf_token")
        supplied = request.headers.get("X-CSRF-Token", "")
        if not expected or not supplied or not hmac.compare_digest(expected, supplied):
            return jsonify({"error": "csrf_failed", "message": "Refresh the page and try again."}), 403
        return None


def csrf_token():
    token = session.get("csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session["csrf_token"] = token
    return token
