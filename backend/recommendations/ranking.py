"""Pure scoring and filtering helpers for explainable recommendations."""

import re
import unicodedata
from collections import Counter


AUDIO_FEATURE_FIELDS = ("energy", "tempo", "loudness", "valence", "danceability")


def clamp(value, low, high):
    return max(low, min(high, value))


VERSION_SUFFIX = re.compile(
    r"\s*(?:[-–—]\s*)?(?:\(|\[)?(?:\d{4}\s+)?"
    r"(?:re-?master(?:ed)?|album version|single version|original version|"
    r"radio version|edit version)(?:\s+\d{4})?(?:\)|\])?\s*$",
    re.IGNORECASE,
)


def normalize_identity_text(value):
    value = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def normalized_track_signature(track):
    """Identify duplicate releases while preserving real live/remix/acoustic variants."""
    title = str((track or {}).get("name") or "").strip()
    previous = None
    while previous != title:
        previous = title
        title = VERSION_SUFFIX.sub("", title).strip()
    lead_artist = ((track or {}).get("artists") or [{}])[0].get("name") or ""
    normalized_title = normalize_identity_text(title)
    normalized_artist = normalize_identity_text(lead_artist)
    return f"{normalized_title}::{normalized_artist}" if normalized_title and normalized_artist else ""


def track_identity_keys(track):
    keys = []
    if (track or {}).get("id"):
        keys.append(f"id:{track['id']}")
    if (track or {}).get("uri"):
        keys.append(f"uri:{track['uri']}")
    signature = normalized_track_signature(track)
    if signature:
        keys.append(f"recording:{signature}")
    return keys


def dedupe_tracks(tracks):
    """Deduplicate Spotify IDs, URIs, and redundant release versions."""
    seen = set()
    unique = []
    for track in tracks:
        if not isinstance(track, dict):
            continue
        keys = track_identity_keys(track)
        if not keys or any(key in seen for key in keys):
            continue
        seen.update(keys)
        unique.append(track)
    return unique


def normalize_genre(value, allowed_genres=None):
    if not value:
        return None
    normalized = value.lower().strip()
    aliases = {
        "hip hop": "hip-hop", "hiphop": "hip-hop", "r&b": "r-n-b", "rnb": "r-n-b",
        "synth pop": "synth-pop", "synthpop": "synth-pop", "alt rock": "alternative",
        "alternative rock": "alternative", "indie rock": "indie", "indie pop": "indie-pop",
        "indie-pop": "indie-pop", "electro pop": "electropop", "electro-pop": "electropop",
        "d n b": "drum-and-bass", "dnb": "drum-and-bass", "drum n bass": "drum-and-bass",
        "drum & bass": "drum-and-bass",
    }
    candidate = aliases.get(normalized, normalized)
    if allowed_genres and candidate not in allowed_genres:
        return None
    return candidate


def score_audio_similarity(candidate_profile, target_profile):
    """Return a weighted closeness score; higher values are more similar."""
    if not candidate_profile or not target_profile:
        return 0
    score = 0
    for field, weight in {"energy": 1.0, "valence": 0.9, "danceability": 0.8, "tempo": 0.55}.items():
        candidate_value = candidate_profile.get(field)
        target_value = target_profile.get(field)
        if candidate_value is None or target_value is None:
            continue
        distance = min(abs(candidate_value - target_value) / 70, 1) if field == "tempo" else min(abs(candidate_value - target_value), 1)
        score += max(0, 1 - distance) * weight
    return score


def release_year(track):
    release_date = ((track or {}).get("album") or {}).get("release_date") or ""
    match = re.match(r"(\d{4})", release_date)
    return int(match.group(1)) if match else None


def track_artist_ids(track):
    return [artist.get("id") for artist in (track or {}).get("artists") or [] if artist.get("id")]


def parse_float_option(value, default):
    if value in (None, ""):
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def normalize_playlist_options(payload):
    payload = payload or {}
    explicit_mode = str(payload.get("explicit_mode") or "balanced").strip().lower()
    if explicit_mode not in {"balanced", "clean", "explicit"}:
        explicit_mode = "balanced"
    return {
        "familiarity": clamp(parse_float_option(payload.get("familiarity", 0.58), 0.58), 0, 1),
        "energy_bias": clamp(parse_float_option(payload.get("energy_bias", 0), 0), -1, 1),
        "artist_variety": clamp(parse_float_option(payload.get("artist_variety", 0.66), 0.66), 0, 1),
        "explicit_mode": explicit_mode,
    }


def decade_bounds(label):
    label = (label or "").lower().strip()
    for year in (1960, 1970, 1980, 1990, 2000, 2010, 2020):
        if label in (f"{year}s", f"{str(year)[2:]}s"):
            return year, year + 9
    return None


