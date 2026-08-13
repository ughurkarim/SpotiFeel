import os, re, time, base64, hashlib, requests
from collections import Counter
from pathlib import Path
from flask import Flask, request, session, jsonify, send_from_directory
from dotenv import load_dotenv
from security import configure_security
from services.cache import TTLCache
from services.spotify import APIClient, safe_json as decode_json
from services.lastfm import get_track_tags
from services.lyrics import get_lyrics
from services.youtube import get_video_link

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env")
load_dotenv(BASE_DIR / ".env", override=True)

app = Flask(__name__)
CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI")
REQUEST_TIMEOUT = 10
CURRENT_PLAYBACK_TTL = 4
USER_TASTE_TTL = 180
WRAPPED_REPORT_TTL = 300
AUDIO_FEATURE_FIELDS = ("energy", "tempo", "loudness", "valence", "danceability")
DEBUG_MODE = os.getenv("FLASK_DEBUG", "").strip().lower() in {"1", "true", "yes", "on"}
configure_security(app, BASE_DIR, REDIRECT_URI)


@app.errorhandler(requests.RequestException)
def handle_provider_request_error(error):
    app.logger.warning("Third-party request failed: %s", type(error).__name__, exc_info=True)
    if request.path.startswith("/api/"):
        return jsonify({"error": "provider_unavailable", "message": "A music service is temporarily unavailable."}), 502
    return "A music service is temporarily unavailable.", 502

SCOPES = (
    "user-read-currently-playing "
    "user-read-playback-state "
    "user-modify-playback-state "
    "playlist-modify-private "
    "playlist-modify-public "
    "user-read-recently-played "
    "user-library-read "
    "user-top-read"
)

TOKEN_URL = "https://accounts.spotify.com/api/token"
AUTH_URL = "https://accounts.spotify.com/authorize"
LASTFM_API_KEY = os.getenv("LASTFM_API_KEY")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
CURRENT_PLAYBACK_CACHE = {}
USER_TASTE_CACHE = {}
WRAPPED_REPORT_CACHE = {}
HTTP = APIClient(timeout=REQUEST_TIMEOUT)
AUDIO_FEATURE_CACHE = TTLCache(ttl=60 * 60 * 12, max_items=2000)
GENRE_SEED_CACHE = TTLCache(ttl=60 * 60 * 24, max_items=2)

WRAPPED_TIME_RANGES = {
    "short_term": {
        "label": "Last 4 Weeks",
        "slug": "4-weeks",
        "summary_label": "four-week",
        "spotify_value": "short_term",
    },
    "medium_term": {
        "label": "Last 6 Months",
        "slug": "6-months",
        "summary_label": "six-month",
        "spotify_value": "medium_term",
    },
    "long_term": {
        "label": "All Time",
        "slug": "all-time",
        "summary_label": "all-time",
        "spotify_value": "long_term",
    },
}

def spotify_configured():
    return bool(CLIENT_ID and CLIENT_SECRET and REDIRECT_URI)

def auth_header():
    auth_str = f"{CLIENT_ID}:{CLIENT_SECRET}".encode("utf-8")
    return {"Authorization": "Basic " + base64.b64encode(auth_str).decode("utf-8")}

def http_get(url, **kwargs):
    return HTTP.get(url, **kwargs)

def http_post(url, **kwargs):
    return HTTP.post(url, **kwargs)

def http_put(url, **kwargs):
    return HTTP.put(url, **kwargs)

def safe_json(response):
    return decode_json(response)


def session_cache_key():
    seed = getattr(session, "sid", None) or request.remote_addr or "anonymous"
    return hashlib.sha1(seed.encode("utf-8")).hexdigest()

def prune_cache(store, ttl):
    cutoff = time.time() - ttl * 4
    stale_keys = [key for key, value in store.items() if value.get("ts", 0) < cutoff]
    for key in stale_keys:
        store.pop(key, None)

def spotify_headers(json_body=False):
    headers = {"Authorization": f"Bearer {session['access_token']}"}
    if json_body:
        headers["Content-Type"] = "application/json"
    return headers


def chunked(values, size):
    for index in range(0, len(values), size):
        yield values[index:index + size]

def ensure_token(force_refresh=False):
    if "access_token" not in session:
        return False
    now = time.time()
    exp = session.get("expires_at", 0)
    if not force_refresh and now < exp - 30:
        return True
    refresh_token = session.get("refresh_token")
    if not refresh_token:
        return False
    if not spotify_configured():
        return False
    data = {"grant_type": "refresh_token", "refresh_token": refresh_token}
    try:
        r = http_post(TOKEN_URL, headers=auth_header(), data=data)
    except requests.RequestException:
        app.logger.exception("Spotify token refresh request failed")
        return False
    if r.status_code != 200:
        app.logger.warning("Spotify token refresh failed with status %s", r.status_code)
        return False
    payload = safe_json(r) or {}
    if not payload.get("access_token"):
        app.logger.warning("Spotify token refresh returned no access token")
        return False
    session["access_token"] = payload["access_token"]
    session["expires_at"] = now + int(payload.get("expires_in", 3600))
    if "refresh_token" in payload:
        session["refresh_token"] = payload["refresh_token"]
    if "scope" in payload:
        session["scopes"] = payload["scope"]
    return True

def _normalize_tag_to_seed(tag: str) -> str:
    t = tag.lower().strip()
    mapping = {
        "hip hop": "hip-hop",
        "hiphop": "hip-hop",
        "r&b": "r-n-b",
        "rnb": "r-n-b",
        "synth pop": "synth-pop",
        "synthpop": "synth-pop",
        "alt rock": "alternative",
        "alternative rock": "alternative",
        "indie rock": "indie",
        "indie-pop": "indie-pop",
        "indie pop": "indie-pop",
        "electro pop": "electropop",
        "electro-pop": "electropop",
        "d n b": "drum-and-bass",
        "dnb": "drum-and-bass",
        "drum n bass": "drum-and-bass",
        "drum & bass": "drum-and-bass",
    }
    return mapping.get(t, t)

def extract_genre_from_tags(tags, allowed_genres=None):
    sorted_tags = sorted(tags, key=lambda x: int(x.get("count", 0)), reverse=True)
    for tag in sorted_tags:
        name = tag.get("name", "")
        if not name:
            continue
        candidate = _normalize_tag_to_seed(name)
        if allowed_genres and candidate in allowed_genres:
            return candidate
        return candidate
    return "pop"

def normalize_for_lastfm(tag: str) -> str:
    mapping = {
        "hip-hop": "hip hop",
        "r-n-b": "rnb",
        "indie-pop": "indie pop",
        "electropop": "electro pop",
        "2000s": "00s",
        "2010s": "10s",
        "2020s": "20s",
        "1980s": "80s",
        "1990s": "90s",
        "1970s": "70s",
        "1960s": "60s",
        "60s": "60s",
        "70s": "70s",
        "80s": "80s",
        "90s": "90s",
    }
    return mapping.get(tag, tag)

def clean_track_title_for_lyrics(title: str) -> str:
    cleaned = (title or "").strip()
    patterns = [
        r"\s*-\s*(live|acoustic|remaster(ed)?|mono|stereo|radio edit|deluxe.*)$",
        r"\s*\((feat\.|ft\.|from .*|live.*|acoustic.*|remaster(ed)?.*|mono.*|stereo.*|radio edit.*)\)",
        r"\s*\[(feat\.|ft\.|live.*|acoustic.*|remaster(ed)?.*)\]",
    ]
    for pattern in patterns:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
    return re.sub(r"\s{2,}", " ", cleaned).strip()

def get_current_playback_payload(force=False):
    if not ensure_token(force_refresh=True):
        return {"error": "not_authenticated"}, 401

    cache_key = session_cache_key()
    now = time.time()
    if not force:
        cached = CURRENT_PLAYBACK_CACHE.get(cache_key)
        if cached and now - cached.get("ts", 0) < CURRENT_PLAYBACK_TTL:
            return cached["payload"], cached["status"]

    response = http_get("https://api.spotify.com/v1/me/player/currently-playing", headers=spotify_headers())
    if response.status_code == 204:
        payload = {"playing": False}
    else:
        payload = safe_json(response)
        if payload is None:
            app.logger.warning("Spotify now-playing returned invalid JSON with status %s", response.status_code)
            payload = {"error": "playback_unavailable", "message": "Spotify playback is temporarily unavailable."}

    if response.status_code in (200, 204):
        CURRENT_PLAYBACK_CACHE[cache_key] = {
            "ts": now,
            "status": response.status_code,
            "payload": payload,
        }
        prune_cache(CURRENT_PLAYBACK_CACHE, CURRENT_PLAYBACK_TTL)
    elif response.status_code == 401:
        CURRENT_PLAYBACK_CACHE.pop(cache_key, None)

    return payload, response.status_code

