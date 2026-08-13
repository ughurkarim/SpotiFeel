"""Pure taste-profile presentation derived from listening signals."""


def _energy(value):
    if value is None: return "adaptive"
    if value < 0.32: return "low"
    if value < 0.58: return "medium"
    if value < 0.78: return "high"
    return "intense"


def _mood(value):
    if value is None: return "balanced"
    if value < 0.34: return "dark"
    if value < 0.6: return "balanced"
    return "bright"


def _tempo(value):
    if value is None: return "steady"
    if value < 86: return "slow"
    if value < 116: return "midtempo"
    if value < 138: return "fast"
    return "sprint"


def summarize_taste_profile(profile):
    audio = profile.get("audio_profile") or {}
    genres = profile.get("top_genres") or []
    lead_genre = genres[0][0] if genres else "pop"
    return (
        f"Your recent listening leans {lead_genre} with {_energy(audio.get('energy'))} energy, "
        f"a {_tempo(audio.get('tempo'))} pace, and a {_mood(audio.get('valence'))} mood."
    )