def score_playlist_candidate(track, candidate_profile, target_profile, taste_profile, options, decade=None, context=None):
    track_id = track.get("id")
    if not track_id:
        return -999
    known_artist = any(artist_id in taste_profile.get("known_artist_ids", set()) for artist_id in track_artist_ids(track))
    known_track = track_id in taste_profile.get("known_track_ids", set())
    familiarity = options["familiarity"]
    discovery = 1 - familiarity
    popularity = (track.get("popularity") or 0) / 100

    if options["explicit_mode"] == "clean" and track.get("explicit"):
        return -999
    year = release_year(track)
    if decade:
        start, end = decade
        if year is None or not start <= year <= end:
            return -999

    context = context or {}
    audio_weight = 2.15 if context.get("kind") == "mood" else 1.55
    score = score_audio_similarity(candidate_profile, target_profile) * audio_weight
    score += familiarity * (0.9 if known_artist else 0)
    score += familiarity * (0.35 if known_track else 0)
    score += discovery * (0.65 if not known_artist else 0)
    score += discovery * (0.35 if not known_track else -0.1)
    score += familiarity * popularity * 0.4
    score += discovery * (1 - popularity) * 0.3
    if options["explicit_mode"] == "explicit" and track.get("explicit"):
        score += 0.18
    if decade:
        score += 0.8
    if context.get("kind") == "genre":
        if not track.get("spotifeel_genre_match"):
            return -999
        score += 1.35 * float(track.get("spotifeel_genre_match") or 0)
    source_relevance = track.get("spotifeel_source_relevance")
    if source_relevance is not None:
        score += clamp(float(source_relevance), 0, 1) * 0.55
    return score


def lead_artist_key(track):
    artist = ((track or {}).get("artists") or [{}])[0]
    return artist.get("id") or normalize_identity_text(artist.get("name"))


def is_known_candidate(track, taste_profile):
    track_id = (track or {}).get("id")
    return bool(
        track_id in taste_profile.get("known_track_ids", set())
        or any(artist_id in taste_profile.get("known_artist_ids", set()) for artist_id in track_artist_ids(track))
    )


def playlist_artist_cap(options):
    if options.get("familiarity", 0.58) >= 0.82 or options.get("artist_variety", 0.66) <= 0.2:
        return 3
    return 2


def audio_transition_distance(left_profile, right_profile):
    if not left_profile or not right_profile:
        return 0.5
    weights = {"energy": 1.0, "valence": 0.75, "danceability": 0.65, "tempo": 0.55}
    distance = 0
    weight_total = 0
    for field, weight in weights.items():
        left = left_profile.get(field)
        right = right_profile.get(field)
        if left is None or right is None:
            continue
        delta = abs(left - right) / 70 if field == "tempo" else abs(left - right)
        distance += min(delta, 1) * weight
        weight_total += weight
    return distance / weight_total if weight_total else 0.5


def sequence_playlist_tracks(tracks, features, target_profile=None):
    """Create a gentle multi-signal arc while preventing same-artist runs."""
    if len(tracks) < 3:
        return list(tracks)
    remaining = list(tracks)
    target_profile = target_profile or {}
    start_target = dict(target_profile)
    if start_target.get("energy") is not None:
        start_target["energy"] = clamp(start_target["energy"] - 0.1, 0, 1)
    first = min(
        remaining[: min(8, len(remaining))],
        key=lambda track: audio_transition_distance(features.get(track.get("id")), start_target),
    )
    ordered = [first]
    remaining.remove(first)
    while remaining:
        progress = len(ordered) / max(1, len(tracks) - 1)
        arc_target = dict(target_profile)
        if arc_target.get("energy") is not None:
            arc_target["energy"] = clamp(arc_target["energy"] - 0.08 + progress * 0.18, 0, 1)
        previous = ordered[-1]
        previous_profile = features.get(previous.get("id"))
        previous_artist = lead_artist_key(previous)

        def transition_score(candidate):
            candidate_profile = features.get(candidate.get("id"))
            same_artist_penalty = 4 if previous_artist and lead_artist_key(candidate) == previous_artist else 0
            return (
                audio_transition_distance(previous_profile, candidate_profile) * 1.7
                + audio_transition_distance(candidate_profile, arc_target) * 0.55
                + same_artist_penalty
            )

        next_track = min(remaining, key=transition_score)
        ordered.append(next_track)
        remaining.remove(next_track)
    return ordered


def select_playlist_tracks(
    candidates,
    features,
    taste_profile,
    options,
    target_profile,
    decade=None,
    limit=30,
    context=None,
    artist_cap=None,
):
    pool = []
    for track in dedupe_tracks(candidates):
        score = score_playlist_candidate(
            track,
            features.get(track.get("id")),
            target_profile,
            taste_profile,
            options,
            decade,
            context=context,
        )
        if score > -2:
            pool.append({"score": score, "track": track, "known": is_known_candidate(track, taste_profile)})

    selected, seen_keys, artist_counts = [], set(), Counter()
    artist_cap = artist_cap or playlist_artist_cap(options)
    desired_known_ratio = 0.22 + options["familiarity"] * 0.62
    while pool and len(selected) < limit:
        def adjusted(entry):
            key = lead_artist_key(entry["track"])
            if key and artist_counts[key] >= artist_cap:
                return -9999
            current_known_ratio = sum(is_known_candidate(item, taste_profile) for item in selected) / max(1, len(selected))
            balance_bonus = 0.42 if (entry["known"] and current_known_ratio < desired_known_ratio) or (not entry["known"] and current_known_ratio > desired_known_ratio) else 0
            artist_penalty = artist_counts[key] * (0.45 + options["artist_variety"] * 0.7)
            return entry["score"] + balance_bonus - artist_penalty

        best_index = max(range(len(pool)), key=lambda index: adjusted(pool[index]))
        if adjusted(pool[best_index]) <= -999:
            break
        entry = pool.pop(best_index)
        track = entry["track"]
        keys = track_identity_keys(track)
        if not keys or any(key in seen_keys for key in keys):
            continue
        seen_keys.update(keys)
        artist_counts[lead_artist_key(track)] += 1
        selected.append(track)
    return sequence_playlist_tracks(selected, features, target_profile)
