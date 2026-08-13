import pytest
from flask import Flask

import core
from app import app
from security import configure_security


def test_session_endpoint_is_safe_when_signed_out():
    app.config.update(TESTING=True)
    client = app.test_client()
    response = client.get("/api/session")
    assert response.status_code == 200
    assert response.get_json()["authenticated"] is False
    assert response.get_json()["csrf_token"]


def test_mutation_requires_csrf_before_authentication():
    app.config.update(TESTING=True)
    client = app.test_client()
    assert client.post("/api/player/toggle").status_code == 403
    csrf = client.get("/api/session").get_json()["csrf_token"]
    response = client.post("/api/player/toggle", headers={"X-CSRF-Token": csrf})
    assert response.status_code == 401
    assert response.get_json()["error"] == "not_authenticated"


def test_oauth_callback_rejects_invalid_state():
    app.config.update(TESTING=True)
    response = app.test_client().get("/callback?code=secret&state=wrong")
    assert response.status_code == 400
    assert b"Invalid state" in response.data


def test_login_sets_oauth_state_and_redirects_to_spotify():
    app.config.update(TESTING=True)
    client = app.test_client()
    response = client.get("/login")
    assert response.status_code == 302
    assert response.location.startswith(core.AUTH_URL)
    with client.session_transaction() as stored:
        assert stored["oauth_state"]


def test_token_refresh_rotates_access_token_without_losing_refresh_token(monkeypatch):
    class Response:
        status_code = 200

        @staticmethod
        def json():
            return {"access_token": "new-access", "expires_in": 3600}

    monkeypatch.setattr(core, "http_post", lambda *args, **kwargs: Response())
    with app.test_request_context("/"):
        from flask import session

        session["access_token"] = "expired-access"
        session["refresh_token"] = "stable-refresh"
        session["expires_at"] = 0
        assert core.ensure_token() is True
        assert session["access_token"] == "new-access"
        assert session["refresh_token"] == "stable-refresh"


def test_oauth_exchange_does_not_expose_provider_response(monkeypatch):
    class Response:
        status_code = 400
        text = "provider-secret-debug-payload"

        @staticmethod
        def json():
            return {"error_description": "provider-secret-debug-payload"}

    monkeypatch.setattr(core, "http_post", lambda *args, **kwargs: Response())
    client = app.test_client()
    with client.session_transaction() as stored:
        stored["oauth_state"] = "expected"
    response = client.get("/callback?code=code&state=expected")
    assert response.status_code == 502
    assert b"provider-secret-debug-payload" not in response.data


def test_cookie_contains_only_opaque_session_identifier():
    app.config.update(TESTING=True)
    client = app.test_client()
    with client.session_transaction() as stored:
        stored["access_token"] = "spotify-access-token-that-must-stay-server-side"
        stored["refresh_token"] = "spotify-refresh-token-that-must-stay-server-side"
    cookie = client.get_cookie(app.config["SESSION_COOKIE_NAME"])
    assert cookie is not None
    assert "spotify-access-token" not in cookie.value
    assert "spotify-refresh-token" not in cookie.value


@pytest.mark.parametrize("path", ["/api/now-playing", "/api/recommendations", "/api/track-metadata", "/api/wrapped"])
def test_authenticated_get_endpoints_return_401_when_signed_out(path):
    app.config.update(TESTING=True)
    response = app.test_client().get(path)
    assert response.status_code == 401
    assert response.get_json()["error"] == "not_authenticated"


def test_production_rejects_missing_secret(monkeypatch, tmp_path):
    monkeypatch.setenv("SPOTIFEEL_ENV", "production")
    monkeypatch.delenv("FLASK_SECRET", raising=False)
    monkeypatch.delenv("FLASK_SECRET_KEY", raising=False)
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    with pytest.raises(RuntimeError, match="FLASK_SECRET"):
        configure_security(Flask("security-test"), tmp_path)


def test_production_rejects_non_durable_session_configuration(monkeypatch, tmp_path):
    monkeypatch.setenv("SPOTIFEEL_ENV", "production")
    monkeypatch.setenv("FLASK_SECRET", "x" * 48)
    monkeypatch.delenv("FLASK_SECRET_KEY", raising=False)
    monkeypatch.delenv("REDIS_URL", raising=False)
    with pytest.raises(RuntimeError, match="REDIS_URL"):
        configure_security(Flask("security-test"), tmp_path)