def get_current_track_item(force=False):
    payload, status = get_current_playback_payload(force=force)
    if status != 200 or not isinstance(payload, dict) or "item" not in payload:
        return None, payload, status
    return payload["item"], payload, status

def fetch_available_genre_seeds(headers):
    cached = GENRE_SEED_CACHE.get("spotify")
    if cached is not None:
        return cached
    response = http_get("https://api.spotify.com/v1/recommendations/available-genre-seeds", headers=headers)
    payload = safe_json(response) or {}
    genres = payload.get("genres", []) if response.status_code == 200 else []
    if genres:
        GENRE_SEED_CACHE.set("spotify", genres)
    return genres

def fetch_audio_features(headers, track_ids):
    features = {}
    clean_ids = [track_id for track_id in dict.fromkeys(track_ids) if track_id]
    missing_ids = []
    for track_id in clean_ids:
        cached = AUDIO_FEATURE_CACHE.get(track_id)
        if cached is None:
            missing_ids.append(track_id)
        else:
            features[track_id] = cached
    for chunk in chunked(missing_ids, 100):
        response = http_get(
            "https://api.spotify.com/v1/audio-features",
            headers=headers,
            params={"ids": ",".join(chunk)},
        )
        payload = safe_json(response) or {}
        if response.status_code != 200:
            continue
        for item in payload.get("audio_features") or []:
            if not item or not item.get("id"):
                continue
            profile = {field: item.get(field) for field in AUDIO_FEATURE_FIELDS}
            features[item["id"]] = profile
            AUDIO_FEATURE_CACHE.set(item["id"], profile)
    return features

def average_audio_profile(profiles):
    valid_profiles = [profile for profile in profiles if isinstance(profile, dict)]
    if not valid_profiles:
        return None

    averaged = {}
    for field in AUDIO_FEATURE_FIELDS:
        values = [profile.get(field) for profile in valid_profiles if profile.get(field) is not None]
        if not values:
            continue
        averaged[field] = sum(values) / len(values)
    return averaged or None


def pick_seed_genres(top_artist_genres, allowed_genres):
    picks = []
    for genre, _count in top_artist_genres:
        seed = normalize_genre_seed(genre, allowed_genres)
        if seed and seed not in picks:
            picks.append(seed)
        if len(picks) >= 6:
            break
    if not picks and allowed_genres:
        picks.append("pop" if "pop" in allowed_genres else allowed_genres[0])
    return picks

def describe_energy(value):
    if value is None:
        return "Adaptive"
    if value < 0.32:
        return "Low"
    if value < 0.58:
        return "Medium"
    if value < 0.78:
        return "High"
    return "Intense"

def describe_mood(value):
    if value is None:
        return "Balanced"
    if value < 0.34:
        return "Dark"
    if value < 0.6:
        return "Balanced"
    return "Bright"

def describe_danceability(value):
    if value is None:
        return "Adaptive"
    if value < 0.32:
        return "Low"
    if value < 0.6:
        return "Medium"
    if value < 0.78:
        return "High"
    return "Locked In"

def describe_tempo(value):
    if value is None:
        return "Steady"
    if value < 86:
        return "Slow"
    if value < 116:
        return "Midtempo"
    if value < 138:
        return "Fast"
    return "Sprint"

def build_mood_dna(profile):
    if not profile:
        return []
    return [
        {
            "key": "energy",
            "label": "Energy",
            "value": describe_energy(profile.get("energy")),
            "detail": f"{int(round((profile.get('energy') or 0) * 100))}%",
        },
        {
            "key": "mood",
            "label": "Mood",
            "value": describe_mood(profile.get("valence")),
            "detail": f"{int(round((profile.get('valence') or 0) * 100))}%",
        },
        {
            "key": "danceability",
            "label": "Danceability",
            "value": describe_danceability(profile.get("danceability")),
            "detail": f"{int(round((profile.get('danceability') or 0) * 100))}%",
        },
        {
            "key": "tempo",
            "label": "Tempo",
            "value": describe_tempo(profile.get("tempo")),
            "detail": f"{int(round(profile.get('tempo') or 0))} BPM",
        },
    ]


def spotify_image_url(images, preferred_index=0):
    if not isinstance(images, list) or not images:
        return ""
    image = images[min(preferred_index, len(images) - 1)] or {}
    return image.get("url", "")

def serialize_artist(artist):
    artist = artist or {}
    followers = artist.get("followers") or {}
    return {
        "id": artist.get("id"),
        "name": artist.get("name") or "Unknown artist",
        "genres": artist.get("genres") or [],
        "image_url": spotify_image_url(artist.get("images") or []),
        "spotify_url": (artist.get("external_urls") or {}).get("spotify", ""),
        "followers": followers.get("total"),
        "popularity": artist.get("popularity"),
    }

def serialize_track(track):
    track = track or {}
    album = track.get("album") or {}
    artists = [
        {"id": artist.get("id"), "name": artist.get("name") or "Unknown artist"}
        for artist in track.get("artists") or []
        if isinstance(artist, dict)
    ]
    images = album.get("images") or []
    return {
        "id": track.get("id"),
        "uri": track.get("uri"),
        "name": track.get("name") or "Unknown track",
        "artists": artists,
        "album": {
            "id": album.get("id"),
            "name": album.get("name") or "",
            "images": images,
            "release_date": album.get("release_date") or "",
        },
        "image_url": spotify_image_url(images),
        "duration_ms": track.get("duration_ms"),
        "explicit": track.get("explicit"),
        "popularity": track.get("popularity"),
        "release_year": release_year(track),
        "external_urls": {
            "spotify": (track.get("external_urls") or {}).get("spotify", ""),
        },
    }

def artist_names(track):
    return [artist.get("name") for artist in (track or {}).get("artists") or [] if artist.get("name")]

def build_top_genres(top_artists):
    genre_counts = Counter()
    for artist in top_artists:
        for genre in artist.get("genres") or []:
            normalized = normalize_genre_seed(genre) or (genre or "").lower().strip()
            if normalized:
                genre_counts[normalized] += 1
    return [
        {
            "name": genre,
            "count": count,
        }
        for genre, count in genre_counts.most_common(12)
    ]

def infer_wrapped_audio_profile(top_genres):
    haystack = " ".join([genre.get("name", "") for genre in top_genres]).lower()
    profile = {
        "energy": 0.54,
        "tempo": 112,
        "loudness": -8,
        "valence": 0.5,
        "danceability": 0.58,
    }

    if any(term in haystack for term in ("ambient", "classical", "piano", "study", "focus")):
        profile.update({"energy": 0.26, "tempo": 82, "loudness": -12.8, "valence": 0.4, "danceability": 0.24})
    elif any(term in haystack for term in ("jazz", "soul", "r-n-b", "r&b")):
        profile.update({"energy": 0.44, "tempo": 96, "loudness": -9.8, "valence": 0.52, "danceability": 0.5})
    elif any(term in haystack for term in ("indie", "folk", "acoustic", "chill")):
        profile.update({"energy": 0.38, "tempo": 92, "loudness": -10.4, "valence": 0.46, "danceability": 0.4})
    elif any(term in haystack for term in ("hip", "rap", "trap")):
        profile.update({"energy": 0.76, "tempo": 136, "loudness": -6.2, "valence": 0.58, "danceability": 0.78})
    elif any(term in haystack for term in ("edm", "dance", "house", "techno", "party")):
        profile.update({"energy": 0.9, "tempo": 128, "loudness": -5, "valence": 0.72, "danceability": 0.84})
    elif any(term in haystack for term in ("rock", "metal", "punk")):
        profile.update({"energy": 0.82, "tempo": 122, "loudness": -5.8, "valence": 0.48, "danceability": 0.46})
    elif any(term in haystack for term in ("country", "americana")):
        profile.update({"energy": 0.52, "tempo": 104, "loudness": -8.5, "valence": 0.56, "danceability": 0.48})
    return profile

