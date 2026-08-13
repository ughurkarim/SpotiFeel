import secrets
import time
from urllib.parse import urlencode

from flask import Blueprint, jsonify, redirect, request, session

import core
from security import csrf_token


bp = Blueprint("auth", __name__)


@bp.get("/login")
def login():
    if not core.spotify_configured():
        return "Spotify OAuth is not configured.", 503
    oauth_state = secrets.token_urlsafe(24)
    session["oauth_state"] = oauth_state
    params = {
        "client_id": core.CLIENT_ID,
        "response_type": "code",
        "redirect_uri": core.REDIRECT_URI,
        "scope": core.SCOPES,
        "state": oauth_state,
    }
    return redirect(f"{core.AUTH_URL}?{urlencode(params)}")


@bp.get("/callback")
def callback():
    if not core.spotify_configured():
        return "Spotify OAuth is not configured.", 503
    incoming_state = request.args.get("state")
    expected_state = session.pop("oauth_state", None)
    if not expected_state or not secrets.compare_digest(incoming_state or "", expected_state):
        return "Invalid state parameter", 400
    if request.args.get("error"):
        return "Spotify authorization was not completed.", 400
    code = request.args.get("code")
    if not code:
        return "Spotify did not return an authorization code.", 400
    response = core.http_post(
        core.TOKEN_URL,
        headers=core.auth_header(),
        data={"grant_type": "authorization_code", "code": code, "redirect_uri": core.REDIRECT_URI},
    )
    payload = core.safe_json(response) or {}
    if response.status_code != 200 or not payload.get("access_token"):
        core.app.logger.warning("Spotify OAuth token exchange failed with status %s", response.status_code)
        return "Spotify authorization could not be completed.", 502
    session["access_token"] = payload["access_token"]
    session["expires_at"] = time.time() + int(payload.get("expires_in", 3600))
    if payload.get("refresh_token"):
        session["refresh_token"] = payload["refresh_token"]
    elif not session.get("refresh_token"):
        return "Spotify did not provide a refresh token. Please reconnect.", 400
    if payload.get("scope"):
        session["scopes"] = payload["scope"]
    return redirect("/")


@bp.get("/api/session")
def whoami():
    return jsonify({"authenticated": core.ensure_token(), "configured": core.spotify_configured(), "csrf_token": csrf_token()})


@bp.get("/logout")
def logout():
    cache_key = core.session_cache_key()
    core.CURRENT_PLAYBACK_CACHE.pop(cache_key, None)
    core.USER_TASTE_CACHE.pop(cache_key, None)
    for key in [key for key in core.WRAPPED_REPORT_CACHE if key.startswith(f"{cache_key}:")]:
        core.WRAPPED_REPORT_CACHE.pop(key, None)
    session.clear()
    return redirect("/")
