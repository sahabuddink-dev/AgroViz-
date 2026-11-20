"""
Unit and Integration tests for Spatial Field Management API (Phase 8).
Tests CRUD operations, GeoJSON polygon validation, geodesic area calculation,
and scientific separation between Akola research demo and user farm fields.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.fields import AKOLA_DEMO_ID, FIELDS_FILE_PATH, calculate_polygon_area_ha

client = TestClient(app)


@pytest.fixture(autouse=True)
def cleanup_user_fields():
    """Ensure data/fields/fields.json is clean before and after each test."""
    if FIELDS_FILE_PATH.exists():
        FIELDS_FILE_PATH.unlink()
    yield
    if FIELDS_FILE_PATH.exists():
        FIELDS_FILE_PATH.unlink()


def test_list_fields_includes_akola_demo():
    """Verify GET /api/fields always returns the built-in Akola Research Demo."""
    response = client.get("/api/fields")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["provenance"] == "calculated"

    fields = json_data["data"]
    assert len(fields) >= 1
    demo = fields[0]
    assert demo["id"] == AKOLA_DEMO_ID
    assert demo["is_demo"] is True
    assert demo["field_type"] == "research_aoi"
    assert "Akola Cotton Research Zone" in demo["name"]
    assert demo["centroid"]["latitude"] == 20.7069
    assert demo["centroid"]["longitude"] == 77.0022
    assert demo["area_hectares"] > 31000  # ~31,365 ha


def test_akola_demo_data_availability():
    """Verify Akola demo explicitly details all available baseline research models."""
    response = client.get(f"/api/fields/{AKOLA_DEMO_ID}")
    assert response.status_code == 200
    field = response.json()["data"]

    avail = field["data_availability"]
    assert avail["weather"]["available"] is True
    assert avail["soil_moisture"]["available"] is True
    assert avail["soil_properties"]["available"] is True
    assert avail["crop_indices"]["available"] is True
    assert avail["pbw_phenology"]["available"] is True
    assert "July 2023" in field["data_availability"]["crop_indices"]["monsoon_cloud_gaps"]


def test_create_valid_user_field():
    """Verify POST /api/fields registers a valid farm boundary and calculates area."""
    # A ~100m x ~100m agricultural parcel near Akola (approx 1 hectare)
    polygon = {
        "type": "Polygon",
        "coordinates": [
            [
                [77.0100, 20.7100],
                [77.0110, 20.7100],
                [77.0110, 20.7110],
                [77.0100, 20.7110],
                [77.0100, 20.7100],
            ]
        ],
    }

    payload = {
        "name": "Shri Ram Cotton Plot 1",
        "crop_type": "Cotton (Desi)",
        "location": "Near Borgaon Manju, Akola",
        "boundary": polygon,
        "sowing_date": "2024-06-20",
    }

    response = client.post("/api/fields", json=payload)
    assert response.status_code == 201
    created = response.json()["data"]

    assert created["id"].startswith("field_")
    assert created["id"] != AKOLA_DEMO_ID
    assert created["name"] == "Shri Ram Cotton Plot 1"
    assert created["is_demo"] is False
    assert created["field_type"] == "farm_boundary"
    assert created["area_hectares"] > 0.5  # Approx ~1.1 ha
    assert created["area_acres"] > 1.0
    assert created["sowing_date"] == "2024-06-20"

    # Crucial scientific check: user field data availability must be unavailable until uploaded
    avail = created["data_availability"]
    assert avail["weather"]["available"] is False
    assert avail["weather"]["status"] == "unavailable"
    assert avail["crop_indices"]["available"] is False
    assert avail["soil_moisture"]["available"] is False


def test_get_field_by_id():
    """Verify retrieving a single field by ID and 404 for nonexistent ID."""
    # Nonexistent
    res_404 = client.get("/api/fields/nonexistent_field_id")
    assert res_404.status_code == 404

    # Create and retrieve
    poly = {
        "type": "Polygon",
        "coordinates": [
            [
                [77.00, 20.70],
                [77.02, 20.70],
                [77.02, 20.72],
                [77.00, 20.72],
                [77.00, 20.70],
            ]
        ],
    }
    create_res = client.post("/api/fields", json={"name": "Test Field B", "boundary": poly})
    f_id = create_res.json()["data"]["id"]

    get_res = client.get(f"/api/fields/{f_id}")
    assert get_res.status_code == 200
    assert get_res.json()["data"]["id"] == f_id


def test_update_user_field():
    """Verify updating name, crop type, and sowing date on user field."""
    poly = {
        "type": "Polygon",
        "coordinates": [
            [
                [77.00, 20.70],
                [77.02, 20.70],
                [77.02, 20.72],
                [77.00, 20.72],
                [77.00, 20.70],
            ]
        ],
    }
    create_res = client.post("/api/fields", json={"name": "Initial Name", "boundary": poly})
    f_id = create_res.json()["data"]["id"]

    update_res = client.put(
        f"/api/fields/{f_id}",
        json={"name": "Updated Name", "crop_type": "Soybean", "sowing_date": "2024-07-05"},
    )
    assert update_res.status_code == 200
    updated = update_res.json()["data"]
    assert updated["name"] == "Updated Name"
    assert updated["crop_type"] == "Soybean"
    assert updated["sowing_date"] == "2024-07-05"


def test_cannot_modify_or_delete_akola_demo():
    """Verify HTTP 403 Forbidden when attempting to update or delete Akola Demo."""
    # Attempt update
    put_res = client.put(f"/api/fields/{AKOLA_DEMO_ID}", json={"name": "Modified Demo"})
    assert put_res.status_code == 403

    # Attempt delete
    del_res = client.delete(f"/api/fields/{AKOLA_DEMO_ID}")
    assert del_res.status_code == 403


def test_delete_user_field():
    """Verify deleting a user field."""
    poly = {
        "type": "Polygon",
        "coordinates": [
            [
                [77.00, 20.70],
                [77.02, 20.70],
                [77.02, 20.72],
                [77.00, 20.72],
                [77.00, 20.70],
            ]
        ],
    }
    create_res = client.post("/api/fields", json={"name": "To Delete", "boundary": poly})
    f_id = create_res.json()["data"]["id"]

    del_res = client.delete(f"/api/fields/{f_id}")
    assert del_res.status_code == 200
    assert del_res.json()["data"]["deleted"] is True

    # Subsequent GET returns 404
    get_res = client.get(f"/api/fields/{f_id}")
    assert get_res.status_code == 404


def test_reject_invalid_geometry():
    """Verify 422 Unprocessable Entity on various invalid GeoJSON geometries."""
    # 1. Non-Polygon type
    res1 = client.post(
        "/api/fields",
        json={"name": "Point Field", "boundary": {"type": "Point", "coordinates": [77.0, 20.7]}},
    )
    assert res1.status_code == 422

    # 2. Too few vertices (< 4)
    res2 = client.post(
        "/api/fields",
        json={
            "name": "Line Field",
            "boundary": {
                "type": "Polygon",
                "coordinates": [[[77.0, 20.7], [77.1, 20.8], [77.0, 20.7]]],
            },
        },
    )
    assert res2.status_code == 422

    # 3. Latitude out of bounds (> 90)
    res3 = client.post(
        "/api/fields",
        json={
            "name": "Invalid Lat",
            "boundary": {
                "type": "Polygon",
                "coordinates": [
                    [[77.0, 95.0], [77.1, 95.0], [77.1, 95.1], [77.0, 95.1], [77.0, 95.0]]
                ],
            },
        },
    )
    assert res3.status_code == 422

    # 4. Longitude out of bounds (> 180)
    res4 = client.post(
        "/api/fields",
        json={
            "name": "Invalid Lon",
            "boundary": {
                "type": "Polygon",
                "coordinates": [
                    [[190.0, 20.0], [190.1, 20.0], [190.1, 20.1], [190.0, 20.1], [190.0, 20.0]]
                ],
            },
        },
    )
    assert res4.status_code == 422


def test_accepts_feature_and_feature_collection():
    """Verify tolerance when user pastes GeoJSON Feature or FeatureCollection."""
    feature = {
        "type": "Feature",
        "properties": {"name": "Test Feature"},
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [77.00, 20.70],
                    [77.01, 20.70],
                    [77.01, 20.71],
                    [77.00, 20.71],
                    [77.00, 20.70],
                ]
            ],
        },
    }

    res = client.post("/api/fields", json={"name": "Feature Wrapped Field", "boundary": feature})
    assert res.status_code == 201
    assert res.json()["data"]["area_hectares"] > 0
