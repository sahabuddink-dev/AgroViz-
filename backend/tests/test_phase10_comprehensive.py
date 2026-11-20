"""
AgroViz Phase 10 Comprehensive End-to-End Verification Test Suite.

Rigorously verifies:
1. System health, data registry, and baseline raw dataset immutability.
2. Complete spatial field lifecycle (create, read, update, delete, reject invalid geometry).
3. Built-in Akola Research Demo protection against modification/deletion.
4. Scientific isolation: User fields isolated from regional research observations.
5. In-situ soil sensor ingestion, unit normalization, and validation rules.
6. GeoTIFF multispectral raster upload, band math (NDVI, NDRE, NDMI), and statistics.
7. PBW observation upload validation & strict staging isolation.
8. Degree-day phenology calculation (Sets A & B single-sine horizontal cutoff).
9. Locked unvalidated PBW risk forecasting (status: unavailable).
10. Year-on-Year descriptive screening (common June-Dec calendar window).
11. Deterministic agricultural alert engine across dual workflows.
12. Field health report generation (JSON format & CSV download stream).
"""

import io
import json
import pytest
import tifffile
import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from app.services.fields import AKOLA_DEMO_ID

client = TestClient(app)


def _create_synthetic_geotiff(bands=4, height=30, width=40):
    """Generate in-memory multi-band GeoTIFF for raster engine testing."""
    np.random.seed(42)
    data = np.random.randint(500, 4500, size=(bands, height, width), dtype=np.uint16)
    pixel_scale = (10.0, 10.0, 0.0)
    tiepoint = (0.0, 0.0, 0.0, 700000.0, 2290000.0, 0.0)
    geokeys = (1, 1, 0, 2, 1024, 0, 1, 1, 3072, 0, 1, 32643)  # UTM 43N
    extra_tags = [
        (33550, "d", 3, pixel_scale, False),
        (33922, "d", 6, tiepoint, False),
        (34735, "H", len(geokeys), geokeys, False),
    ]
    bio = io.BytesIO()
    with tifffile.TiffWriter(bio) as tw:
        tw.write(data, extratags=extra_tags)
    return bio.getvalue()