def build_replayed_tracks(recent_items, limit=5):
    track_counts = Counter()
    track_lookup = {}
    for item in recent_items:
        track = (item or {}).get("track") or {}
        key = track.get("id") or track.get("uri")
        if not key:
            names = " ".join([track.get("name", ""), *artist_names(track)]).strip()
            key = names.lower()
        if not key:
            continue
        track_counts[key] += 1
        track_lookup[key] = track

    replayed = []
    for key, count in track_counts.most_common(limit):
        if count < 2 and replayed:
            continue
        replayed.append({
            "track": serialize_track(track_lookup[key]),
            "play_count": count,
        })
    return replayed



def build_wrapped_summary(time_meta, top_artists, top_tracks, top_genres, audio_profile):
    lead_artist = (top_artists[0].get("name") if top_artists else "your top artists")
    lead_track = (top_tracks[0].get("name") if top_tracks else "your top songs")
    lead_genre = (top_genres[0]["name"] if top_genres else "a mixed palette")
    energy_label = describe_energy((audio_profile or {}).get("energy")).lower()
    mood_label = describe_mood((audio_profile or {}).get("valence")).lower()
    tempo_label = describe_tempo((audio_profile or {}).get("tempo")).lower()
    return (
        f"Your {time_meta['summary_label']} listening is led by {lead_artist}, anchored in "
        f"{lead_genre}, and runs {energy_label} with a {tempo_label} pace and {mood_label} mood. "
        f"{lead_track} sits at the center of this report."
    )

def build_wrapped_report(headers, time_range):
    time_meta = WRAPPED_TIME_RANGES.get(time_range, WRAPPED_TIME_RANGES["short_term"])
    spotify_range = time_meta["spotify_value"]

    user_res = http_get("https://api.spotify.com/v1/me", headers=headers)
    user_payload = safe_json(user_res) or {}
    display_name = user_payload.get("display_name") or user_payload.get("id") or "Your"

    top_tracks_res = http_get(
        "https://api.spotify.com/v1/me/top/tracks",
        headers=headers,
        params={"limit": 20, "time_range": spotify_range},
    )
    if top_tracks_res.status_code != 200:
        app.logger.warning("Spotify top tracks failed with status %s", top_tracks_res.status_code)
        return {"error": "wrapped_unavailable", "message": "Spotify listening data is temporarily unavailable."}, 502

    top_artists_res = http_get(
        "https://api.spotify.com/v1/me/top/artists",
        headers=headers,
        params={"limit": 20, "time_range": spotify_range},
    )
    if top_artists_res.status_code != 200:
        app.logger.warning("Spotify top artists failed with status %s", top_artists_res.status_code)
        return {"error": "wrapped_unavailable", "message": "Spotify listening data is temporarily unavailable."}, 502

    recent_res = http_get(
        "https://api.spotify.com/v1/me/player/recently-played",
        headers=headers,
        params={"limit": 50},
    )

    top_tracks = (safe_json(top_tracks_res) or {}).get("items", [])
    top_artists = (safe_json(top_artists_res) or {}).get("items", [])
    recent_items = (safe_json(recent_res) or {}).get("items", []) if recent_res.status_code == 200 else []
    top_genres = build_top_genres(top_artists)

    track_ids = [track.get("id") for track in top_tracks if track.get("id")]
    track_features = fetch_audio_features(headers, track_ids[:20])
    audio_profile = average_audio_profile([track_features.get(track_id) for track_id in track_ids])
    mood_source = "spotify_audio_features" if audio_profile else "genre_signals"
    if not audio_profile:
        audio_profile = infer_wrapped_audio_profile(top_genres)

    discovery = build_discovery_score(top_tracks, top_genres)
    personality = build_listening_personality(top_genres, discovery, audio_profile)
    summary = build_wrapped_summary(time_meta, top_artists, top_tracks, top_genres, audio_profile)
    replayed_tracks = build_replayed_tracks(recent_items)

    lead_artist = serialize_artist(top_artists[0]) if top_artists else None
    lead_track = serialize_track(top_tracks[0]) if top_tracks else None
    lead_genre = top_genres[0] if top_genres else {"name": "mixed", "count": 0}
    share_text = (
        f"{display_name}'s SpotiFeel {time_meta['label']}: {personality['title']}. "
        f"Top artist: {lead_artist['name'] if lead_artist else 'n/a'}. "
        f"Top song: {lead_track['name'] if lead_track else 'n/a'}. "
        f"Top genre: {lead_genre['name']}. Discovery score: {discovery['score']}%."
    )

    return {
        "generated_at": int(time.time()),
        "time_range": time_meta,
        "user": {
            "display_name": display_name,
            "image_url": spotify_image_url(user_payload.get("images") or []),
            "spotify_url": (user_payload.get("external_urls") or {}).get("spotify", ""),
        },
        "top_artists": [serialize_artist(artist) for artist in top_artists[:10]],
        "top_tracks": [serialize_track(track) for track in top_tracks[:10]],
        "top_genres": top_genres,
        "mood_profile": {
            "source": mood_source,
            "audio_profile": audio_profile,
            "dna": build_mood_dna(audio_profile),
        },
        "listening_personality": personality,
        "taste_summary": summary,
        "most_replayed_tracks": replayed_tracks,
        "discovery_score": discovery,
        "share_card": {
            "headline": f"{display_name}'s {time_meta['label']} Wrapped",
            "kicker": "Spotify Wrapped Anytime",
            "top_artist": lead_artist,
            "top_track": lead_track,
            "top_genre": lead_genre,
            "personality": personality,
            "discovery_score": discovery,
            "summary": summary,
            "share_text": share_text,
        },
        "data_note": "Spotify top-items are affinity rankings for the selected range; All Time uses Spotify's long-term signal, not exact lifetime play count.",
    }, 200


def get_wrapped_report_for_session(headers, time_range, force=False):
    requested_range = resolve_wrapped_time_range(time_range)
    cache_key = f"{session_cache_key()}:{requested_range}"
    cached = WRAPPED_REPORT_CACHE.get(cache_key)
    now = time.time()
    if not force and cached and now - cached.get("ts", 0) < WRAPPED_REPORT_TTL:
        return cached["report"], 200

    report, status = build_wrapped_report(headers, requested_range)
    if status == 200:
        WRAPPED_REPORT_CACHE[cache_key] = {"ts": now, "report": report}
        prune_cache(WRAPPED_REPORT_CACHE, WRAPPED_REPORT_TTL)
    return report, status

def build_track_snapshot(item, audio_profile):
    if not item or not audio_profile:
        return None
    return {
        "track_id": item.get("id"),
        "track": item.get("name"),
        "artist": (item.get("artists") or [{}])[0].get("name", ""),
        "audio_profile": {field: audio_profile.get(field) for field in AUDIO_FEATURE_FIELDS},
    }

def summarize_track_arc(previous_snapshot, current_snapshot):
    if not previous_snapshot or not current_snapshot:
        return None

    previous_profile = previous_snapshot.get("audio_profile") or {}
    current_profile = current_snapshot.get("audio_profile") or {}
    energy_delta = (current_profile.get("energy") or 0) - (previous_profile.get("energy") or 0)
    valence_delta = (current_profile.get("valence") or 0) - (previous_profile.get("valence") or 0)
    tempo_delta = (current_profile.get("tempo") or 0) - (previous_profile.get("tempo") or 0)

    shifts = []
    if abs(energy_delta) >= 0.12:
        shifts.append("hits harder" if energy_delta > 0 else "eases back")
    if abs(valence_delta) >= 0.12:
        shifts.append("feels brighter" if valence_delta > 0 else "turns moodier")
    if abs(tempo_delta) >= 8:
        shifts.append("moves faster" if tempo_delta > 0 else "slows the pulse")

    if not shifts:
        detail = f"{current_snapshot['track']} keeps a similar mood to {previous_snapshot['track']}, just with a subtle shift in texture."
    else:
        detail = f"{current_snapshot['track']} {', '.join(shifts[:-1]) + (' and ' if len(shifts) > 1 else '') + shifts[-1]} compared with {previous_snapshot['track']}."

    return {
        "title": "Song-to-Song Arc",
        "kicker": f"From {previous_snapshot['track']} to {current_snapshot['track']}",
        "detail": detail,
    }

def update_track_arc(item, audio_profile):
    current_snapshot = build_track_snapshot(item, audio_profile)
    previous_snapshot = session.get("spotifeel_track_snapshot")
    current_arc = session.get("spotifeel_track_arc")

    if current_snapshot and previous_snapshot and previous_snapshot.get("track_id") != current_snapshot.get("track_id"):
        current_arc = summarize_track_arc(previous_snapshot, current_snapshot)
        session["spotifeel_track_arc"] = current_arc

    if current_snapshot:
        session["spotifeel_track_snapshot"] = current_snapshot

    return current_arc

