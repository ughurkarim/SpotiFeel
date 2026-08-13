from flask import Blueprint

import core


bp = Blueprint("playlists", __name__)


@bp.post("/api/create-playlist/<genre>")
def create(genre):
    """Route boundary for the existing personalized playlist pipeline."""
    return core.create_playlist(genre)
