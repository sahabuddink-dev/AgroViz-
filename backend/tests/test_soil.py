"""
Automated unit and integration tests for Soil Conditions module.
Tests ERA5-Land 3-layer soil moisture, correlations, SoilGrids 30-row profile,
USDA texture classification, CSV sensor template, and schema/unit validation.
"""

import io
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_soil_moisture_endpoint_all_records():
    """Verify GET /api/soil/moisture returns all 580 daily records across 3 depths."""
    resp = client.get("/api/soil/moisture")
    assert resp.status_code == 200
    data = resp.json()

    assert data["provenance"] == "model_estimated"
    assert "ERA5-Land" in data["source"]
    assert data["units"] == "m³/m³ (presumed)"
    assert data["period"] == "2023-06-01 to 2024-12-31"

    body = data["data"]
    assert body["total_records"] == 580
    assert body["start_date"] == "2023-06-01"
    assert body["end_date"] == "2024-12-31"

    # Verify 3 layer statistics
    stats = body["statistics"]
    assert "layer1" in stats
    assert "layer2" in stats
    assert "layer3" in stats

    assert stats["layer1"]["depth_range"] == "0–7 cm"
    assert stats["layer2"]["depth_range"] == "7–28 cm"
    assert stats["layer3"]["depth_range"] == "28–100 cm"

    # Verify realistic physical volumetric water ranges
    for layer in ["layer1", "layer2", "layer3"]:
        assert 0.20 <= stats[layer]["min"] <= 0.35
        assert 0.45 <= stats[layer]["max"] <= 0.55
        assert 0.30 <= stats[layer]["mean"] <= 0.45

    # Check records sample
    records = body["records"]
    assert len(records) == 580
    first = records[0]
    assert "date" in first
    assert "sm_layer1" in first
    assert "sm_layer2" in first
    assert "sm_layer3" in first


def test_soil_moisture_correlations():
    """Verify layer-to-layer correlations match physical and literature expectations."""
    resp = client.get("/api/soil/moisture")
    assert resp.status_code == 200
    corrs = resp.json()["data"]["correlations"]

    # Layer 1 & 2 are highly correlated (~0.95-0.96)
    assert 0.90 <= corrs["layer1_layer2"] <= 0.98
    # Layer 1 & 3 have lower correlation (~0.71)
    assert 0.65 <= corrs["layer1_layer3"] <= 0.78
    # Layer 2 & 3 correlation (~0.82)
    assert 0.75 <= corrs["layer2_layer3"] <= 0.88


def test_soil_moisture_date_filter():
    """Verify date filtering works correctly on soil moisture series."""
    resp = client.get("/api/soil/moisture?start=2023-07-01&end=2023-09-30")
    assert resp.status_code == 200
    data = resp.json()["data"]
    # July (31) + August (31) + September (30) = 92 days
    assert data["total_records"] == 92
    assert data["start_date"] == "2023-07-01"
    assert data["end_date"] == "2023-09-30"


def test_soil_moisture_invalid_date_range():
    """Verify 400 error when date filter contains no observations."""
    resp = client.get("/api/soil/moisture?start=2025-01-01&end=2025-02-01")
    assert resp.status_code == 400


def test_soil_properties_endpoint():
    """Verify GET /api/soil/properties returns 30-row SoilGrids profile and Clay texture."""
    resp = client.get("/api/soil/properties")
    assert resp.status_code == 200
    data = resp.json()

    assert data["provenance"] == "model_estimated"
    assert "SoilGrids" in data["source"]
    assert "Static" in data["period"]

    body = data["data"]
    assert body["total_profile_records"] == 30
    assert body["overall_texture"] == "Clay"

    # Verify all 6 depths are represented
    depths = list(body["texture_by_depth"].keys())
    assert len(depths) == 6
    assert "0–5 cm" in depths
    assert "100–200 cm" in depths

    # Verify properties
    profiles = body["depth_profiles"]
    for prop in ["clay", "sand", "silt", "ph", "soc"]:
        assert prop in profiles
        assert len(profiles[prop]) == 6

    # Verify clay + sand + silt roughly sums to 100% at each depth
    for d_name, t_info in body["texture_by_depth"].items():
        total_pct = t_info["clay"] + t_info["sand"] + t_info["silt"]
        assert 98.0 <= total_pct <= 102.0


