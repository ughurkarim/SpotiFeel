from datetime import datetime

from flask import Blueprint, jsonify, request

import core


bp = Blueprint("playback", __name__)


@bp.get("/api/now-playing")
def now_playing():
    payload, status = core.get_current_playback_payload(force=False)
    if status == 401:
        return jsonify({"error": "not_authenticated"}), 401
    if status == 204:
        return jsonify({"playing": False})
    return jsonify(payload), status


@bp.get("/api/recently-played")
def recently_played():
    if not core.ensure_token(force_refresh=True):
        return jsonify({"error": "not_authenticated"}), 401
    try:
        limit = max(1, min(50, int(request.args.get("limit", 50))))
    except (TypeError, ValueError):
        limit = 50
    try:
        after_ms = max(0, int(request.args.get("after", "")))
    except (TypeError, ValueError):
        after_ms = None

    items = []
    payload = {}
    params = {"limit": limit}
    seen_cursors = set()
    max_pages = 20 if after_ms is not None else 1

    for _ in range(max_pages):
        response = core.http_get(
            "https://api.spotify.com/v1/me/player/recently-played",
            headers=core.spotify_headers(),
            params=params,
        )
        page = core.safe_json(response)
        if response.status_code != 200 or page is None:
            if items:
                break
            core.app.logger.warning("Spotify recent tracks failed with status %s", response.status_code)
            return jsonify({"error": "recent_tracks_unavailable", "message": "Recent listening is temporarily unavailable."}), 502

        payload = page
        page_items = page.get("items") or []
        items.extend(page_items)
        if after_ms is None or not page_items:
            break

        played_times = []
        for item in page_items:
            try:
                played_at = datetime.fromisoformat((item.get("played_at") or "").replace("Z", "+00:00"))
                played_times.append(int(played_at.timestamp() * 1000))
            except (TypeError, ValueError):
                continue
        if played_times and min(played_times) <= after_ms:
            break

        before = (page.get("cursors") or {}).get("before")
        if not before or before in seen_cursors:
            break
        seen_cursors.add(before)
        params = {"limit": limit, "before": before}

    unique_items = {}
    for item in items:
        played_at = item.get("played_at") or ""
        if after_ms is not None:
            try:
                played_ms = int(datetime.fromisoformat(played_at.replace("Z", "+00:00")).timestamp() * 1000)
            except (TypeError, ValueError):
                continue
            if played_ms < after_ms:
                continue
        track = item.get("track") or {}
        track_key = track.get("id") or track.get("uri") or track.get("name") or "track"
        unique_items[f"{played_at}:{track_key}"] = item

    result = dict(payload)
    result["items"] = sorted(unique_items.values(), key=lambda item: item.get("played_at") or "", reverse=True)
    return jsonify(result)


@bp.post("/api/player/toggle")
def toggle():
    if not core.ensure_token(force_refresh=True):
        return jsonify({"error": "not_authenticated"}), 401
    headers = core.spotify_headers()
    current = core.http_get("https://api.spotify.com/v1/me/player/currently-playing", headers=headers)
    if current.status_code == 204:
        return jsonify({"error": "no_active_playback", "message": "Open Spotify on an active device first."}), 409
    if current.status_code != 200:
        core.app.logger.warning("Spotify playback state failed with status %s", current.status_code)
        return jsonify({"error": "playback_unavailable", "message": "Spotify playback is temporarily unavailable."}), 502
    currently_playing = bool((core.safe_json(current) or {}).get("is_playing"))
    endpoint = "pause" if currently_playing else "play"
    response = core.http_put(f"https://api.spotify.com/v1/me/player/{endpoint}", headers=headers)
    if response.status_code not in (200, 202, 204):
        core.app.logger.warning("Spotify playback toggle failed with status %s", response.status_code)
        return jsonify({"error": "playback_unavailable", "message": "Spotify needs an active playback device."}), 409
    return jsonify({"playing": not currently_playing})


@bp.put("/api/player/play")
def play():
    if not core.ensure_token(force_refresh=True):
        return jsonify({"error": "not_authenticated"}), 401
    uri = ((request.get_json(silent=True) or {}).get("uri") or "").strip()
    if not uri.startswith("spotify:track:"):
        return jsonify({"error": "invalid_uri", "message": "A valid Spotify track is required."}), 400
    response = core.http_put(
        "https://api.spotify.com/v1/me/player/play",
        headers=core.spotify_headers(json_body=True),
        json={"uris": [uri]},
    )
    if response.status_code not in (200, 202, 204):
        core.app.logger.warning("Spotify play request failed with status %s", response.status_code)
        return jsonify({"error": "playback_unavailable", "message": "Spotify needs an active playback device."}), 409
    return jsonify({"playing": True, "uri": uri})
