import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app, raise_server_exceptions=False)

NOT_IMPLEMENTED = [
    ("/api/astronomy/positions", {"observer": {"latitude_deg": -89.9, "longitude_deg": 0},
                                  "time_range": {"start_utc": "2027-01-01T00:00:00Z", "end_utc": "2027-01-02T00:00:00Z"}}),
    ("/api/astronomy/sunlight", {"observer": {"latitude_deg": -89.9, "longitude_deg": 0},
                                 "time_range": {"start_utc": "2027-01-01T00:00:00Z", "end_utc": "2027-01-02T00:00:00Z"}}),
    ("/api/astronomy/earth-visibility", {"observer": {"latitude_deg": 0, "longitude_deg": 0},
                                         "time_range": {"start_utc": "2027-01-01T00:00:00Z", "end_utc": "2027-01-02T00:00:00Z"}}),
    ("/api/terrain/horizon", {"observer": {"latitude_deg": 0, "longitude_deg": 0}}),
    ("/api/missions/recommend", {"candidate_site_ids": ["shackleton"], "search_start_utc": "2027-01-01T00:00:00Z",
                                 "search_end_utc": "2027-02-01T00:00:00Z", "mission_duration_days": 14}),
    ("/api/missions/compare", {"scenarios": [
        {"id": "a", "label": "A", "coordinates": {"latitude_deg": 0, "longitude_deg": 0},
         "landing_time_utc": "2027-01-01T00:00:00Z", "mission_duration_days": 14},
        {"id": "b", "label": "B", "coordinates": {"latitude_deg": 1, "longitude_deg": 1},
         "landing_time_utc": "2027-01-01T00:00:00Z", "mission_duration_days": 14}]}),
]


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["database"] == "disabled"
    assert body["time_utc"].endswith("Z") or body["time_utc"].endswith("+00:00")


def test_sites_list_is_labelled_sample():
    r = client.get("/api/sites")
    assert r.status_code == 200
    body = r.json()
    assert body["data_status"] == "sample"
    assert "Sample" in body["disclaimer"]
    assert body["count"] == len(body["sites"]) >= 1
    assert all(s["provenance"] == "sample" for s in body["sites"])
    ids = [s["id"] for s in body["sites"]]
    assert len(ids) == len(set(ids))
    for s in body["sites"]:
        assert -90 <= s["coordinates"]["latitude_deg"] <= 90
        assert -180 <= s["coordinates"]["longitude_deg"] <= 180


def test_site_categories_and_precision_are_honest():
    sites = client.get("/api/sites").json()["sites"]
    assert {s["category"] for s in sites} == {"historical", "candidate-region", "clps"}
    # Region-level entries must never be presented as exact landing coordinates.
    assert all(s["precision"] == "regional" for s in sites if s["category"] == "candidate-region")
    assert all(s["precision"] != "regional" for s in sites if s["category"] in ("historical", "clps"))
    assert all(s["category"] != "custom" for s in sites)


def test_site_detail_and_404():
    assert client.get("/api/sites/shackleton").json()["id"] == "shackleton"
    r = client.get("/api/sites/nope")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "site_not_found"


@pytest.mark.parametrize("path,payload", NOT_IMPLEMENTED)
def test_scientific_endpoints_return_501_not_fake_data(path, payload):
    r = client.post(path, json=payload)
    assert r.status_code == 501
    assert r.json()["error"]["code"] == "not_implemented"


@pytest.mark.parametrize("path,payload", NOT_IMPLEMENTED)
def test_scientific_endpoints_registered_in_openapi(path, payload):
    assert path in client.get("/api/openapi.json").json()["paths"]


def test_validation_rejects_bad_latitude():
    r = client.post("/api/terrain/horizon", json={"observer": {"latitude_deg": 123, "longitude_deg": 0}})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "validation_error"


def test_validation_requires_utc_timestamps():
    payload = {"observer": {"latitude_deg": 0, "longitude_deg": 0},
               "time_range": {"start_utc": "2027-01-01T00:00:00", "end_utc": "2027-01-02T00:00:00Z"}}
    assert client.post("/api/astronomy/sunlight", json=payload).status_code == 422
    payload["time_range"]["start_utc"] = "2027-01-01T00:00:00+05:30"
    assert client.post("/api/astronomy/sunlight", json=payload).status_code == 422


