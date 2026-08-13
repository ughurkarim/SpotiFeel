from urllib.parse import quote_plus

from services.cache import TTLCache
from services.spotify import safe_json


_CACHE = TTLCache(ttl=60 * 60 * 12, max_items=1000)


def get_video_link(http, track_id, artist, title, api_key=None):
    cache_key = track_id or f"{artist.lower()}::{title.lower()}"
    cached = _CACHE.get(cache_key)
    if cached is not None:
        return cached
    query = f"{artist} {title}"
    result = None
    if api_key:
        response = http.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={"part": "snippet", "q": query, "key": api_key, "maxResults": 1, "type": "video"},
        )
        payload = safe_json(response) or {}
        if response.status_code == 200 and payload.get("items"):
            result = {"youtube_url": f"https://www.youtube.com/watch?v={payload['items'][0]['id']['videoId']}"}
    if result is None:
        result = {"youtube_search_url": f"https://www.youtube.com/results?search_query={quote_plus(query)}"}
    _CACHE.set(cache_key, result)
    return result
