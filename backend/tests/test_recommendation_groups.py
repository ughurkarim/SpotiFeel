import core


PROFILE = {"energy": 0.62, "valence": 0.5, "danceability": 0.66, "tempo": 112}


def make_track(prefix, index, artist=None):
    artist_id = artist or f"{prefix}-artist-{index % 8}"
    return {
        "id": f"{prefix}-{index}",
        "uri": f"spotify:track:{prefix}-{index}",
        "name": f"{prefix.title()} Song {index}",
        "artists": [{"id": artist_id, "name": artist_id}],
        "album": {"release_date": "2022"},
        "popularity": 45 + index % 45,
    }


def test_recommendation_groups_are_deep_distinct_and_exclude_current(monkeypatch):
    current = make_track("current", 0, artist="current-artist")
    similar = [make_track("similar", index) for index in range(28)]
    artist_catalog = [make_track("catalog", index, artist="current-artist") for index in range(18)]
    taste_tracks = [make_track("taste", index) for index in range(32)]

    def recommendations(_headers, seed_tracks=None, **_kwargs):
        return similar if seed_tracks == [current["id"]] else taste_tracks

    def artist_tracks(_headers, artist_id, limit=12, **_kwargs):
        if artist_id == "current-artist":
            return artist_catalog[:limit]
        return similar[:limit]

    def search(_headers, query, limit=12):
        return artist_catalog[:limit] if 'artist:"current-artist"' in query else taste_tracks[:limit]

    monkeypatch.setattr(core, "spotify_recommendation_candidates", recommendations)
    monkeypatch.setattr(core, "fetch_lastfm_similar_candidates", lambda *_args, **_kwargs: [])
    monkeypatch.setattr(core, "fetch_related_artist_ids", lambda *_args, **_kwargs: [])
    monkeypatch.setattr(core, "fetch_artist_top_tracks", artist_tracks)
    monkeypatch.setattr(core, "search_tracks", search)
    monkeypatch.setattr(
        core,
        "fetch_audio_features",
        lambda _headers, ids: {track_id: PROFILE for track_id in ids},
    )

    taste = {
        "seed_genres": ["pop", "indie"],
        "audio_profile": PROFILE,
        "top_track_ids": ["top-1", "top-2"],
        "top_artist_ids": ["taste-a", "taste-b"],
        "top_tracks": [],
        "recent_tracks": [],
        "known_track_ids": set(),
        "known_artist_ids": {"taste-a"},
    }
    groups = core.build_recommendation_groups({}, current, PROFILE, taste)

    assert [group["id"] for group in groups] == [
        "more-like-this",
        "artist-top-tracks",
        "still-fits-your-taste",
    ]
    assert [len(group["tracks"]) for group in groups] == [12, 12, 12]
    group_ids = [{track["id"] for track in group["tracks"]} for group in groups]
    assert all(current["id"] not in ids for ids in group_ids)
    assert not group_ids[0].intersection(group_ids[1])
    assert not group_ids[0].intersection(group_ids[2])
    assert not group_ids[1].intersection(group_ids[2])


def test_selected_genre_uses_broad_but_relevant_artist_genre_families():
    assert core.genre_family_matches("hip-hop", ["southern hip hop", "trap"])
    assert core.genre_family_matches("edm", ["progressive house"])
    assert core.genre_family_matches("classical", ["baroque", "orchestral performance"])
    assert not core.genre_family_matches("metal", ["indie pop", "neo soul"])
