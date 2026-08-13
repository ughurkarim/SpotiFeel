import requests

from services import lyrics as lyrics_service


class FakeResponse:
    def __init__(self, status_code, payload):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


class FakeHttp:
    def __init__(self, responses):
        self.responses = iter(responses)
        self.calls = []

    def get(self, url, **kwargs):
        self.calls.append((url, kwargs))
        response = next(self.responses)
        if isinstance(response, Exception):
            raise response
        return response


def setup_function():
    lyrics_service._CACHE.clear()


def test_prefers_synced_lrclib_lyrics_and_identifies_client():
    http = FakeHttp([
        FakeResponse(200, {
            "plainLyrics": "First line\nSecond line",
            "syncedLyrics": "[00:10.00] First line\n[00:14.50] Second line",
        })
    ])

    result = lyrics_service.get_lyrics(
        http, "track-1", "Artist", "Song", ["Song"], duration_ms=205_000, album_name="Album"
    )

    assert result["timing"] == "synced"
    assert result["synced_lyrics"].startswith("[00:10.00]")
    url, options = http.calls[0]
    assert url == "https://lrclib.net/api/get"
    assert options["params"]["duration"] == 205
    assert options["headers"]["Lrclib-Client"].startswith("SpotiFeel/")


def test_falls_back_to_existing_unsynced_provider():
    http = FakeHttp([
        FakeResponse(404, {}),
        FakeResponse(200, {"lyrics": "One line\nAnother line"}),
    ])

    result = lyrics_service.get_lyrics(http, "track-2", "Artist", "Song", ["Song"])

    assert result["timing"] == "unsynced"
    assert result["synced_lyrics"] == ""
    assert http.calls[1][0].startswith("https://api.lyrics.ovh/v1/")


def test_lrclib_network_failure_does_not_break_plain_lyrics():
    http = FakeHttp([
        requests.ConnectionError("offline"),
        FakeResponse(200, {"lyrics": "Still available"}),
    ])

    result = lyrics_service.get_lyrics(http, "track-3", "Artist", "Song", ["Song"])

    assert result["lyrics"] == "Still available"
    assert result["source"] == "lyrics.ovh"
