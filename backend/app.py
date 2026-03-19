import os, re, time, base64, secrets, hashlib, requests
from collections import Counter
from pathlib import Path
from urllib.parse import urlencode, quote, quote_plus
from flask import Flask, redirect, request, session, jsonify, send_from_directory
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET", "dev")
BASE_DIR = Path(__file__).resolve().parent
CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI")
REQUEST_TIMEOUT = 10
CURRENT_PLAYBACK_TTL = 4
USER_TASTE_TTL = 180
AUDIO_FEATURE_FIELDS = ("energy", "tempo", "loudness", "valence", "danceability")
DEBUG_MODE = os.getenv("FLASK_DEBUG", "").strip().lower() in {"1", "true", "yes", "on"}

app.config["SESSION_COOKIE_SECURE"] = (REDIRECT_URI or "").startswith("https://")
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

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

def auth_header():
    auth_str = f"{CLIENT_ID}:{CLIENT_SECRET}".encode("utf-8")
    return {"Authorization": "Basic " + base64.b64encode(auth_str).decode("utf-8")}

def http_get(url, **kwargs):
    kwargs.setdefault("timeout", REQUEST_TIMEOUT)
    return requests.get(url, **kwargs)

def http_post(url, **kwargs):
    kwargs.setdefault("timeout", REQUEST_TIMEOUT)
    return requests.post(url, **kwargs)

def http_put(url, **kwargs):
    kwargs.setdefault("timeout", REQUEST_TIMEOUT)
    return requests.put(url, **kwargs)

def safe_json(response):
    try:
        return response.json()
    except ValueError:
        return None

def clamp(value, low, high):
    return max(low, min(high, value))

def session_cache_key():
    seed = session.get("refresh_token") or session.get("access_token") or request.remote_addr or "anonymous"
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

def dedupe_tracks(tracks):
    seen = set()
    unique = []
    for track in tracks:
        if not isinstance(track, dict):
            continue
        track_id = track.get("id") or track.get("uri")
        if not track_id or track_id in seen:
            continue
        seen.add(track_id)
        unique.append(track)
    return unique

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
    data = {"grant_type": "refresh_token", "refresh_token": refresh_token}
    r = http_post(TOKEN_URL, headers=auth_header(), data=data)
    if r.status_code != 200:
        print("Token refresh failed:", r.text)
        return False
    payload = r.json()
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
            payload = {"error": "invalid_response", "details": response.text}

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
    response = http_get("https://api.spotify.com/v1/recommendations/available-genre-seeds", headers=headers)
    payload = safe_json(response) or {}
    return payload.get("genres", []) if response.status_code == 200 else []

def fetch_audio_features(headers, track_ids):
    features = {}
    clean_ids = [track_id for track_id in dict.fromkeys(track_ids) if track_id]
    for chunk in chunked(clean_ids, 100):
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
            features[item["id"]] = {field: item.get(field) for field in AUDIO_FEATURE_FIELDS}
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

def normalize_genre_seed(value, allowed_genres=None):
    if not value:
        return None
    candidate = _normalize_tag_to_seed(value.lower().strip())
    if allowed_genres and candidate not in allowed_genres:
        return None
    return candidate

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