def test_search_window_must_be_ordered():
    r = client.post("/api/missions/windows", json={
        "site_id": "x", "search_start_utc": "2027-02-01T00:00:00Z",
        "search_end_utc": "2027-01-01T00:00:00Z", "mission_duration_days": 5})
    assert r.status_code == 422


def test_unknown_route_uses_error_envelope():
    r = client.get("/api/does-not-exist")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "not_found"


def test_missions_windows_success():
    payload = {
        "site_id": "shackleton",
        "search_start_utc": "2027-01-01T00:00:00Z",
        "search_end_utc": "2027-02-01T00:00:00Z",
        "mission_duration_days": 14,
    }
    r = client.post("/api/missions/windows", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["method"] == "analytical-ephemeris-v1"
    assert len(data["windows"]) >= 1
    w = data["windows"][0]
    assert "start_utc" in w
    assert "end_utc" in w
    assert 0 <= w["sunlit_fraction"] <= 1
    assert 0 <= w["earth_visible_fraction"] <= 1


def test_missions_windows_site_not_found():
    payload = {
        "site_id": "unknown-crater-xyz",
        "search_start_utc": "2027-01-01T00:00:00Z",
        "search_end_utc": "2027-02-01T00:00:00Z",
        "mission_duration_days": 14,
    }
    r = client.post("/api/missions/windows", json=payload)
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "site_not_found"


def test_missions_timeline_success():
    payload = {
        "site_id": "apollo-11",
        "landing_time_utc": "2027-01-01T00:00:00Z",
        "mission_duration_days": 14,
    }
    r = client.post("/api/missions/timeline", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["site_id"] == "apollo-11"
    assert data["method"] == "analytical-ephemeris-v1"
    assert "sunlight_track" in data
    assert "earth_track" in data
    assert len(data["phases"]) >= 3
    assert len(data["sunlight_track"]["intervals"]) >= 1
    assert len(data["earth_track"]["intervals"]) >= 1


def test_missions_timeline_site_not_found():
    payload = {
        "site_id": "non-existent-site",
        "landing_time_utc": "2027-01-01T00:00:00Z",
        "mission_duration_days": 14,
    }
    r = client.post("/api/missions/timeline", json=payload)
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "site_not_found"


def test_physics_comparison():
    r = client.get("/api/physics/comparison")
    assert r.status_code == 200
    data = r.json()
    assert data["headers"]["earth_gravity"] == "9.81"
    assert data["headers"]["moon_gravity"] == "1.62"

    table = {row["parameter"]: row for row in data["comparison_table"]}
    assert "9.81 m/s²" in table["Gravity"]["earth"]
    assert "1.62 m/s²" in table["Gravity"]["moon"]
    assert table["Relative gravity"]["earth"] == "100%"
    assert table["Relative gravity"]["moon"] == "16.5%"
    assert "588.6 N" in table["Weight of that object"]["earth"]
    assert "97.2 N" in table["Weight of that object"]["moon"]
    assert "11.2 km/s" in table["Escape velocity"]["earth"]
    assert "2.38 km/s" in table["Escape velocity"]["moon"]


def test_physics_gravity_and_orbital_velocity():
    # Test gravity calculation
    g_res = client.post("/api/physics/gravity", json={"mass_kg": 5.972e24, "radius_m": 6.371e6, "object_mass_kg": 60})
    assert g_res.status_code == 200
    assert abs(g_res.json()["gravity_ms2"] - 9.81) < 0.05
    assert abs(g_res.json()["object_weight_n"] - 588.6) < 2.0

    # Test orbital velocity calculation for LEO (450 km)
    v_res = client.post("/api/physics/orbital-velocity", json={"body": "earth", "altitude_km": 450})
    assert v_res.status_code == 200
    v_data = v_res.json()
    assert 7.5 < v_data["orbital_velocity_kms"] < 7.8
    assert 90 < v_data["orbital_period_minutes"] < 100


def test_dsn_stations_and_tracking():
    r = client.get("/api/stations/dsn")
    assert r.status_code == 200
    stations = r.json()
    assert len(stations) == 3
    names = [s["name"] for s in stations]
    assert any("Goldstone" in n for n in names)
    assert any("Madrid" in n for n in names)
    assert any("Canberra" in n for n in names)

    # Test active tracking
    track_r = client.get("/api/stations/dsn/tracking")
    assert track_r.status_code == 200
    track_data = track_r.json()
    assert "primary_tracking_station" in track_data
    assert len(track_data["stations"]) == 3


def test_cors_allows_dev_origin_only():
    ok = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    bad = client.get("/api/health", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in bad.headers