def build_user_taste_profile(headers, allowed_genres=None, force=False):
    cache_key = session_cache_key()
    now = time.time()
    cached = USER_TASTE_CACHE.get(cache_key)
    if not force and cached and now - cached.get("ts", 0) < USER_TASTE_TTL:
        return cached["profile"]

    recent_res = http_get(
        "https://api.spotify.com/v1/me/player/recently-played",
        headers=headers,
        params={"limit": 50},
    )
    top_tracks_res = http_get(
        "https://api.spotify.com/v1/me/top/tracks",
        headers=headers,
        params={"limit": 40, "time_range": "short_term"},
    )
    top_artists_res = http_get(
        "https://api.spotify.com/v1/me/top/artists",
        headers=headers,
        params={"limit": 30, "time_range": "short_term"},
    )

    recent_items = (safe_json(recent_res) or {}).get("items", []) if recent_res.status_code == 200 else []
    recent_tracks = [item.get("track") for item in recent_items if item.get("track")]
    top_tracks = (safe_json(top_tracks_res) or {}).get("items", []) if top_tracks_res.status_code == 200 else []
    top_artists = (safe_json(top_artists_res) or {}).get("items", []) if top_artists_res.status_code == 200 else []

    track_pool = dedupe_tracks(top_tracks + recent_tracks)
    track_ids = [track.get("id") for track in track_pool if track.get("id")]
    track_features = fetch_audio_features(headers, track_ids)

    top_artist_genres = Counter()
    for artist in top_artists:
        for genre in artist.get("genres") or []:
            normalized = normalize_genre_seed(genre)
            if normalized:
                top_artist_genres[normalized] += 1

    profile = {
        "recent_tracks": recent_tracks,
        "recent_track_ids": [track.get("id") for track in recent_tracks if track.get("id")],
        "top_tracks": top_tracks,
        "top_track_ids": [track.get("id") for track in top_tracks if track.get("id")],
        "top_artists": top_artists,
        "top_artist_ids": [artist.get("id") for artist in top_artists if artist.get("id")],
        "top_artist_names": [artist.get("name") for artist in top_artists if artist.get("name")],
        "top_genres": top_artist_genres.most_common(),
        "seed_genres": pick_seed_genres(top_artist_genres.most_common(), allowed_genres or []),
        "known_track_ids": {track.get("id") for track in track_pool if track.get("id")},
        "known_artist_ids": {
            artist.get("id")
            for track in track_pool
            for artist in track.get("artists") or []
            if artist.get("id")
        } | {artist.get("id") for artist in top_artists if artist.get("id")},
        "track_features": track_features,
        "audio_profile": average_audio_profile([track_features.get(track_id) for track_id in track_ids]),
    }
    profile["summary"] = summarize_taste_profile(profile)

    USER_TASTE_CACHE[cache_key] = {"ts": now, "profile": profile}
    prune_cache(USER_TASTE_CACHE, USER_TASTE_TTL)
    return profile




def describe_recommendation_reason(group_id, candidate_profile, target_profile, known_artist=False):
    if group_id == "more-like-this":
        if score_audio_similarity(candidate_profile, target_profile) >= 2.2:
            return "Picked because it mirrors this song's energy and mood."
        return "Picked because it stays close to the current track's mood."
    if group_id == "same-mood-different-genre":
        if candidate_profile and target_profile and (candidate_profile.get("tempo") or 0) < (target_profile.get("tempo") or 0) - 8:
            return "Same mood, lower tempo."
        return "Picked because it keeps the mood while widening the palette."
    if group_id == "familiar-favorites":
        if known_artist:
            return "You've been listening to similar artists this week."
        return "Picked because it sits close to your repeat-listen zone."
    if group_id == "artist-top-tracks":
        return "Picked from the lead artist's catalog for its fit with your listening profile."
    if group_id == "still-fits-your-taste":
        if known_artist:
            return "Picked from an artist already established in your listening profile."
        return "Picked because its audio profile and genre sit close to your wider taste."
    return "Picked to widen the mood without losing your taste."

def describe_recommendation_reason_short(group_id, candidate_profile=None, target_profile=None, known_artist=False):
    if group_id == "more-like-this":
        if candidate_profile and target_profile:
            energy_delta = (candidate_profile.get("energy") or 0) - (target_profile.get("energy") or 0)
            valence_delta = (candidate_profile.get("valence") or 0) - (target_profile.get("valence") or 0)
            tempo_delta = (candidate_profile.get("tempo") or 0) - (target_profile.get("tempo") or 0)
            if abs(energy_delta) < 0.12 and abs(valence_delta) < 0.12:
                return "same mood"
            if energy_delta >= 0.12 or tempo_delta >= 10:
                return "higher energy"
            if energy_delta <= -0.12 or tempo_delta <= -10:
                return "slower burn"
            if valence_delta >= 0.12:
                return "warmer tone"
            if valence_delta <= -0.12:
                return "darker tone"
        return "close match"
    if group_id == "same-mood-different-genre":
        return "same mood"
    if group_id == "familiar-favorites":
        return "artist orbit" if known_artist else "taste match"
    if group_id == "deep-cuts":
        return "new discovery"
    if group_id == "artist-top-tracks":
        return "artist orbit"
    if group_id == "related-artists":
        return "same orbit"
    if group_id == "taste-fallback":
        return "taste match"
    if group_id == "still-fits-your-taste":
        return "artist orbit" if known_artist else "taste match"
    return "curated"

def fetch_artist_top_tracks(headers, artist_id, limit=6, market="US"):
    if not artist_id:
        return []
    response = http_get(
        f"https://api.spotify.com/v1/artists/{artist_id}/top-tracks",
        headers=headers,
        params={"market": market},
    )
    payload = safe_json(response) or {}
    tracks = dedupe_tracks(payload.get("tracks", []) if response.status_code == 200 else [])
    return tracks[:limit]

def fetch_related_artist_ids(headers, artist_id, limit=4):
    if not artist_id:
        return []
    response = http_get(
        f"https://api.spotify.com/v1/artists/{artist_id}/related-artists",
        headers=headers,
    )
    payload = safe_json(response) or {}
    artists = payload.get("artists", []) if response.status_code == 200 else []
    return [artist.get("id") for artist in artists if artist.get("id")][:limit]

def search_track_match(headers, track_name, artist_name, limit=5):
    cleaned_track = clean_track_title_for_lyrics(track_name)
    cleaned_artist = (artist_name or "").strip()
    queries = [
        f'track:"{cleaned_track}" artist:"{cleaned_artist}"' if cleaned_track and cleaned_artist else "",
        f"{cleaned_track} {cleaned_artist}".strip(),
        track_name or "",
    ]

    artist_haystack = cleaned_artist.lower()
    for query in [value for value in queries if value]:
        candidates = search_tracks(headers, query, limit=limit)
        if not candidates:
            continue
        for track in candidates:
            artist_names = [artist.get("name", "").lower() for artist in (track.get("artists") or [])]
            if artist_haystack and any(artist_haystack in name or name in artist_haystack for name in artist_names):
                return track
        return candidates[0]
    return None

def build_lastfm_recommendation_groups(headers, current_item, current_profile=None):
    if not LASTFM_API_KEY:
        return []

    track_name = clean_track_title_for_lyrics(current_item.get("name") or "")
    artist_name = ((current_item.get("artists") or [{}])[0].get("name") or "").strip()
    if not track_name or not artist_name:
        return []

    response = http_get(
        "https://ws.audioscrobbler.com/2.0/",
        params={
            "method": "track.getsimilar",
            "api_key": LASTFM_API_KEY,
            "artist": artist_name,
            "track": track_name,
            "autocorrect": 1,
            "limit": 24,
            "format": "json",
        },
    )
    payload = safe_json(response) or {}
    similar_tracks = ((payload.get("similartracks") or {}).get("track") or []) if response.status_code == 200 else []
    if not similar_tracks:
        return []

    seen_ids = {current_item.get("id")}
    resolved_tracks = []
    for candidate in similar_tracks:
        candidate_track_name = candidate.get("name") or ""
        candidate_artist = candidate.get("artist") or {}
        candidate_artist_name = candidate_artist.get("name") if isinstance(candidate_artist, dict) else candidate_artist
        if not candidate_track_name or not candidate_artist_name:
            continue
        match = search_track_match(headers, candidate_track_name, candidate_artist_name, limit=4)
        track_id = (match or {}).get("id")
        if not track_id or track_id in seen_ids:
            continue
        seen_ids.add(track_id)
        resolved_tracks.append(match)
        if len(resolved_tracks) >= 12:
            break

    if not resolved_tracks:
        return []

    track_features = fetch_audio_features(headers, [track.get("id") for track in resolved_tracks if track.get("id")])
    for track in resolved_tracks:
        candidate_profile = track_features.get(track.get("id"))
        track["spotifeel_reason"] = describe_recommendation_reason(
            "more-like-this",
            candidate_profile,
            current_profile,
        )
        track["spotifeel_reason_short"] = describe_recommendation_reason_short(
            "more-like-this",
            candidate_profile,
            current_profile,
        )

    return [
        {
            "id": "more-like-this",
            "title": "More like this",
            "kicker": f"Because you listened to {current_item.get('name', 'this track')}",
            "detail": f'Tracks curated because you listened to "{current_item.get("name", "this track")}".',
            "tracks": resolved_tracks[:12],
        }
    ]

