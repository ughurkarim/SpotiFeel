import requests
from flask import Blueprint, jsonify

import core


bp = Blueprint("recommendations", __name__)


@bp.get("/api/recommendations")
def recommendations():
    try:
        if not core.ensure_token(force_refresh=True):
            return jsonify({"error": "not_authenticated"}), 401
        headers = core.spotify_headers()
        current_item, _payload, status = core.get_current_track_item(force=False)
        if status == 401:
            return jsonify({"error": "not_authenticated"}), 401
        if status != 200 or not current_item:
            return jsonify({"error": "no_active_track", "message": "Play a song to build recommendations."}), 409

        allowed_genres = core.fetch_available_genre_seeds(headers)
        taste = core.build_user_taste_profile(headers, allowed_genres=allowed_genres)
        track_id = current_item.get("id")
        profile = core.fetch_audio_features(headers, [track_id]).get(track_id) if track_id else None
        groups = list(core.build_recommendation_groups(headers, current_item, profile, taste))
        if not groups:
            groups = list(core.build_lastfm_recommendation_groups(headers, current_item, current_profile=profile))
        if len(groups) < 2:
            existing = {group.get("id") for group in groups}
            groups.extend(group for group in core.build_fallback_recommendation_groups(headers, current_item, taste) if group.get("id") not in existing)
        if not groups:
            return jsonify({"error": "no_recommendations", "message": "No recommendations are available for this track."}), 404
        return jsonify({
            "based_on": {"track": current_item.get("name"), "artist": ((current_item.get("artists") or [{}])[0].get("name") or "")},
            "profile_summary": f'Tracks curated because you listened to "{current_item.get("name", "this track")}".',
            "groups": groups,
        })
    except requests.RequestException:
        core.app.logger.exception("Recommendation provider request failed")
        return jsonify({"error": "recommendations_unavailable", "message": "Recommendations are temporarily unavailable."}), 502
    except Exception:
        core.app.logger.exception("Unexpected recommendation failure")
        return jsonify({"error": "recommendations_unavailable", "message": "Recommendations are temporarily unavailable."}), 500