def summarize_taste_profile(profile):
    audio_profile = profile.get("audio_profile") or {}
    top_genres = profile.get("top_genres") or []
    lead_genre = top_genres[0][0] if top_genres else "pop"
    energy_label = describe_energy(audio_profile.get("energy")).lower()
    tempo_label = describe_tempo(audio_profile.get("tempo")).lower()
    mood_label = describe_mood(audio_profile.get("valence")).lower()
    return f"Your recent listening leans {lead_genre} with {energy_label} energy, a {tempo_label} pace, and a {mood_label} mood."

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
        params={"limit": 18},
    )
    top_tracks_res = http_get(
        "https://api.spotify.com/v1/me/top/tracks",
        headers=headers,
        params={"limit": 15, "time_range": "short_term"},
    )
    top_artists_res = http_get(
        "https://api.spotify.com/v1/me/top/artists",
        headers=headers,
        params={"limit": 12, "time_range": "short_term"},
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

def score_audio_similarity(candidate_profile, target_profile):
    if not candidate_profile or not target_profile:
        return 0

    score = 0
    weights = {
        "energy": 1.0,
        "valence": 0.9,
        "danceability": 0.8,
        "tempo": 0.55,
    }
    for field, weight in weights.items():
        candidate_value = candidate_profile.get(field)
        target_value = target_profile.get(field)
        if candidate_value is None or target_value is None:
            continue
        if field == "tempo":
            distance = min(abs(candidate_value - target_value) / 70, 1)
        else:
            distance = min(abs(candidate_value - target_value), 1)
        score += max(0, 1 - distance) * weight
    return score

def release_year(track):
    release_date = ((track or {}).get("album") or {}).get("release_date") or ""
    match = re.match(r"(\d{4})", release_date)
    return int(match.group(1)) if match else None

def track_artist_ids(track):
    return [artist.get("id") for artist in (track or {}).get("artists") or [] if artist.get("id")]

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
        return "stay with artist"
    if group_id == "related-artists":
        return "same orbit"
    if group_id == "taste-fallback":
        return "taste match"
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
            "limit": 14,
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
        if len(resolved_tracks) >= 8:
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
            "tracks": resolved_tracks[:8],
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
        fetch_artist_top_tracks(headers, lead_artist_id, limit=8),
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
                "tracks": same_artist_tracks[:4],
            }
        )

    related_tracks = []
    for related_artist_id in fetch_related_artist_ids(headers, lead_artist_id, limit=4):
        related_tracks.extend(fetch_artist_top_tracks(headers, related_artist_id, limit=3))
        if len(related_tracks) >= 10:
            break
    related_tracks = collect_unique(
        related_tracks,
        "related-artists",
        "Popular with listeners orbiting this track's artist.",
    )
    if related_tracks:
        groups.append(
            {
                "id": "related-artists",
                "title": "Same orbit",
                "kicker": "Nearby artists",
                "detail": "Fallback picks pulled from artists Spotify connects to the current song.",
                "tracks": related_tracks[:4],
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
                    "tracks": discovery_tracks[:4],
                }
            )

    return groups