def build_fallback_recommendation_groups(headers, current_item, taste_profile):
    current_track_id = current_item.get("id")
    current_artist_ids = track_artist_ids(current_item)
    current_artist_name = ((current_item.get("artists") or [{}])[0].get("name") or "this artist")
    top_artist_names = [name for name in (taste_profile.get("top_artist_names") or []) if name]
    seed_genres = taste_profile.get("seed_genres") or ["pop"]
    seen_ids = {current_track_id}
    groups = []

    def collect_unique(tracks, group_id, reason, known_artist=False):
        collected = []
        for track in dedupe_tracks(tracks):
            track_id = track.get("id")
            if not track_id or track_id in seen_ids:
                continue
            seen_ids.add(track_id)
            track["spotifeel_reason"] = reason
            track["spotifeel_reason_short"] = describe_recommendation_reason_short(
                group_id,
                known_artist=known_artist,
            )
            collected.append(track)
        return collected

    lead_artist_id = current_artist_ids[0] if current_artist_ids else None
    same_artist_tracks = collect_unique(
        fetch_artist_top_tracks(headers, lead_artist_id, limit=12),
        "artist-top-tracks",
        f"Popular among listeners staying with {current_artist_name}.",
        known_artist=True,
    )
    if same_artist_tracks:
        groups.append(
            {
                "id": "artist-top-tracks",
                "title": "More from this artist",
                "kicker": f"Starting with {current_artist_name}",
                "detail": "A fallback set built from the current artist's strongest Spotify matches.",
                "tracks": same_artist_tracks[:12],
            }
        )

    related_tracks = []
    for related_artist_id in fetch_related_artist_ids(headers, lead_artist_id, limit=4):
        related_tracks.extend(fetch_artist_top_tracks(headers, related_artist_id, limit=3))
        if len(related_tracks) >= 10:
            break
    related_tracks = collect_unique(
        related_tracks,
        "taste-fallback",
        "Picked from nearby artists and your broader listening profile.",
    )
    if related_tracks:
        groups.append(
            {
                "id": "still-fits-your-taste",
                "title": "Still fits your taste",
                "kicker": "Nearby artists from your listening profile",
                "detail": "Fallback picks from artists connected to your current and recent listening.",
                "tracks": related_tracks[:12],
            }
        )

    if len(groups) < 2:
        query_parts = []
        if current_artist_name:
            query_parts.append(current_artist_name)
        query_parts.extend(top_artist_names[:2])
        query_parts.extend(seed_genres[:2])
        discovery_tracks = collect_unique(
            search_tracks(headers, " ".join(query_parts), limit=12),
            "taste-fallback",
            "Picked from your top artists and the genre around this song.",
        )
        if discovery_tracks:
            groups.append(
                {
                    "id": "taste-fallback",
                    "title": "Still fits your taste",
                    "kicker": "Fallback from your recent listening",
                    "detail": "A broader search when Spotify's recommendation endpoint comes back sparse.",
                    "tracks": discovery_tracks[:12],
                }
            )

    return groups



def search_tracks(headers, query, limit=12):
    response = http_get(
        "https://api.spotify.com/v1/search",
        headers=headers,
        params={"q": query, "type": "track", "limit": limit},
    )
    payload = safe_json(response) or {}
    return dedupe_tracks((payload.get("tracks") or {}).get("items", []) if response.status_code == 200 else [])


def add_ranked_candidate_source(candidates, tracks, relevance=0.5, genre_match=False):
    """Add provenance without mutating provider or cached track dictionaries."""
    for track in tracks or []:
        if not isinstance(track, dict) or not track.get("id"):
            continue
        candidate = dict(track)
        candidate["spotifeel_source_relevance"] = max(
            float(candidate.get("spotifeel_source_relevance") or 0),
            float(relevance),
        )
        if genre_match:
            candidate["spotifeel_genre_match"] = 1.0
        candidates.append(candidate)


def genre_family_matches(selected_genre, artist_genres):
    selected = normalize_identity_text(selected_genre)
    haystack = " ".join(normalize_identity_text(value) for value in artist_genres or [])
    families = {
        "pop": ("pop",),
        "rock": ("rock", "grunge", "punk"),
        "hip hop": ("hip hop", "rap", "trap"),
        "indie pop": ("indie pop", "indiepop", "dream pop", "bedroom pop"),
        "jazz": ("jazz", "bebop", "swing"),
        "metal": ("metal",),
        "classical": ("classical", "orchestra", "baroque", "romantic era"),
        "edm": ("edm", "electronic", "house", "techno", "trance", "dance"),
    }
    terms = families.get(selected, (selected,))
    return bool(haystack and any(term in haystack for term in terms))


def validate_genre_candidate_sources(headers, candidates, selected_genre):
    artist_ids = [
        ((track.get("artists") or [{}])[0].get("id"))
        for track in candidates
        if ((track.get("artists") or [{}])[0].get("id"))
    ]
    genre_map = {}
    for ids in chunked(list(dict.fromkeys(artist_ids)), 50):
        response = http_get(
            "https://api.spotify.com/v1/artists",
            headers=headers,
            params={"ids": ",".join(ids)},
        )
        payload = safe_json(response) or {}
        if response.status_code != 200:
            continue
        for artist in payload.get("artists") or []:
            if artist and artist.get("id"):
                genre_map[artist["id"]] = artist.get("genres") or []
    if not genre_map:
        return candidates
    validated = []
    for track in candidates:
        artist_id = ((track.get("artists") or [{}])[0].get("id"))
        artist_genres = genre_map.get(artist_id)
        candidate = dict(track)
        if artist_genres:
            candidate["spotifeel_genre_match"] = 1.0 if genre_family_matches(selected_genre, artist_genres) else 0
        validated.append(candidate)
    return validated


def spotify_recommendation_candidates(
    headers,
    seed_tracks=None,
    seed_artists=None,
    seed_genres=None,
    targets=None,
    limit=50,
):
    seed_tracks = [value for value in dict.fromkeys(seed_tracks or []) if value][:2]
    seed_artists = [value for value in dict.fromkeys(seed_artists or []) if value][:2]
    seed_genres = [value for value in dict.fromkeys(seed_genres or []) if value][:2]
    while len(seed_tracks) + len(seed_artists) + len(seed_genres) > 5:
        if len(seed_genres) > 1:
            seed_genres.pop()
        elif len(seed_artists) > 1:
            seed_artists.pop()
        else:
            seed_tracks.pop()
    if not seed_tracks and not seed_artists and not seed_genres:
        return []
    params = {"limit": limit}
    if seed_tracks:
        params["seed_tracks"] = ",".join(seed_tracks)
    if seed_artists:
        params["seed_artists"] = ",".join(seed_artists)
    if seed_genres:
        params["seed_genres"] = ",".join(seed_genres)
    for field, value in (targets or {}).items():
        if value is not None:
            params[f"target_{field}"] = round(value, 3 if field != "tempo" else 1)
    response = http_get("https://api.spotify.com/v1/recommendations", headers=headers, params=params)
    payload = safe_json(response) or {}
    return payload.get("tracks") or [] if response.status_code == 200 else []


