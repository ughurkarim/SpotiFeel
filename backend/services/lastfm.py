from services.cache import TTLCache
from services.spotify import safe_json


_TAG_CACHE = TTLCache(ttl=60 * 60 * 6, max_items=1000)


def get_track_tags(http, api_key, track_id, artist, title):
    if not api_key:
        return []
    cache_key = track_id or f"{artist.lower()}::{title.lower()}"
    cached = _TAG_CACHE.get(cache_key)
    if cached is not None:
        return cached
    response = http.get(
        "https://ws.audioscrobbler.com/2.0/",
        params={"method": "track.getInfo", "api_key": api_key, "artist": artist, "track": title, "format": "json"},
    )
    tags = (safe_json(response) or {}).get("track", {}).get("toptags", {}).get("tag", []) if response.status_code == 200 else []
    if response.status_code == 200:
        _TAG_CACHE.set(cache_key, tags)
    return tags
