import core
from app import app


class FakeResponse:
    def __init__(self, payload=None, status_code=200, *, content=b"", content_type="application/json", url=""):
        self._payload = payload
        self.status_code = status_code
        self.content = content
        self.headers = {"Content-Type": content_type}
        self.url = url

    def json(self):
        return self._payload


def test_recently_played_paginates_and_filters_to_client_day(monkeypatch):
    monkeypatch.setattr(core, "ensure_token", lambda *args, **kwargs: True)
    monkeypatch.setattr(core, "spotify_headers", lambda *args, **kwargs: {"Authorization": "Bearer test"})
    calls = []
    pages = [
        FakeResponse({
            "items": [
                {"played_at": "2026-08-20T18:00:00Z", "track": {"id": "late"}},
                {"played_at": "2026-08-20T17:00:00Z", "track": {"id": "middle"}},
            ],
            "cursors": {"before": "page-two"},
        }),
        FakeResponse({
            "items": [
                {"played_at": "2026-08-20T01:00:00Z", "track": {"id": "early"}},
                {"played_at": "2026-08-19T23:59:00Z", "track": {"id": "yesterday"}},
            ],
            "cursors": {"before": "page-three"},
        }),
    ]

    def fake_get(_url, **kwargs):
        calls.append(kwargs["params"])
        return pages.pop(0)

    monkeypatch.setattr(core, "http_get", fake_get)
    after = 1787184000000  # 2026-08-20T00:00:00Z
    response = app.test_client().get(f"/api/recently-played?limit=50&after={after}")

    assert response.status_code == 200
    assert [item["track"]["id"] for item in response.get_json()["items"]] == ["late", "middle", "early"]
    assert calls == [{"limit": 50}, {"limit": 50, "before": "page-two"}]


def test_wrapped_artwork_proxy_rejects_untrusted_hosts(monkeypatch):
    monkeypatch.setattr(core, "ensure_token", lambda *args, **kwargs: True)
    response = app.test_client().get("/api/wrapped/artwork?url=http://127.0.0.1/private")
    assert response.status_code == 400
    assert response.get_json()["error"] == "invalid_artwork_url"


def test_wrapped_artwork_proxy_returns_allowlisted_images(monkeypatch):
    monkeypatch.setattr(core, "ensure_token", lambda *args, **kwargs: True)
    artwork_url = "https://i.scdn.co/image/example"
    monkeypatch.setattr(
        core,
        "http_get",
        lambda _url: FakeResponse(
            status_code=200,
            content=b"jpeg-data",
            content_type="image/jpeg",
            url=artwork_url,
        ),
    )
    response = app.test_client().get(f"/api/wrapped/artwork?url={artwork_url}")
    assert response.status_code == 200
    assert response.content_type == "image/jpeg"
    assert response.data == b"jpeg-data"