def fetch_lastfm_similar_candidates(headers, current_item, limit=16):
    if not LASTFM_API_KEY:
        return []
    track_name = clean_track_title_for_lyrics(current_item.get("name") or "")
    artist_name = ((current_item.get("artists") or [{}])[0].get("name") or "").strip()
    if not track_name or not artist_name:
        return []
    response = http_get(
        "https://ws.audioscrobbler.com/2.0/",
        params={
            "method": "track.getsimilar",
            "api_key": LASTFM_API_KEY,
            "artist": artist_name,
            "track": track_name,
            "autocorrect": 1,
            "limit": max(limit * 2, 24),
            "format": "json",
        },
    )
    payload = safe_json(response) or {}
    similar_tracks = ((payload.get("similartracks") or {}).get("track") or []) if response.status_code == 200 else []
    resolved = []
    for candidate in similar_tracks:
        candidate_artist = candidate.get("artist") or {}
        candidate_artist_name = candidate_artist.get("name") if isinstance(candidate_artist, dict) else candidate_artist
        match = search_track_match(headers, candidate.get("name") or "", candidate_artist_name or "", limit=5)
        if match:
            resolved.append(match)
        if len(dedupe_tracks(resolved)) >= limit:
            break
    return dedupe_tracks(resolved)[:limit]


def select_recommendation_group(
    candidates,
    headers,
    group_id,
    target_profile,
    taste_profile,
    excluded_keys,
    limit=12,
    artist_cap=2,
):
    candidates = dedupe_tracks(candidates)
    features = fetch_audio_features(headers, [track.get("id") for track in candidates if track.get("id")])
    current_artist_ids = set(taste_profile.get("current_artist_ids") or [])
    ranked = []
    for candidate in candidates:
        keys = track_identity_keys(candidate)
        if not keys or any(key in excluded_keys for key in keys):
            continue
        candidate_id = candidate.get("id")
        candidate_profile = features.get(candidate_id)
        artist_ids = track_artist_ids(candidate)
        known_artist = any(artist_id in taste_profile.get("known_artist_ids", set()) for artist_id in artist_ids)
        known_track = candidate_id in taste_profile.get("known_track_ids", set())
        relevance = clamp(float(candidate.get("spotifeel_source_relevance") or 0.5), 0, 1)
        popularity = (candidate.get("popularity") or 0) / 100
        score = score_audio_similarity(candidate_profile, target_profile)
        if group_id == "more-like-this":
            score = score * 1.8 + relevance * 1.2 + popularity * 0.12
            if current_artist_ids.intersection(artist_ids):
                score -= 0.18
        elif group_id == "artist-top-tracks":
            score = relevance + popularity * 0.75 + (0.22 if known_track else 0)
        else:
            score = score * 1.05 + relevance * 0.8
            score += 0.7 if known_artist else 0.34
            score += 0.28 if known_track else 0.2
            score += popularity * 0.18
        ranked.append((score, candidate, known_artist))

    ranked.sort(key=lambda item: item[0], reverse=True)
    selected = []
    artist_counts = Counter()
    for _score, candidate, known_artist in ranked:
        artist_key = ((candidate.get("artists") or [{}])[0].get("id") or (candidate.get("artists") or [{}])[0].get("name") or "")
        if artist_cap and artist_counts[artist_key] >= artist_cap:
            continue
        candidate_profile = features.get(candidate.get("id"))
        candidate["spotifeel_reason"] = describe_recommendation_reason(
            group_id,
            candidate_profile,
            target_profile,
            known_artist=known_artist,
        )
        candidate["spotifeel_reason_short"] = describe_recommendation_reason_short(
            group_id,
            candidate_profile,
            target_profile,
            known_artist=known_artist,
        )
        selected.append(candidate)
        artist_counts[artist_key] += 1
        excluded_keys.update(track_identity_keys(candidate))
        if len(selected) >= limit:
            break
    return selected


def build_recommendation_groups(headers, current_item, current_profile, taste_profile):
    """Build three deep, differentiated recommendation lanes."""
    current_track_id = current_item.get("id")
    current_artist_ids = track_artist_ids(current_item)
    lead_artist_id = current_artist_ids[0] if current_artist_ids else None
    lead_artist_name = ((current_item.get("artists") or [{}])[0].get("name") or "this artist")
    seed_genres = taste_profile.get("seed_genres") or ["pop"]
    taste_audio = taste_profile.get("audio_profile") or {}
    target_profile = current_profile or taste_audio
    excluded_keys = set(track_identity_keys(current_item))
    taste_context = dict(taste_profile)
    taste_context["current_artist_ids"] = current_artist_ids
    groups = []

    similar_candidates = []
    add_ranked_candidate_source(
        similar_candidates,
        spotify_recommendation_candidates(
            headers,
            seed_tracks=[current_track_id],
            seed_artists=current_artist_ids[:1],
            seed_genres=seed_genres[:1],
            targets=target_profile,
            limit=50,
        ),
        relevance=0.9,
    )
    add_ranked_candidate_source(similar_candidates, fetch_lastfm_similar_candidates(headers, current_item), relevance=1)
    for related_artist_id in fetch_related_artist_ids(headers, lead_artist_id, limit=5):
        add_ranked_candidate_source(similar_candidates, fetch_artist_top_tracks(headers, related_artist_id, limit=5), relevance=0.62)
    add_ranked_candidate_source(similar_candidates, fetch_artist_top_tracks(headers, lead_artist_id, limit=6), relevance=0.54)
    similar_tracks = select_recommendation_group(
        similar_candidates,
        headers,
        "more-like-this",
        target_profile,
        taste_context,
        excluded_keys,
        limit=12,
        artist_cap=2,
    )
    if similar_tracks:
        groups.append({
            "id": "more-like-this",
            "title": "More like this",
            "kicker": f"Because you listened to {current_item.get('name', 'this track')}",
            "detail": "The closest continuation of the current song's shape and momentum.",
            "tracks": similar_tracks,
        })

    artist_candidates = []
    add_ranked_candidate_source(artist_candidates, fetch_artist_top_tracks(headers, lead_artist_id, limit=12), relevance=1)
    add_ranked_candidate_source(artist_candidates, search_tracks(headers, f'artist:"{lead_artist_name}"', limit=50), relevance=0.82)
    normalized_lead_name = normalize_identity_text(lead_artist_name)
    artist_candidates = [
        track for track in artist_candidates
        if any(
            (lead_artist_id and artist.get("id") == lead_artist_id)
            or normalize_identity_text(artist.get("name")) == normalized_lead_name
            for artist in track.get("artists") or []
        )
    ]
    artist_tracks = select_recommendation_group(
        artist_candidates,
        headers,
        "artist-top-tracks",
        target_profile,
        taste_context,
        excluded_keys,
        limit=12,
        artist_cap=None,
    )
    if artist_tracks:
        groups.append({
            "id": "artist-top-tracks",
            "title": "More from this artist",
            "kicker": f"Stay with {lead_artist_name}",
            "detail": "A deeper route through the lead artist's catalog.",
            "tracks": artist_tracks,
        })

    taste_candidates = []
    add_ranked_candidate_source(
        taste_candidates,
        spotify_recommendation_candidates(
            headers,
            seed_tracks=(taste_profile.get("top_track_ids") or [])[:2],
            seed_artists=(taste_profile.get("top_artist_ids") or [])[:2],
            seed_genres=seed_genres[:1],
            targets=taste_audio or target_profile,
            limit=50,
        ),
        relevance=0.9,
    )
    add_ranked_candidate_source(
        taste_candidates,
        spotify_recommendation_candidates(
            headers,
            seed_tracks=[current_track_id],
            seed_genres=seed_genres[:2],
            targets=taste_audio or target_profile,
            limit=50,
        ),
        relevance=0.72,
    )
    add_ranked_candidate_source(taste_candidates, taste_profile.get("top_tracks", []), relevance=1)
    add_ranked_candidate_source(taste_candidates, taste_profile.get("recent_tracks", []), relevance=0.76)
    for artist_id in (taste_profile.get("top_artist_ids") or [])[:4]:
        for related_artist_id in fetch_related_artist_ids(headers, artist_id, limit=2):
            add_ranked_candidate_source(taste_candidates, fetch_artist_top_tracks(headers, related_artist_id, limit=4), relevance=0.65)
    for taste_genre in seed_genres[:3]:
        add_ranked_candidate_source(taste_candidates, search_tracks(headers, taste_genre, limit=24), relevance=0.48)
    taste_tracks = select_recommendation_group(
        taste_candidates,
        headers,
        "still-fits-your-taste",
        taste_audio or target_profile,
        taste_context,
        excluded_keys,
        limit=12,
        artist_cap=2,
    )
    if taste_tracks:
        groups.append({
            "id": "still-fits-your-taste",
            "title": "Still fits your taste",
            "kicker": "From your wider listening profile",
            "detail": "A broader taste match beyond the current song.",
            "tracks": taste_tracks,
        })
    return groups



