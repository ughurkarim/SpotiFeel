"""Pure Wrapped score and personality calculations."""

import time

from recommendations.ranking import clamp, release_year


def build_discovery_score(top_tracks, top_genres):
    if not top_tracks:
        return {"score": 0, "label": "Waiting for Data", "detail": "Generate a report after Spotify has enough top tracks for this range.", "parts": {}}
    artist_mentions = [artist.get("id") or artist.get("name") for track in top_tracks for artist in track.get("artists") or [] if artist.get("id") or artist.get("name")]
    artist_ratio = len(set(artist_mentions)) / max(1, len(artist_mentions))
    genre_ratio = min(len(top_genres) / 12, 1)
    current_year = int(time.strftime("%Y"))
    years = [release_year(track) for track in top_tracks]
    fresh_ratio = len([year for year in years if year and year >= current_year - 3]) / max(1, len(top_tracks))
    popularities = [track.get("popularity") for track in top_tracks if track.get("popularity") is not None]
    underground_ratio = clamp((100 - sum(popularities) / len(popularities)) / 100, 0, 1) if popularities else 0.35
    score = round((genre_ratio * 0.36 + artist_ratio * 0.34 + fresh_ratio * 0.18 + underground_ratio * 0.12) * 100)
    label = "Deep Explorer" if score >= 76 else "Curious Curator" if score >= 58 else "Selective Explorer" if score >= 38 else "Comfort Listener"
    return {
        "score": score, "label": label,
        "detail": "Based on genre range, artist variety, newer releases, and how deep-cut your top tracks skew.",
        "parts": {"genre_variety": round(genre_ratio * 100), "artist_variety": round(artist_ratio * 100), "freshness": round(fresh_ratio * 100), "deep_cuts": round(underground_ratio * 100)},
    }


def build_listening_personality(top_genres, discovery, audio_profile):
    lead = (top_genres[0]["name"] if top_genres else "").lower()
    profile = audio_profile or {}
    energy, valence, danceability = profile.get("energy", 0.54), profile.get("valence", 0.5), profile.get("danceability", 0.58)
    if len(top_genres) >= 10 and discovery.get("score", 0) >= 70:
        return {"title": "The Genre Nomad", "detail": "You move across scenes quickly and let curiosity steer the queue."}
    if energy >= 0.76 and danceability >= 0.7:
        return {"title": "The Aux Commander", "detail": "Your report leans kinetic, confident, and ready to take over a room."}
    if valence <= 0.36:
        return {"title": "The Midnight Curator", "detail": "You collect mood, atmosphere, and songs that sound better after dark."}
    if any(term in lead for term in ("hip", "rap", "trap", "r-n-b", "r&b")):
        return {"title": "The Rhythm Loyalist", "detail": "Your taste is built around bounce, cadence, and repeatable hooks."}
    if any(term in lead for term in ("indie", "folk", "acoustic", "alternative")):
        return {"title": "The Deep Cut Romantic", "detail": "You gravitate toward texture, lyrics, and artists that feel handpicked."}
    if any(term in lead for term in ("rock", "metal", "punk")):
        return {"title": "The Volume Architect", "detail": "Your listening has edge, momentum, and a clear sense of impact."}
    if any(term in lead for term in ("pop", "dance", "edm", "house")):
        return {"title": "The Main Character DJ", "detail": "Your top songs are polished, vivid, and built for instant replay."}
    return {"title": "The Taste Architect", "detail": "Your report balances familiar anchors with enough range to feel personal."}