def build_recommendation_groups(headers, current_item, current_profile, taste_profile):
    current_track_id = current_item.get("id")
    current_artist_ids = track_artist_ids(current_item)
    seed_genres = taste_profile.get("seed_genres") or ["pop"]
    primary_genre = seed_genres[0]
    alternate_genre = next((genre for genre in seed_genres if genre != primary_genre), primary_genre)
    profile_audio = taste_profile.get("audio_profile") or {}
    target_profile = current_profile or profile_audio
    seen_ids = {current_track_id}
    groups = []

    group_specs = [
        {
            "id": "more-like-this",
            "title": "More like this",
            "kicker": f"Because you listened to {current_item.get('name', 'this track')}",
            "detail": "The closest continuation of the current song's shape and momentum.",
            "seed_tracks": [current_track_id],
            "seed_artists": current_artist_ids[:1],
            "seed_genres": [primary_genre],
            "targets": {
                "energy": target_profile.get("energy"),
                "valence": target_profile.get("valence"),
                "danceability": target_profile.get("danceability"),
                "tempo": target_profile.get("tempo"),
            },
        },
        {
            "id": "same-mood-different-genre",
            "title": "Same mood, different genre",
            "kicker": "A wider angle on the same feeling",
            "detail": "Holds onto the emotional temperature while changing the texture around it.",
            "seed_tracks": [],
            "seed_artists": (taste_profile.get("top_artist_ids") or current_artist_ids)[:2],
            "seed_genres": [alternate_genre],
            "targets": {
                "energy": target_profile.get("energy"),
                "valence": target_profile.get("valence"),
                "danceability": profile_audio.get("danceability", target_profile.get("danceability")),
                "tempo": target_profile.get("tempo"),
            },
        },
        {
            "id": "familiar-favorites",
            "title": "Familiar favorites",
            "kicker": "Built from your repeat listens",
            "detail": "Closer to the artists, pacing, and colors that already show up in your listening.",
            "seed_tracks": (taste_profile.get("top_track_ids") or [current_track_id])[:2],
            "seed_artists": (taste_profile.get("top_artist_ids") or current_artist_ids)[:2],
            "seed_genres": [primary_genre],
            "targets": {
                "energy": profile_audio.get("energy", target_profile.get("energy")),
                "valence": profile_audio.get("valence", target_profile.get("valence")),
                "danceability": profile_audio.get("danceability", target_profile.get("danceability")),
                "tempo": profile_audio.get("tempo", target_profile.get("tempo")),
            },
        },
        {
            "id": "deep-cuts",
            "title": "Deep cuts",
            "kicker": "Discovery without losing the thread",
            "detail": "A slightly riskier lane that still respects your recent taste profile.",
            "seed_tracks": [current_track_id],
            "seed_artists": (taste_profile.get("top_artist_ids") or current_artist_ids)[:1],
            "seed_genres": [alternate_genre, primary_genre],
            "targets": {
                "energy": profile_audio.get("energy", target_profile.get("energy")),
                "valence": target_profile.get("valence"),
                "danceability": target_profile.get("danceability"),
                "tempo": target_profile.get("tempo"),
            },
        },
    ]

    for spec in group_specs:
        seed_tracks = [seed for seed in spec["seed_tracks"] if seed]
        seed_artists = [seed for seed in spec["seed_artists"] if seed]
        seed_genres_group = [seed for seed in spec["seed_genres"] if seed]
        seed_total = len(seed_tracks) + len(seed_artists) + len(seed_genres_group)
        if seed_total == 0:
            continue
        while seed_total > 5 and seed_genres_group:
            seed_genres_group.pop()
            seed_total -= 1
        while seed_total > 5 and len(seed_artists) > 1:
            seed_artists.pop()
            seed_total -= 1

        params = {"limit": 12}
        if seed_tracks:
            params["seed_tracks"] = ",".join(seed_tracks[:2])
        if seed_artists:
            params["seed_artists"] = ",".join(seed_artists[:2])
        if seed_genres_group:
            params["seed_genres"] = ",".join(seed_genres_group[:2])
        for field, value in spec["targets"].items():
            if value is not None:
                params[f"target_{field}"] = round(value, 3 if field != "tempo" else 1)

        response = http_get("https://api.spotify.com/v1/recommendations", headers=headers, params=params)
        payload = safe_json(response) or {}
        candidates = dedupe_tracks(payload.get("tracks", []) if response.status_code == 200 else [])
        if not candidates:
            continue

        features = fetch_audio_features(headers, [track.get("id") for track in candidates if track.get("id")])
        ranked = []
        for candidate in candidates:
            candidate_id = candidate.get("id")
            if not candidate_id or candidate_id in seen_ids:
                continue

            artist_ids = track_artist_ids(candidate)
            known_artist = any(artist_id in taste_profile.get("known_artist_ids", set()) for artist_id in artist_ids)
            known_track = candidate_id in taste_profile.get("known_track_ids", set())
            candidate_profile = features.get(candidate_id)
            score = score_audio_similarity(candidate_profile, spec["targets"])
            popularity = (candidate.get("popularity") or 0) / 100

            if spec["id"] == "familiar-favorites":
                score += 0.9 if known_artist else 0.2
                score += 0.45 if known_track else 0
                score += popularity * 0.25
            elif spec["id"] == "deep-cuts":
                score += 0.6 if not known_track else -0.4
                score += (1 - popularity) * 0.45
            elif spec["id"] == "same-mood-different-genre":
                score += 0.4 if not known_artist else 0
                score += 0.25 if not known_track else -0.1
            else:
                score += 0.35 if known_artist else 0.15
                score += popularity * 0.1

            candidate["spotifeel_reason"] = describe_recommendation_reason(
                spec["id"],
                candidate_profile,
                spec["targets"],
                known_artist=known_artist,
            )
            candidate["spotifeel_reason_short"] = describe_recommendation_reason_short(
                spec["id"],
                candidate_profile,
                spec["targets"],
                known_artist=known_artist,
            )
            ranked.append((score, candidate))

        ranked.sort(key=lambda item: item[0], reverse=True)
        tracks = [candidate for _score, candidate in ranked[:4]]
        for track in tracks:
            seen_ids.add(track.get("id"))
        if tracks:
            groups.append(
                {
                    "id": spec["id"],
                    "title": spec["title"],
                    "kicker": spec["kicker"],
                    "detail": spec["detail"],
                    "tracks": tracks,
                }
            )

    return groups