def test_soil_sensor_template_endpoint():
    """Verify GET /api/soil/template returns downloadable CSV template."""
    resp = client.get("/api/soil/template")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "attachment" in resp.headers.get("content-disposition", "")
    content = resp.text
    assert "date,sensor_id,depth_cm,soil_moisture" in content


def test_soil_sensor_upload_valid_fraction():
    """Verify uploading sensor CSV with fractional moisture values (0.0 to 1.0 m³/m³)."""
    csv_content = (
        "date,sensor_id,depth_cm,soil_moisture,soil_temperature,electrical_conductivity\n"
        "2024-07-01,SENSOR_PDKV_01,10.0,0.342,28.4,0.45\n"
        "2024-07-01,SENSOR_PDKV_01,30.0,0.385,26.8,0.52\n"
        "2024-07-01,SENSOR_PDKV_01,60.0,0.410,25.2,0.48\n"
    )
    files = {"file": ("test_sensor_frac.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    resp = client.post("/api/soil/sensor-upload", files=files)
    assert resp.status_code == 200
    data = resp.json()

    assert data["provenance"] == "user_provided"
    body = data["data"]
    assert body["total_rows"] == 3
    assert body["sensors"] == ["SENSOR_PDKV_01"]
    assert body["depths_measured_cm"] == [10.0, 30.0, 60.0]

    preview = body["preview"]
    assert preview[0]["normalized_moisture_m3m3"] == 0.342
    assert preview[0]["original_unit"] == "m³/m³"


def test_soil_sensor_upload_valid_percentage_normalized():
    """Verify uploading sensor CSV with percentage moisture values (0 to 100%) gets normalized to m³/m³."""
    csv_content = (
        "date,sensor_id,depth_cm,soil_moisture\n"
        "2024-07-01,PROBE_A,15.0,34.2\n"
        "2024-07-01,PROBE_A,45.0,41.5\n"
    )
    files = {"file": ("test_sensor_pct.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    resp = client.post("/api/soil/sensor-upload", files=files)
    assert resp.status_code == 200
    data = resp.json()

    assert data["provenance"] == "user_provided"
    preview = data["data"]["preview"]
    assert preview[0]["original_moisture"] == 34.2
    assert preview[0]["original_unit"] == "%"
    assert preview[0]["normalized_moisture_m3m3"] == 0.342
    assert preview[1]["normalized_moisture_m3m3"] == 0.415


def test_soil_sensor_upload_invalid_schema():
    """Verify rejection when required columns are missing."""
    csv_content = (
        "date,sensor_id,soil_moisture\n"
        "2024-07-01,PROBE_A,0.35\n"
    )
    files = {"file": ("test_invalid_schema.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    resp = client.post("/api/soil/sensor-upload", files=files)
    assert resp.status_code == 422
    assert "Missing required columns" in resp.json()["detail"]


def test_soil_sensor_upload_invalid_date():
    """Verify rejection of invalid calendar dates."""
    csv_content = (
        "date,sensor_id,depth_cm,soil_moisture\n"
        "2024-02-30,PROBE_A,20.0,0.35\n"
    )
    files = {"file": ("test_invalid_date.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    resp = client.post("/api/soil/sensor-upload", files=files)
    assert resp.status_code == 422
    assert "does not exist" in resp.json()["detail"]


def test_soil_sensor_upload_out_of_bounds_depth():
    """Verify rejection when depth is outside 0–200 cm."""
    csv_content = (
        "date,sensor_id,depth_cm,soil_moisture\n"
        "2024-07-01,PROBE_A,250.0,0.35\n"
    )
    files = {"file": ("test_invalid_depth.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    resp = client.post("/api/soil/sensor-upload", files=files)
    assert resp.status_code == 422
    assert "Depth 250.0 cm out of realistic bounds" in resp.json()["detail"]


def test_soil_sensor_upload_out_of_bounds_moisture():
    """Verify rejection when moisture is negative or > 100."""
    csv_content = (
        "date,sensor_id,depth_cm,soil_moisture\n"
        "2024-07-01,PROBE_A,20.0,125.0\n"
    )
    files = {"file": ("test_invalid_moist.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    resp = client.post("/api/soil/sensor-upload", files=files)
    assert resp.status_code == 422
    assert "out of physical range" in resp.json()["detail"]