# Route handlers below resolve these names at request time. Importing the pure
# domain implementations here keeps scoring and Wrapped classification testable
# without Flask or third-party API clients.
from recommendations.ranking import (
    clamp,
    decade_bounds as _decade_bounds,
    dedupe_tracks,
    normalize_genre as normalize_genre_seed,
    normalize_identity_text,
    normalize_playlist_options,
    release_year,
    score_audio_similarity,
    score_playlist_candidate,
    select_playlist_tracks,
    track_artist_ids,
    track_identity_keys,
)
from wrapped.personality import build_discovery_score, build_listening_personality
from wrapped.report import TIME_RANGES as WRAPPED_TIME_RANGES, resolve_time_range as resolve_wrapped_time_range
from recommendations.taste_profile import summarize_taste_profile

MOOD_KEYWORDS = {
    "workout": {
        "query": "workout",
        "energy": 0.88,
        "valence": 0.62,
        "danceability": 0.82,
        "tempo": 128,
        "genres": ["dance", "edm", "hip-hop"],
    },
    "late night drive": {
        "query": "late night drive",
        "energy": 0.48,
        "valence": 0.44,
        "danceability": 0.58,
        "tempo": 102,
        "genres": ["indie", "pop", "r-n-b"],
    },
    "study": {
        "query": "study",
        "energy": 0.28,
        "valence": 0.42,
        "danceability": 0.26,
        "tempo": 84,
        "genres": ["ambient", "classical", "indie"],
    },
    "focus": {
        "query": "focus",
        "energy": 0.34,
        "valence": 0.4,
        "danceability": 0.28,
        "tempo": 88,
        "genres": ["ambient", "classical", "jazz"],
    },
    "party": {
        "query": "party",
        "energy": 0.9,
        "valence": 0.72,
        "danceability": 0.86,
        "tempo": 126,
        "genres": ["dance", "edm", "pop"],
    },
    "chill": {
        "query": "chill",
        "energy": 0.38,
        "valence": 0.5,
        "danceability": 0.46,
        "tempo": 92,
        "genres": ["indie", "ambient", "r-n-b"],
    },
}


def create_playlist(genre):
    if not ensure_token(force_refresh=True):
        return jsonify({"error": "not_authenticated"}), 401

    headers = spotify_headers()
    options = normalize_playlist_options(request.get_json(silent=True) or {})
    user_res = http_get("https://api.spotify.com/v1/me", headers=headers)
    if user_res.status_code != 200:
        app.logger.warning("Spotify profile request failed with status %s", user_res.status_code)
        return jsonify({"error": "playlist_unavailable", "message": "Spotify could not create the playlist right now."}), 502
    user_id = (safe_json(user_res) or {}).get("id")
    if not user_id:
        app.logger.warning("Spotify profile response did not include a user id")
        return jsonify({"error": "playlist_unavailable", "message": "Spotify could not create the playlist right now."}), 502

    genre_lower = genre.lower()
    allowed_genres = fetch_available_genre_seeds(headers)
    taste_profile = build_user_taste_profile(headers, allowed_genres=allowed_genres)
    current_item, _payload, status = get_current_track_item(force=False)
    current_profile = None
    if status == 200 and current_item and current_item.get("id"):
        current_profile = fetch_audio_features(headers, [current_item.get("id")]).get(current_item.get("id"))

    base_profile = average_audio_profile([taste_profile.get("audio_profile"), current_profile]) or current_profile or taste_profile.get("audio_profile") or {}
    target_profile = {
        "energy": clamp((base_profile.get("energy", 0.55)) + options["energy_bias"] * 0.22, 0.12, 0.96),
        "valence": base_profile.get("valence", 0.5),
        "danceability": base_profile.get("danceability", 0.58),
        "tempo": clamp(base_profile.get("tempo", 110) + options["energy_bias"] * 14, 68, 170),
    }
    candidates = []
    playlist_context = {"kind": "general"}

    def extend_recommendations(
        seed_tracks=None,
        seed_artists=None,
        seed_genres=None,
        targets=None,
        limit=50,
        relevance=0.7,
        genre_match=False,
    ):
        seed_tracks = [value for value in dict.fromkeys(seed_tracks or []) if value]
        seed_artists = [value for value in dict.fromkeys(seed_artists or []) if value]
        seed_genres_group = [value for value in dict.fromkeys(seed_genres or []) if value]
        total = len(seed_tracks) + len(seed_artists) + len(seed_genres_group)
        if total == 0:
            return
        while total > 5 and seed_genres_group:
            seed_genres_group.pop()
            total -= 1
        while total > 5 and len(seed_artists) > 1:
            seed_artists.pop()
            total -= 1
        params = {"limit": limit}
        if seed_tracks:
            params["seed_tracks"] = ",".join(seed_tracks[:2])
        if seed_artists:
            params["seed_artists"] = ",".join(seed_artists[:2])
        if seed_genres_group:
            params["seed_genres"] = ",".join(seed_genres_group[:2])
        for field, value in (targets or {}).items():
            if value is not None:
                params[f"target_{field}"] = round(value, 3 if field != "tempo" else 1)
        response = http_get("https://api.spotify.com/v1/recommendations", headers=headers, params=params)
        payload = safe_json(response) or {}
        if response.status_code == 200:
            add_ranked_candidate_source(
                candidates,
                payload.get("tracks") or [],
                relevance=relevance,
                genre_match=genre_match,
            )

    if genre_lower in MOOD_KEYWORDS:
        playlist_context = {"kind": "mood", "value": genre_lower}
        mood_profile = MOOD_KEYWORDS[genre_lower]
        target_profile = {
            "energy": clamp(base_profile.get("energy", 0.55) * 0.25 + mood_profile["energy"] * 0.75 + options["energy_bias"] * 0.18, 0.12, 0.96),
            "valence": clamp(base_profile.get("valence", 0.5) * 0.25 + mood_profile["valence"] * 0.75, 0.08, 0.96),
            "danceability": clamp(base_profile.get("danceability", 0.58) * 0.25 + mood_profile["danceability"] * 0.75, 0.08, 0.96),
            "tempo": clamp(base_profile.get("tempo", 110) * 0.25 + mood_profile["tempo"] * 0.75 + options["energy_bias"] * 10, 68, 170),
        }
        mood_genres = [normalize_genre_seed(value, allowed_genres) for value in mood_profile["genres"]]
        extend_recommendations(
            seed_tracks=[current_item.get("id")] if current_item else [],
            seed_genres=[value for value in mood_genres if value],
            targets=target_profile,
            limit=50,
            relevance=0.9,
        )
        extend_recommendations(
            seed_tracks=taste_profile.get("top_track_ids", [])[:2],
            seed_artists=taste_profile.get("top_artist_ids", [])[:2],
            seed_genres=[value for value in mood_genres if value][:1],
            targets=target_profile,
            limit=50,
            relevance=0.82,
        )
        add_ranked_candidate_source(candidates, taste_profile.get("top_tracks", []), relevance=0.66)
        add_ranked_candidate_source(candidates, taste_profile.get("recent_tracks", []), relevance=0.58)
        for artist_id in (taste_profile.get("top_artist_ids") or [])[:3]:
            for related_artist_id in fetch_related_artist_ids(headers, artist_id, limit=2):
                add_ranked_candidate_source(
                    candidates,
                    fetch_artist_top_tracks(headers, related_artist_id, limit=5),
                    relevance=0.55,
                )
        for query in dict.fromkeys([
            mood_profile["query"],
            *[f'{mood_profile["query"]} {value}' for value in mood_profile["genres"][:2]],
        ]):
            add_ranked_candidate_source(candidates, search_tracks(headers, query, limit=30), relevance=0.48)

    decade = _decade_bounds(genre_lower)
    if decade:
        playlist_context = {"kind": "decade", "value": decade}
        start, end = decade
        search_queries = [f"year:{start}-{end}"]
        if current_item:
            lead_artist = ((current_item.get("artists") or [{}])[0].get("name") or "").strip()
            if lead_artist:
                search_queries.insert(0, f'artist:"{lead_artist}" year:{start}-{end}')
        for artist_name in taste_profile.get("top_artist_names", [])[:6]:
            search_queries.append(f'artist:"{artist_name}" year:{start}-{end}')
        for taste_genre in (taste_profile.get("seed_genres") or [])[:4]:
            search_queries.append(f'genre:"{taste_genre}" year:{start}-{end}')
        for query in dict.fromkeys(search_queries):
            add_ranked_candidate_source(candidates, search_tracks(headers, query, limit=35), relevance=0.86)
        add_ranked_candidate_source(candidates, taste_profile.get("top_tracks", []), relevance=0.92)
        add_ranked_candidate_source(candidates, taste_profile.get("recent_tracks", []), relevance=0.72)
        for artist_id in (taste_profile.get("top_artist_ids") or [])[:3]:
            for related_artist_id in fetch_related_artist_ids(headers, artist_id, limit=2):
                add_ranked_candidate_source(
                    candidates,
                    fetch_artist_top_tracks(headers, related_artist_id, limit=5),
                    relevance=0.52,
                )
    elif genre_lower not in MOOD_KEYWORDS:
        primary_genre = normalize_genre_seed(genre_lower, allowed_genres) or next(iter(taste_profile.get("seed_genres") or ["pop"]), "pop")
        playlist_context = {"kind": "genre", "value": primary_genre}
        extend_recommendations(
            seed_genres=[primary_genre],
            targets=target_profile,
            limit=50,
            relevance=1,
            genre_match=True,
        )
        extend_recommendations(
            seed_artists=taste_profile.get("top_artist_ids", [])[:2],
            seed_genres=[primary_genre],
            targets=target_profile,
            limit=50,
            relevance=0.9,
            genre_match=True,
        )
        extend_recommendations(
            seed_tracks=taste_profile.get("top_track_ids", [])[:2],
            seed_genres=[primary_genre],
            targets=target_profile,
            limit=50,
            relevance=0.82,
            genre_match=True,
        )
        for query in (f'genre:"{genre_lower}"', genre_lower):
            add_ranked_candidate_source(
                candidates,
                search_tracks(headers, query, limit=35),
                relevance=0.72,
                genre_match=True,
            )

    candidates = dedupe_tracks(candidates)
    if playlist_context.get("kind") == "genre":
        candidates = validate_genre_candidate_sources(headers, candidates, playlist_context.get("value"))
    candidate_features = fetch_audio_features(headers, [track.get("id") for track in candidates if track.get("id")])
    selected_tracks = select_playlist_tracks(
        candidates,
        candidate_features,
        taste_profile,
        options,
        target_profile,
        decade=decade,
        limit=30,
        context=playlist_context,
    )
    uris = list(dict.fromkeys([track.get("uri") for track in selected_tracks if track.get("uri")]))
    if not uris:
        return jsonify({"error": "no_spotify_matches"}), 404

    title = genre.replace("-", " ").title()
    playlist_name = f"{title} Mix"
    if decade:
        playlist_name = f"{decade[0]}s For You"
    description = (
        f"Generated from your recent listening with {describe_energy(target_profile.get('energy')).lower()} energy, "
        f"{'more familiar' if options['familiarity'] >= 0.5 else 'more discovery-led'} picks, "
        f"and {'clean-only' if options['explicit_mode'] == 'clean' else 'balanced'} filtering."
    )

    playlist_res = http_post(
        f"https://api.spotify.com/v1/users/{user_id}/playlists",
        headers=headers,
        json={
            "name": playlist_name,
            "description": description,
            "public": False,
        },
    )
    playlist_payload = safe_json(playlist_res) or {}
    if playlist_res.status_code != 201:
        app.logger.warning("Spotify playlist creation failed with status %s", playlist_res.status_code)
        return jsonify({"error": "playlist_create_failed", "message": "Spotify could not create the playlist right now."}), 502

    add_res = http_post(
        f"https://api.spotify.com/v1/playlists/{playlist_payload['id']}/tracks",
        headers=headers,
        json={"uris": uris},
    )
    if add_res.status_code not in (200, 201):
        app.logger.warning("Spotify playlist population failed with status %s", add_res.status_code)
        return jsonify({"error": "playlist_add_failed", "message": "The playlist was created, but tracks could not be added."}), 502

    return jsonify(
        {
            "playlist_url": playlist_payload["external_urls"]["spotify"],
            "summary": description,
            "track_count": len(uris),
        }
    )

