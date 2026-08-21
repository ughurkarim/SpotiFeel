import core
from app import app


def test_now_playing_refresh_bypasses_the_short_cache(monkeypatch):
    calls = []

    def fake_playback(force=False):
        calls.append(force)
        return {"playing": False}, 204

    monkeypatch.setattr(core, "get_current_playback_payload", fake_playback)
    app.config.update(TESTING=True)
    response = app.test_client().get("/api/now-playing?refresh=1")

    assert response.status_code == 200
    assert response.get_json() == {"playing": False}
    assert calls == [True]