def parse_float_option(value, default):
    if value in (None, ""):
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default

def normalize_playlist_options(payload):
    payload = payload or {}
    familiarity = clamp(parse_float_option(payload.get("familiarity", 0.58), 0.58), 0, 1)
    energy_bias = clamp(parse_float_option(payload.get("energy_bias", 0), 0), -1, 1)
    artist_variety = clamp(parse_float_option(payload.get("artist_variety", 0.66), 0.66), 0, 1)
    explicit_mode = (payload.get("explicit_mode") or "balanced").strip().lower()
    if explicit_mode not in {"balanced", "clean", "explicit"}:
        explicit_mode = "balanced"
    return {
        "familiarity": familiarity,
        "energy_bias": energy_bias,
        "artist_variety": artist_variety,
        "explicit_mode": explicit_mode,
    }

def search_tracks(headers, query, limit=12):
    response = http_get(
        "https://api.spotify.com/v1/search",
        headers=headers,
        params={"q": query, "type": "track", "limit": limit},
    )
    payload = safe_json(response) or {}
    return dedupe_tracks((payload.get("tracks") or {}).get("items", []) if response.status_code == 200 else [])

def score_playlist_candidate(track, candidate_profile, target_profile, taste_profile, options, decade=None):
    track_id = track.get("id")
    if not track_id:
        return -999

    known_artist = any(artist_id in taste_profile.get("known_artist_ids", set()) for artist_id in track_artist_ids(track))
    known_track = track_id in taste_profile.get("known_track_ids", set())
    familiarity = options["familiarity"]
    discovery = 1 - familiarity
    popularity = (track.get("popularity") or 0) / 100

    score = score_audio_similarity(candidate_profile, target_profile) * 1.4
    score += familiarity * (0.9 if known_artist else 0)
    score += familiarity * (0.35 if known_track else 0)
    score += discovery * (0.65 if not known_artist else 0)
    score += discovery * (0.35 if not known_track else -0.1)
    score += familiarity * popularity * 0.4
    score += discovery * (1 - popularity) * 0.3

    if options["explicit_mode"] == "clean" and track.get("explicit"):
        score -= 3
    elif options["explicit_mode"] == "explicit" and track.get("explicit"):
        score += 0.18

    year = release_year(track)
    if decade:
        start, end = decade
        if year is None or year < start or year > end:
            score -= 2.5
        else:
            score += 0.8

    return score

def select_playlist_tracks(candidates, features, taste_profile, options, target_profile, decade=None, limit=30):
    pool = []
    for track in dedupe_tracks(candidates):
        score = score_playlist_candidate(track, features.get(track.get("id")), target_profile, taste_profile, options, decade=decade)
        if score > -2:
            pool.append({"score": score, "track": track})

    selected = []
    seen_ids = set()
    artist_counts = Counter()
    while pool and len(selected) < limit:
        best_index = None
        best_score = None
        for index, entry in enumerate(pool):
            track = entry["track"]
            artist_key = ((track.get("artists") or [{}])[0].get("id") or (track.get("artists") or [{}])[0].get("name") or "")
            variety_penalty = artist_counts[artist_key] * options["artist_variety"] * 0.6
            adjusted_score = entry["score"] - variety_penalty
            if best_score is None or adjusted_score > best_score:
                best_score = adjusted_score
                best_index = index
        if best_index is None:
            break
        entry = pool.pop(best_index)
        track = entry["track"]
        track_id = track.get("id")
        if not track_id or track_id in seen_ids:
            continue
        seen_ids.add(track_id)
        artist_key = ((track.get("artists") or [{}])[0].get("id") or (track.get("artists") or [{}])[0].get("name") or "")
        artist_counts[artist_key] += 1
        selected.append(track)
    return selected

@app.route("/login")
def login():
    oauth_state = secrets.token_urlsafe(24)
    session["oauth_state"] = oauth_state
    params = {
        "client_id": CLIENT_ID,
        "response_type": "code",
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPES,
        "state": oauth_state,
    }
    return redirect(f"{AUTH_URL}?{urlencode(params)}")

