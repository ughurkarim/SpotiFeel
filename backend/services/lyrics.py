from urllib.parse import quote, quote_plus

import requests

from services.cache import TTLCache
from services.spotify import safe_json


_CACHE = TTLCache(ttl=60 * 60 * 12, max_items=1000)


def get_lyrics(http, track_id, artist, title, candidate_titles, duration_ms=0, album_name=""):
    cache_key = track_id or f"{artist.lower()}::{title.lower()}"
    cached = _CACHE.get(cache_key)
    if cached is not None:
        return cached
    search_urls = {
        "genius": f"https://genius.com/search?q={quote_plus(f'{artist} {title}')}",
        "search": f"https://www.google.com/search?q={quote_plus(f'{artist} {title} lyrics')}",
    }

    # LRCLIB is a public, machine-oriented lyrics service that can return
    # authoritative line-level LRC timestamps. Identify this client as required
    # by the provider and fall back cleanly when no exact metadata match exists.
    try:
        synced_response = http.get(
            "https://lrclib.net/api/get",
            params={
                "artist_name": artist,
                "track_name": title,
                "album_name": album_name or "",
                "duration": max(1, round((duration_ms or 0) / 1000)),
            },
            headers={"Lrclib-Client": "SpotiFeel/1.0 (local Spotify listening companion)"},
        )
        synced_payload = safe_json(synced_response) or {}
        synced_lyrics = (synced_payload.get("syncedLyrics") or "").strip()
        plain_lyrics = (synced_payload.get("plainLyrics") or "").strip()
        if synced_response.status_code == 200 and (synced_lyrics or plain_lyrics):
            result = {
                "track_id": track_id,
                "track": title,
                "artist": artist,
                "lyrics": plain_lyrics or synced_lyrics,
                "synced_lyrics": synced_lyrics,
                "timing": "synced" if synced_lyrics else "unsynced",
                "source": "lrclib",
                "search_urls": search_urls,
            }
            _CACHE.set(cache_key, result)
            return result
    except requests.RequestException:
        pass

    for candidate in candidate_titles:
        if not candidate:
            continue
        try:
            response = http.get(f"https://api.lyrics.ovh/v1/{quote(artist, safe='')}/{quote(candidate, safe='')}")
        except requests.RequestException:
            continue
        lyrics = ((safe_json(response) or {}).get("lyrics") or "").strip() if response.status_code == 200 else ""
        if lyrics:
            result = {
                "track_id": track_id,
                "track": title,
                "artist": artist,
                "lyrics": lyrics,
                "synced_lyrics": "",
                "timing": "unsynced",
                "source": "lyrics.ovh",
                "search_urls": search_urls,
            }
            _CACHE.set(cache_key, result)
            return result
    result = {"error": "lyrics_not_found", "track_id": track_id, "track": title, "artist": artist, "search_urls": search_urls}
    return result
