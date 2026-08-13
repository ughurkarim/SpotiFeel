from flask import Blueprint, jsonify, request

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
