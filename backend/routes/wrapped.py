from urllib.parse import urlparse

from flask import Blueprint, Response, jsonify, request

import core


bp = Blueprint("wrapped", __name__)


@bp.get("/api/wrapped")
def wrapped_report():
    if not core.spotify_configured():
        return jsonify({"error": "spotify_not_configured"}), 503
    if not core.ensure_token():
        return jsonify({"error": "not_authenticated"}), 401
    force = (request.args.get("force") or "").strip().lower() in {"1", "true", "yes"}
    report, status = core.get_wrapped_report_for_session(
        core.spotify_headers(), request.args.get("time_range"), force=force
    )
    return jsonify(report), status


def _is_allowed_artwork_url(value):
    try:
        parsed = urlparse(value)
    except (TypeError, ValueError):
        return False
    host = (parsed.hostname or "").lower()
    return parsed.scheme == "https" and (
        host == "scdn.co"
        or host.endswith(".scdn.co")
        or host == "spotifycdn.com"
        or host.endswith(".spotifycdn.com")
    )


@bp.get("/api/wrapped/artwork")
def wrapped_artwork():
    if not core.ensure_token():
        return jsonify({"error": "not_authenticated"}), 401
    artwork_url = (request.args.get("url") or "").strip()
    if not _is_allowed_artwork_url(artwork_url):
        return jsonify({"error": "invalid_artwork_url"}), 400

    response = core.http_get(artwork_url)
    final_url = getattr(response, "url", artwork_url)
    content_type = (response.headers.get("Content-Type") or "").split(";", 1)[0].strip().lower()
    if response.status_code != 200 or not _is_allowed_artwork_url(final_url) or not content_type.startswith("image/"):
        return jsonify({"error": "artwork_unavailable"}), 502
    if len(response.content) > 10 * 1024 * 1024:
        return jsonify({"error": "artwork_too_large"}), 413

    proxied = Response(response.content, mimetype=content_type)
    proxied.headers["Cache-Control"] = "private, max-age=3600"
    return proxied
