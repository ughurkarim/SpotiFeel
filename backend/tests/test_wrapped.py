from wrapped.personality import build_discovery_score, build_listening_personality


def test_empty_discovery_score_is_stable():
    result = build_discovery_score([], [])
    assert result["score"] == 0
    assert result["label"] == "Waiting for Data"


def test_high_energy_profile_maps_to_aux_commander():
    personality = build_listening_personality(
        [{"name": "dance"}], {"score": 50}, {"energy": 0.9, "valence": 0.7, "danceability": 0.85}
    )
    assert personality["title"] == "The Aux Commander"


def test_diverse_high_discovery_profile_takes_priority():
    genres = [{"name": f"genre-{index}"} for index in range(10)]
    personality = build_listening_personality(genres, {"score": 75}, {"energy": 0.9, "danceability": 0.9})
    assert personality["title"] == "The Genre Nomad"