@app.route("/callback")
def callback():
    code = request.args.get("code")
    oauth_error = request.args.get("error")
    oauth_error_description = request.args.get("error_description")
    incoming_state = request.args.get("state")
    expected_state = session.pop("oauth_state", None)
    if not expected_state or incoming_state != expected_state:
        return "Invalid state parameter", 400
    if oauth_error:
        detail = oauth_error_description or oauth_error.replace("_", " ")
        return f"Spotify authorization failed: {detail}", 400
    if not code:
        return "Spotify did not return an authorization code. Check the redirect URI and app settings.", 400
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
    }
    r = http_post(TOKEN_URL, headers=auth_header(), data=data)
    if r.status_code != 200:
        return f"Error: {r.text}", 400
    payload = r.json()
    session["access_token"] = payload["access_token"]
    session["expires_at"] = time.time() + int(payload.get("expires_in", 3600))
    if "refresh_token" in payload:
        session["refresh_token"] = payload["refresh_token"]
    elif "refresh_token" not in session:
        return "No refresh token available — please re-authenticate", 400
    if "scope" in payload:
        session["scopes"] = payload["scope"]
    return redirect("/")

@app.route("/api/session")
def whoami():
    return jsonify({"authenticated": ensure_token()})

@app.route("/api/now-playing")
def now_playing():
    payload, status = get_current_playback_payload(force=False)
    if status == 401:
        return jsonify({"error": "not_authenticated"}), 401
    if status == 204:
        return jsonify({"playing": False})
    return jsonify(payload), status

@app.route("/api/recently-played")
def recently_played():
    if not ensure_token(force_refresh=True):
        return jsonify({"error": "not_authenticated"}), 401
    headers = spotify_headers()
    params = {"limit": request.args.get("limit", 50)}
    r = http_get("https://api.spotify.com/v1/me/player/recently-played", headers=headers, params=params)
    return jsonify(r.json()), r.status_code

