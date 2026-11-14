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
    ("/api/missions/windows", {"site_id": "shackleton", "search_start_utc": "2027-01-01T00:00:00Z",
                               "search_end_utc": "2027-02-01T00:00:00Z", "mission_duration_days": 14}),
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


def test_cors_allows_dev_origin_only():
    ok = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    bad = client.get("/api/health", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in bad.headers
