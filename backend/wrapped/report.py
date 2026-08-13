"""Wrapped report range contracts kept independent from HTTP handlers."""


TIME_RANGES = {
    "short_term": {"label": "Last 4 Weeks", "slug": "4-weeks", "summary_label": "four-week", "spotify_value": "short_term"},
    "medium_term": {"label": "Last 6 Months", "slug": "6-months", "summary_label": "six-month", "spotify_value": "medium_term"},
    "long_term": {"label": "All Time", "slug": "all-time", "summary_label": "all-time", "spotify_value": "long_term"},
}


def resolve_time_range(value):
    requested = (value or "short_term").strip()
    return requested if requested in TIME_RANGES else "short_term"
