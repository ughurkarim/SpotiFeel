from recommendations.ranking import (
    decade_bounds,
    dedupe_tracks,
    normalize_genre,
    normalized_track_signature,
    normalize_playlist_options,
    playlist_artist_cap,
    score_audio_similarity,
    score_playlist_candidate,
    select_playlist_tracks,
)


TARGET = {"energy": 0.7, "valence": 0.5, "danceability": 0.8, "tempo": 120}


def track(track_id, artist="artist-a", popularity=50, explicit=False, year=2022, name=None):
    return {
        "id": track_id,
        "uri": f"spotify:track:{track_id}",
        "name": name or f"Song {track_id}",
        "artists": [{"id": artist, "name": artist}],
        "popularity": popularity,
        "explicit": explicit,
        "album": {"release_date": str(year)},
    }


def taste(known_tracks=(), known_artists=()):
    return {"known_track_ids": set(known_tracks), "known_artist_ids": set(known_artists)}


def test_audio_similarity_rewards_closer_profiles():
    close = score_audio_similarity(TARGET, TARGET)
    far = score_audio_similarity({"energy": 0.1, "valence": 1, "danceability": 0.1, "tempo": 55}, TARGET)
    assert close > far
    assert close == 3.25


def test_familiarity_and_discovery_weight_known_tracks_differently():
    known = track("known", artist="known-artist", popularity=85)
    unknown = track("new", artist="new-artist", popularity=20)
    profile = taste({"known"}, {"known-artist"})
    familiar = normalize_playlist_options({"familiarity": 1})
    discovery = normalize_playlist_options({"familiarity": 0})
    assert score_playlist_candidate(known, TARGET, TARGET, profile, familiar) > score_playlist_candidate(unknown, TARGET, TARGET, profile, familiar)
    assert score_playlist_candidate(unknown, TARGET, TARGET, profile, discovery) > score_playlist_candidate(known, TARGET, TARGET, profile, discovery)


def test_clean_and_decade_constraints_are_hard_filters():
    options = normalize_playlist_options({"explicit_mode": "clean"})
    assert score_playlist_candidate(track("x", explicit=True), TARGET, TARGET, taste(), options) == -999
    assert score_playlist_candidate(track("y", year=1999), TARGET, TARGET, taste(), options, (1980, 1989)) == -999
    assert score_playlist_candidate(track("z", year=1985), TARGET, TARGET, taste(), options, (1980, 1989)) > 0


def test_genre_and_playlist_option_normalization():
    assert normalize_genre("R&B") == "r-n-b"
    assert normalize_genre("Indie Rock") == "indie"
    assert normalize_genre("metal", ["pop"]) is None
    assert normalize_playlist_options({"familiarity": 4, "energy_bias": -4, "artist_variety": "bad", "explicit_mode": "unknown"}) == {
        "familiarity": 1,
        "energy_bias": -1,
        "artist_variety": 0.66,
        "explicit_mode": "balanced",
    }
    assert decade_bounds("80s") == (1980, 1989)


def test_selection_deduplicates_and_penalizes_repeated_artists():
    candidates = [track("one"), track("one"), track("two"), track("three", artist="artist-b")]
    assert [item["id"] for item in dedupe_tracks(candidates)] == ["one", "two", "three"]
    features = {item["id"]: TARGET for item in candidates}
    selected = select_playlist_tracks(candidates, features, taste(), normalize_playlist_options({"artist_variety": 1}), TARGET, limit=3)
    assert [item["id"] for item in selected] == ["one", "three", "two"]


def test_release_level_deduplication_removes_remasters_but_keeps_real_variants():
    original = track("original", name="Night Drive")
    remaster = track("remaster", name="Night Drive - 2019 Remastered")
    live = track("live", name="Night Drive - Live at the Forum")
    assert normalized_track_signature(original) == normalized_track_signature(remaster)
    assert normalized_track_signature(original) != normalized_track_signature(live)
    assert [item["id"] for item in dedupe_tracks([original, remaster, live])] == ["original", "live"]


def test_artist_cap_is_two_normally_and_three_for_familiar_heavy_modes():
    normal = normalize_playlist_options({"familiarity": 0.6, "artist_variety": 0.7})
    familiar = normalize_playlist_options({"familiarity": 0.9, "artist_variety": 0.7})
    assert playlist_artist_cap(normal) == 2
    assert playlist_artist_cap(familiar) == 3
    candidates = [track(str(index), artist="favorite") for index in range(5)] + [track("other", artist="other")]
    features = {item["id"]: TARGET for item in candidates}
    selected = select_playlist_tracks(candidates, features, taste(), normal, TARGET, limit=6)
    assert sum(item["artists"][0]["id"] == "favorite" for item in selected) == 2


def test_genre_context_rejects_candidates_without_genre_source_evidence():
    match = track("match", artist="genre-artist")
    match["spotifeel_genre_match"] = 1
    mismatch = track("mismatch", artist="taste-artist", popularity=99)
    options = normalize_playlist_options({})
    features = {"match": TARGET, "mismatch": TARGET}
    selected = select_playlist_tracks(
        [mismatch, match],
        features,
        taste(known_tracks={"mismatch"}, known_artists={"taste-artist"}),
        options,
        TARGET,
        context={"kind": "genre", "value": "jazz"},
    )
    assert [item["id"] for item in selected] == ["match"]


def test_sequence_avoids_same_artist_back_to_back_when_alternatives_exist():
    candidates = [
        track("a1", artist="a"), track("a2", artist="a"),
        track("b1", artist="b"), track("b2", artist="b"),
        track("c1", artist="c"), track("c2", artist="c"),
    ]
    features = {
        item["id"]: {**TARGET, "energy": 0.45 + index * 0.05, "tempo": 95 + index * 5}
        for index, item in enumerate(candidates)
    }
    selected = select_playlist_tracks(
        candidates,
        features,
        taste(),
        normalize_playlist_options({"artist_variety": 1}),
        TARGET,
        limit=6,
    )
    artist_order = [item["artists"][0]["id"] for item in selected]
    assert all(left != right for left, right in zip(artist_order, artist_order[1:]))


def test_large_pool_yields_thirty_unique_tracks_without_artist_dominance():
    candidates = [
        track(str(index), artist=f"artist-{index % 20}", popularity=35 + index % 60)
        for index in range(80)
    ]
    candidates.extend([dict(candidates[0]), track("remaster", artist="artist-0", name="Song 0 - 2024 Remastered")])
    features = {
        item["id"]: {
            "energy": 0.45 + (index % 8) * 0.045,
            "valence": 0.4 + (index % 6) * 0.04,
            "danceability": 0.55 + (index % 5) * 0.05,
            "tempo": 92 + index % 35,
        }
        for index, item in enumerate(candidates)
    }
    selected = select_playlist_tracks(
        candidates,
        features,
        taste(),
        normalize_playlist_options({"artist_variety": 0.8}),
        TARGET,
        limit=30,
    )
    ids = [item["id"] for item in selected]
    artist_counts = {}
    for item in selected:
        artist = item["artists"][0]["id"]
        artist_counts[artist] = artist_counts.get(artist, 0) + 1
    assert len(ids) == 30
    assert len(ids) == len(set(ids))
    assert max(artist_counts.values()) <= 2
