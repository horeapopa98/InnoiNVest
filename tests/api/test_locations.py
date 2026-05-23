def test_search_returns_matching_locations(client):
    r = client.get("/locations", params={"q": "flor"})
    assert r.status_code == 200
    body = r.json()
    assert any(item["siruta_code"] == "4324" for item in body)


def test_search_is_diacritic_insensitive(client):
    r = client.get("/locations", params={"q": "FLOR"})
    assert r.status_code == 200
    assert any(item["name"] == "Floresti" for item in r.json())


def test_get_one_location(client):
    r = client.get("/locations/4324")
    assert r.status_code == 200
    assert r.json()["name"] == "Floresti"


def test_get_unknown_location_returns_404(client):
    r = client.get("/locations/99999")
    assert r.status_code == 404