@app.route("/api/recommendations")
def api_recommendations():
    try:
        if not ensure_token(force_refresh=True):
            return jsonify({"error": "not_authenticated"}), 401

        headers = spotify_headers()
        current_item, current_payload, status = get_current_track_item(force=False)
        if status == 401:
            return jsonify({"error": "not_authenticated"}), 401
        if status != 200 or not current_item:
            return jsonify({"error": "No track currently playing"}), 400

        allowed_genres = fetch_available_genre_seeds(headers)
        taste_profile = build_user_taste_profile(headers, allowed_genres=allowed_genres)
        current_track_id = current_item.get("id")
        current_profile = fetch_audio_features(headers, [current_track_id]).get(current_track_id) if current_track_id else None
        lastfm_groups = build_lastfm_recommendation_groups(headers, current_item, current_profile=current_profile)
        groups = list(lastfm_groups)
        if len(groups) < 2:
            fallback_groups = build_fallback_recommendation_groups(headers, current_item, taste_profile)
            existing_ids = {group.get("id") for group in groups}
            for group in fallback_groups:
                if group.get("id") in existing_ids:
                    continue
                groups.append(group)
        if not groups:
            return jsonify({"error": "No recommendations available"}), 404

        profile_summary = f'Tracks curated because you listened to "{current_item.get("name", "this track")}".'

        return jsonify(
            {
                "based_on": {
                    "track": current_item.get("name"),
                    "artist": ((current_item.get("artists") or [{}])[0].get("name") or ""),
                },
                "profile_summary": profile_summary,
                "groups": groups,
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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

def _decade_bounds(label: str):
    label = (label or "").lower().strip()
    for y in (1960, 1970, 1980, 1990, 2000, 2010, 2020):
        if label in (f"{y}s", f"{str(y)[2:]}s"):
            return (y, y + 9)
    return None

@app.route("/api/create-playlist/<genre>", methods=["POST"])
def create_playlist(genre):
    if not ensure_token(force_refresh=True):
        return jsonify({"error": "not_authenticated"}), 401

    headers = spotify_headers()
    options = normalize_playlist_options(request.get_json(silent=True) or {})
    user_res = http_get("https://api.spotify.com/v1/me", headers=headers)
    if user_res.status_code != 200:
        return jsonify({"error": "spotify_user_error", "details": safe_json(user_res) or user_res.text}), user_res.status_code
    user_id = (safe_json(user_res) or {}).get("id")
    if not user_id:
        return jsonify({"error": "spotify_user_error", "details": "missing_user_id"}), 502

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

    def extend_recommendations(seed_tracks=None, seed_artists=None, seed_genres=None, targets=None, limit=24):
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
            candidates.extend((payload.get("tracks") or []))

    if genre_lower in MOOD_KEYWORDS:
        mood_profile = MOOD_KEYWORDS[genre_lower]
        target_profile = {
            "energy": clamp(base_profile.get("energy", 0.55) * 0.5 + mood_profile["energy"] * 0.5 + options["energy_bias"] * 0.18, 0.12, 0.96),
            "valence": clamp(base_profile.get("valence", 0.5) * 0.45 + mood_profile["valence"] * 0.55, 0.08, 0.96),
            "danceability": clamp(base_profile.get("danceability", 0.58) * 0.45 + mood_profile["danceability"] * 0.55, 0.08, 0.96),
            "tempo": clamp(base_profile.get("tempo", 110) * 0.45 + mood_profile["tempo"] * 0.55 + options["energy_bias"] * 10, 68, 170),
        }
        mood_genres = [normalize_genre_seed(value, allowed_genres) for value in mood_profile["genres"]]
        extend_recommendations(
            seed_tracks=[current_item.get("id")] if current_item else [],
            seed_artists=taste_profile.get("top_artist_ids", [])[:2],
            seed_genres=[value for value in mood_genres if value],
            targets=target_profile,
            limit=36,
        )
        candidates.extend(search_tracks(headers, mood_profile["query"], limit=18))

    decade = _decade_bounds(genre_lower)
    if decade:
        start, end = decade
        search_queries = [f"year:{start}-{end}"]
        if current_item:
            lead_artist = ((current_item.get("artists") or [{}])[0].get("name") or "").strip()
            if lead_artist:
                search_queries.insert(0, f'artist:"{lead_artist}" year:{start}-{end}')
        for artist_name in taste_profile.get("top_artist_names", [])[:3]:
            search_queries.append(f'artist:"{artist_name}" year:{start}-{end}')
        for query in dict.fromkeys(search_queries):
            candidates.extend(search_tracks(headers, query, limit=12))
    elif genre_lower not in MOOD_KEYWORDS:
        primary_genre = normalize_genre_seed(genre_lower, allowed_genres) or next(iter(taste_profile.get("seed_genres") or ["pop"]), "pop")
        extend_recommendations(
            seed_tracks=[current_item.get("id")] if current_item else taste_profile.get("top_track_ids", [])[:1],
            seed_artists=taste_profile.get("top_artist_ids", [])[:2],
            seed_genres=[primary_genre],
            targets=target_profile,
            limit=36,
        )
        candidates.extend(search_tracks(headers, genre_lower, limit=18))

    candidate_features = fetch_audio_features(headers, [track.get("id") for track in candidates if track.get("id")])
    selected_tracks = select_playlist_tracks(
        candidates,
        candidate_features,
        taste_profile,
        options,
        target_profile,
        decade=decade,
        limit=30,
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
        return jsonify({"error": "spotify_playlist_create_error", "details": playlist_payload or playlist_res.text}), playlist_res.status_code

    add_res = http_post(
        f"https://api.spotify.com/v1/playlists/{playlist_payload['id']}/tracks",
        headers=headers,
        json={"uris": uris},
    )
    if add_res.status_code not in (200, 201):
        return jsonify({"error": "spotify_playlist_add_error", "details": safe_json(add_res) or add_res.text}), add_res.status_code

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
        lf_url = "https://ws.audioscrobbler.com/2.0/"
        lf_params = {
            "method": "track.getInfo",
            "api_key": LASTFM_API_KEY,
            "artist": artist_name,
            "track": track_name,
            "format": "json"
        }
        lf_res = http_get(lf_url, params=lf_params)
        if lf_res.status_code == 200:
            tags = (safe_json(lf_res) or {}).get("track", {}).get("toptags", {}).get("tag", [])
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
    query = f"{artist_name} {track_name}"

    if YOUTUBE_API_KEY:
        yt_url = "https://www.googleapis.com/youtube/v3/search"
        params = {"part": "snippet", "q": query, "key": YOUTUBE_API_KEY, "maxResults": 1, "type": "video"}
        yt_res = safe_json(http_get(yt_url, params=params)) or {}
        if "items" in yt_res and yt_res["items"]:
            video_id = yt_res["items"][0]["id"]["videoId"]
            return jsonify({"youtube_url": f"https://www.youtube.com/watch?v={video_id}"})

    return jsonify({"youtube_search_url": f"https://www.youtube.com/results?search_query={query}"})


@app.route("/api/player/toggle", methods=["POST"])
def player_toggle():
    if not ensure_token(force_refresh=True):
        return jsonify({"error": "not_authenticated"}), 401

    headers = {"Authorization": f"Bearer {session['access_token']}"}
    current_res = http_get("https://api.spotify.com/v1/me/player/currently-playing", headers=headers)
    if current_res.status_code == 204:
        return jsonify({"error": "no_active_playback"}), 409
    if current_res.status_code != 200:
        return jsonify({"error": "spotify_error", "details": current_res.text}), current_res.status_code

    current_payload = current_res.json() or {}
    currently_playing = bool(current_payload.get("is_playing"))
    endpoint = "pause" if currently_playing else "play"
    toggle_res = http_put(f"https://api.spotify.com/v1/me/player/{endpoint}", headers=headers)
    if toggle_res.status_code not in (200, 202, 204):
        return jsonify({"error": "spotify_toggle_error", "details": toggle_res.text}), toggle_res.status_code

    return jsonify({"playing": not currently_playing})

@app.route("/api/player/play", methods=["PUT"])
def player_play():
    if not ensure_token(force_refresh=True):
        return jsonify({"error": "not_authenticated"}), 401

    payload = request.get_json(silent=True) or {}
    uri = (payload.get("uri") or "").strip()
    if not uri:
        return jsonify({"error": "missing_uri"}), 400

    headers = {
        "Authorization": f"Bearer {session['access_token']}",
        "Content-Type": "application/json",
    }
    play_res = http_put(
        "https://api.spotify.com/v1/me/player/play",
        headers=headers,
        json={"uris": [uri]},
    )
    if play_res.status_code not in (200, 202, 204):
        return jsonify({"error": "spotify_play_error", "details": play_res.text}), play_res.status_code

    return jsonify({"playing": True, "uri": uri})


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
    candidate_titles = list(dict.fromkeys([clean_track_title_for_lyrics(track_name), track_name]))
    search_query = f"{artist_name} {track_name} lyrics"
    search_urls = {
        "genius": f"https://genius.com/search?q={quote_plus(f'{artist_name} {track_name}')}",
        "search": f"https://www.google.com/search?q={quote_plus(search_query)}",
    }

    for candidate in candidate_titles:
        if not candidate:
            continue
        lyrics_res = http_get(
            f"https://api.lyrics.ovh/v1/{quote(artist_name, safe='')}/{quote(candidate, safe='')}"
        )
        if lyrics_res.status_code != 200:
            continue
        lyrics_payload = safe_json(lyrics_res) or {}
        lyrics_text = (lyrics_payload.get("lyrics") or "").strip()
        if lyrics_text:
            return jsonify({
                "track": track_name,
                "artist": artist_name,
                "lyrics": lyrics_text,
                "source": "lyrics.ovh",
                "search_urls": search_urls,
            })

    return jsonify({
        "error": "lyrics_not_found",
        "track": track_name,
        "artist": artist_name,
        "search_urls": search_urls,
    }), 404

@app.route("/")
def root():
    return send_from_directory(BASE_DIR, "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(BASE_DIR, path)

@app.route("/logout")
def logout():
    CURRENT_PLAYBACK_CACHE.pop(session_cache_key(), None)
    USER_TASTE_CACHE.pop(session_cache_key(), None)
    session.clear()
    return redirect("/")


if __name__ == "__main__":
    cert_path = BASE_DIR / "cert.pem"
    key_path = BASE_DIR / "key.pem"
    ssl_context = (str(cert_path), str(key_path)) if cert_path.exists() and key_path.exists() else None
    app.run(host="0.0.0.0", port=5001, debug=DEBUG_MODE, ssl_context=ssl_context)