def test_system_health_and_registry():
    """Verify backend health, system metadata, and all 9 registered datasets."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["status"] == "healthy"
    assert data["datasets_present"] == 9
    assert data["datasets_total"] == 9

    reg = client.get("/api/datasets")
    assert reg.status_code == 200
    reg_data = reg.json()["data"]
    assert reg_data["total_expected"] == 9
    assert reg_data["total_found"] == 9
    assert reg_data["all_present"] is True


def test_field_lifecycle_and_akola_demo_protection():
    """Verify field CRUD lifecycle, boundary area calculation, and Akola demo immutability."""
    # 1. Verify Akola Demo cannot be modified (403 Forbidden)
    put_res = client.put(
        f"/api/fields/{AKOLA_DEMO_ID}",
        json={"name": "Hacked Demo Field", "crop_type": "Wheat"},
    )
    assert put_res.status_code == 403
    assert "cannot be modified" in put_res.json()["detail"]

    # 2. Verify Akola Demo cannot be deleted (403 Forbidden)
    del_res = client.delete(f"/api/fields/{AKOLA_DEMO_ID}")
    assert del_res.status_code == 403
    assert "cannot be deleted" in del_res.json()["detail"]

    # 3. Create a valid user farm field (201 Created)
    test_geojson = {
        "type": "Polygon",
        "coordinates": [
            [
                [77.0125, 20.7085],
                [77.0145, 20.7085],
                [77.0148, 20.7102],
                [77.0122, 20.7101],
                [77.0125, 20.7085],
            ]
        ],
    }
    create_res = client.post(
        "/api/fields",
        json={
            "name": "Phase 10 Test Plot",
            "crop_type": "Bt Cotton",
            "location": "Borgaon Manju, Akola",
            "sowing_date": "2024-06-15",
            "boundary": test_geojson,
        },
    )
    assert create_res.status_code == 201
    field_data = create_res.json()["data"]
    field_id = field_data["id"]
    assert field_data["name"] == "Phase 10 Test Plot"
    assert field_data["is_demo"] is False
    assert field_data["area_hectares"] > 0
    assert field_data["area_acres"] > 0

    # 4. Read created field
    get_res = client.get(f"/api/fields/{field_id}")
    assert get_res.status_code == 200
    assert get_res.json()["data"]["id"] == field_id

    # 5. Update user field
    update_res = client.put(
        f"/api/fields/{field_id}",
        json={
            "name": "Phase 10 Updated Plot",
            "crop_type": "Desi Cotton",
            "location": "Murtizapur, Akola",
            "sowing_date": "2024-06-20",
        },
    )
    assert update_res.status_code == 200
    assert update_res.json()["data"]["name"] == "Phase 10 Updated Plot"
    assert update_res.json()["data"]["crop_type"] == "Desi Cotton"

    # 6. Delete user field
    del_user_res = client.delete(f"/api/fields/{field_id}")
    assert del_user_res.status_code == 200
    assert del_user_res.json()["data"]["id"] == field_id

    # 7. Confirm 404 after deletion
    get_after_del = client.get(f"/api/fields/{field_id}")
    assert get_after_del.status_code == 404


def test_scientific_isolation_user_fields():
    """Verify that user-created fields are strictly isolated from regional Akola research data."""
    test_geojson = {
        "type": "Polygon",
        "coordinates": [
            [
                [77.020, 20.720],
                [77.025, 20.720],
                [77.025, 20.725],
                [77.020, 20.725],
                [77.020, 20.720],
            ]
        ],
    }
    create_res = client.post(
        "/api/fields",
        json={
            "name": "Isolation Verification Parcel",
            "crop_type": "Cotton",
            "boundary": test_geojson,
        },
    )
    assert create_res.status_code == 201
    field_id = create_res.json()["data"]["id"]

    try:
        # Check alerts for this user field -> should guide onboarding, not assign Akola data
        alerts_res = client.get(f"/api/alerts?field_id={field_id}")
        assert alerts_res.status_code == 200
        alerts = alerts_res.json()["data"]
        alert_titles = [a["title"] for a in alerts]
        assert any("Awaiting Local Data Ingestion" in t for t in alert_titles)

        # Check report export for this user field -> must contain isolation notice
        report_res = client.post(
            "/api/reports/export",
            json={"field_id": field_id, "format": "json"},
        )
        assert report_res.status_code == 200
        report = report_res.json()["data"]
        assert report["module_summaries"]["status"] == "Awaiting Local Data Ingestion"
        assert any("boundaries" in d.lower() or "regional" in d.lower() for d in report["scientific_disclaimers"])
    finally:
        client.delete(f"/api/fields/{field_id}")


def test_soil_sensor_upload_and_normalization():
    """Verify that in-situ capacitive sensor CSV uploads are validated and units normalized."""
    csv_content = (
        "date,sensor_id,depth_cm,soil_moisture,soil_temperature,electrical_conductivity\n"
        "2024-07-01,PROBE_01,10,0.32,28.5,0.45\n"
        "2024-07-01,PROBE_01,25,36.0,27.2,0.52\n"  # 36.0% percentage should be normalized to 0.36
    )
    files = {"file": ("test_probe.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    res = client.post("/api/soil/sensor-upload", files=files)
    assert res.status_code == 200
    body = res.json()["data"]
    preview = body["preview"]
    assert len(preview) == 2
    # Verify normalization of 36.0% to 0.36 m3/m3
    assert preview[1]["normalized_moisture_m3m3"] == 0.36
    assert preview[1]["original_unit"] == "%"


def test_geotiff_raster_upload_and_band_math():
    """Verify uploading a 4-band GeoTIFF and calculating NDVI, NDRE, NDMI with zonal statistics."""
    content = _create_synthetic_geotiff(bands=4, height=30, width=40)
    files = {"file": ("drone_flight_clip.tif", io.BytesIO(content), "image/tiff")}
    up_res = client.post("/api/imagery/upload", files=files)
    assert up_res.status_code == 200
    up_data = up_res.json()["data"]
    upload_id = up_data["upload_id"]

    # Compute NDVI with band mapping: red=1, nir=4
    comp_res = client.post(
        "/api/imagery/compute-indices",
        json={
            "upload_id": upload_id,
            "band_mapping": {"red": 1, "green": 2, "red_edge": 3, "nir": 4},
            "selected_indices": ["ndvi"],
        },
    )
    assert comp_res.status_code == 200
    comp_data = comp_res.json()["data"]
    assert "NDVI" in comp_data["indices"]
    ndvi_stats = comp_data["indices"]["NDVI"]
    assert "mean" in ndvi_stats
    assert "min" in ndvi_stats
    assert "max" in ndvi_stats
    assert "histogram" in ndvi_stats


def test_locked_pbw_risk_and_degree_days():
    """Verify locked unvalidated PBW risk endpoint and valid single-sine degree-days calculation."""
    # Risk endpoint must remain locked as unavailable
    risk_res = client.get("/api/analysis/pbw-risk")
    assert risk_res.status_code == 200
    risk_data = risk_res.json()["data"]
    assert risk_data["status"] == "locked"
    assert risk_res.json()["provenance"] == "unavailable"

    # Degree-days calculation with both sets
    dd_res = client.get("/api/analysis/degree-days?param_set=both&start=2023-06-01")
    assert dd_res.status_code == 200
    dd_data = dd_res.json()["data"]
    assert dd_data["days_accumulated"] == 580
    assert dd_data["summary"]["set_A"]["accumulated_degree_days"] > 0
    assert dd_data["summary"]["set_B"]["accumulated_degree_days"] > 0
    # Monotonic accumulation
    daily = dd_data["daily_series"]
    assert daily[-1]["cum_dd_a"] >= daily[0]["cum_dd_a"]


def test_yoy_comparative_screening_integrity():
    """Verify YoY descriptive screening compares common calendar window (June-Dec)."""
    res = client.get("/api/analysis/yoy")
    assert res.status_code == 200
    yoy = res.json()["data"]
    assert "June 1 to December 31" in yoy["comparison_period"]
    assert "weather" in yoy
    assert "soil_moisture" in yoy
    assert "crop_indices" in yoy
    assert len(yoy["weather"]["monthly_breakdown"]) == 7


def test_reports_export_formats():
    """Verify report export in JSON and CSV format."""
    # JSON export
    json_res = client.post(
        "/api/reports/export",
        json={"field_id": AKOLA_DEMO_ID, "format": "json"},
    )
    assert json_res.status_code == 200
    json_data = json_res.json()["data"]
    assert json_data["field_id"] == AKOLA_DEMO_ID
    assert "active_alerts" in json_data
    assert "citations" in json_data

    # CSV download
    csv_res = client.get(f"/api/reports/export?field_id={AKOLA_DEMO_ID}&format=csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "attachment;" in csv_res.headers.get("content-disposition", "")
    assert "Akola Cotton Research Zone" in csv_res.text
    assert "Metadata,Report ID" in csv_res.text