@app.route("/api/genre-now")
def genre_now():
    if not ensure_token(force_refresh=True):
        return jsonify({"error": "not_authenticated"}), 401

    headers = spotify_headers()
    item, _payload, status = get_current_track_item(force=False)
    if status == 401:
        return jsonify({"error": "not_authenticated"}), 401
    if status != 200 or not item:
        return jsonify({"playing": False})

    track_name = item["name"]
    artist_name = item["artists"][0]["name"]
    track_id = item.get("id")
    allowed_genres = fetch_available_genre_seeds(headers)
    taste_profile = build_user_taste_profile(headers, allowed_genres=allowed_genres)

    tags = []
    genre_seed = next(iter(taste_profile.get("seed_genres") or ["pop"]), "pop")
    if LASTFM_API_KEY:
        tags = get_track_tags(HTTP, LASTFM_API_KEY, track_id, artist_name, track_name)
        if tags:
            genre_seed = extract_genre_from_tags(tags, allowed_genres)
    elif item["artists"][0].get("id"):
        artist_res = http_get(f"https://api.spotify.com/v1/artists/{item['artists'][0]['id']}", headers=headers)
        artist_payload = safe_json(artist_res) or {}
        artist_genres = artist_payload.get("genres", []) if artist_res.status_code == 200 else []
        genre_seed = next(
            (
                normalize_genre_seed(genre, allowed_genres)
                for genre in artist_genres
                if normalize_genre_seed(genre, allowed_genres)
            ),
            genre_seed,
        )

    audio_profile = fetch_audio_features(headers, [track_id]).get(track_id) if track_id else None
    arc = update_track_arc(item, audio_profile)

    return jsonify({
        "track": track_name,
        "artist": artist_name,
        "genre": genre_seed,
        "tags": tags,
        "audio_profile": audio_profile,
        "mood_dna": build_mood_dna(audio_profile or taste_profile.get("audio_profile")),
        "taste_summary": taste_profile.get("summary"),
        "arc": arc,
    })

@app.route("/api/youtube-now")
def youtube_now():
    if not ensure_token(force_refresh=True):
        return jsonify({"error": "not_authenticated"}), 401

    item, _payload, status = get_current_track_item(force=False)
    if status == 401:
        return jsonify({"error": "not_authenticated"}), 401
    if status != 200 or not item:
        return jsonify({"playing": False})

    track_name = item["name"]
    artist_name = item["artists"][0]["name"]
    return jsonify(get_video_link(HTTP, item.get("id"), artist_name, track_name, YOUTUBE_API_KEY))


@app.route("/api/lyrics-now")
def lyrics_now():
    if not ensure_token(force_refresh=True):
        return jsonify({"error": "not_authenticated"}), 401

    item, _payload, status = get_current_track_item(force=False)
    if status == 401:
        return jsonify({"error": "not_authenticated"}), 401
    if status != 200 or not item:
        return jsonify({"playing": False})

    track_name = item["name"]
    artist_name = item["artists"][0]["name"]
    result = get_lyrics(
        HTTP,
        item.get("id"),
        artist_name,
        track_name,
        list(dict.fromkeys([clean_track_title_for_lyrics(track_name), track_name])),
        duration_ms=item.get("duration_ms") or 0,
        album_name=((item.get("album") or {}).get("name") or ""),
    )
    return jsonify(result), 404 if result.get("error") else 200


@app.route("/api/track-metadata")
def track_metadata():
    """Aggregate optional metadata so a song change needs one browser request.

    Each provider retains an independent error result; a lyrics or YouTube
    outage never prevents genre/theme metadata from reaching the page.
    """
    if not ensure_token(force_refresh=True):
        return jsonify({"error": "not_authenticated"}), 401
    item, _payload, status = get_current_track_item(force=False)
    if status != 200 or not item:
        return jsonify({"playing": False})

    def collect(view, name):
        try:
            response = app.make_response(view())
            return {"status": response.status_code, "data": response.get_json(silent=True)}
        except requests.RequestException:
            app.logger.warning("%s provider request failed", name, exc_info=True)
            return {"status": 502, "data": {"error": f"{name}_unavailable"}}
        except Exception:
            app.logger.exception("Unexpected %s metadata failure", name)
            return {"status": 500, "data": {"error": f"{name}_unavailable"}}

    return jsonify({
        "track_id": item.get("id"),
        "genre": collect(genre_now, "genre"),
        "lyrics": collect(lyrics_now, "lyrics"),
        "youtube": collect(youtube_now, "youtube"),
    })

@app.route("/")
def root():
    return send_from_directory(BASE_DIR, "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(BASE_DIR, path)
