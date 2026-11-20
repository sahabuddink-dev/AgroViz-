"""
Unit and Integration tests for Phase 9:
Agricultural Alert Engine, Year-on-Year Descriptive Screening, and Field Health Report Exports.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.fields import AKOLA_DEMO_ID, FIELDS_FILE_PATH

client = TestClient(app)


@pytest.fixture(autouse=True)
def cleanup_fields():
    """Ensure data/fields/fields.json is clean after tests."""
    yield
    if FIELDS_FILE_PATH.exists():
        FIELDS_FILE_PATH.unlink()


def test_alerts_endpoint_akola_demo():
    """Verify GET /api/alerts returns deterministic evidence-based alerts for Akola demo."""
    res = client.get("/api/alerts")
    assert res.status_code == 200
    json_data = res.json()
    assert json_data["provenance"] == "calculated"
    assert "AgroViz Deterministic Alert Engine" in json_data["source"]

    alerts = json_data["data"]
    assert len(alerts) >= 4

    alert_ids = [a["id"] for a in alerts]
    assert "alert_monsoon_optical_gap_akola" in alert_ids
    assert "alert_topsoil_moisture_premonsoon_akola" in alert_ids
    assert "alert_pbw_thermal_accumulation_akola" in alert_ids
    assert "alert_heatwave_upper_cutoff_akola" in alert_ids

    # Inspect structure of monsoon cloud gap alert
    gap_alert = next(a for a in alerts if a["id"] == "alert_monsoon_optical_gap_akola")
    assert gap_alert["severity"] == "Warning"
    assert gap_alert["category"] == "crop_health"
    assert len(gap_alert["recommendations"]) >= 1
    assert len(gap_alert["limitations"]) >= 1
    assert "July 2023 and July 2024" in gap_alert["message"]

    # Inspect structure of PBW thermal alert
    pbw_alert = next(a for a in alerts if a["id"] == "alert_pbw_thermal_accumulation_akola")
    assert pbw_alert["severity"] == "Warning"
    assert pbw_alert["category"] == "pest_phenology"
    assert "503.62 DD" in pbw_alert["message"]


def test_alerts_user_field_requires_onboarding():
    """Verify user fields do not inherit Akola regional alerts and receive onboarding alerts."""
    poly = {
        "type": "Polygon",
        "coordinates": [
            [
                [77.01, 20.71],
                [77.02, 20.71],
                [77.02, 20.72],
                [77.01, 20.72],
                [77.01, 20.71],
            ]
        ],
    }
    create_res = client.post("/api/fields", json={"name": "User Plot 9", "boundary": poly})
    f_id = create_res.json()["data"]["id"]

    res = client.get(f"/api/alerts?field_id={f_id}")
    assert res.status_code == 200
    alerts = res.json()["data"]
    assert len(alerts) == 1

    alert = alerts[0]
    assert alert["category"] == "field_setup"
    assert alert["severity"] == "Info"
    assert "Awaiting Local Data Ingestion" in alert["title"]
    # Ensure Akola reanalysis alerts are NOT falsely present
    alert_ids = [a["id"] for a in alerts]
    assert "alert_monsoon_optical_gap_akola" not in alert_ids


def test_alerts_nonexistent_field_returns_404():
    """Verify 404 Not Found when requesting alerts for invalid field ID."""
    res = client.get("/api/alerts?field_id=nonexistent_field_id")
    assert res.status_code == 404


def test_yoy_analysis_june_december():
    """Verify GET /api/analysis/yoy comparative structure and disclaimers."""
    res = client.get("/api/analysis/yoy")
    assert res.status_code == 200
    json_data = res.json()
    data = json_data["data"]

    assert "June 1 to December 31" in data["comparison_period"]
    assert "weather" in data
    assert "soil_moisture" in data
    assert "crop_indices" in data

    # Weather YoY
    w_yoy = data["weather"]
    assert "2023" in w_yoy["season_totals"]
    assert "2024" in w_yoy["season_totals"]
    assert len(w_yoy["monthly_breakdown"]) == 7  # June through December

    # Soil Moisture YoY
    sm_yoy = data["soil_moisture"]
    assert "layer1_0_7cm_mean_m3m3" in sm_yoy["season_averages"]["2023"]

    # Crop Indices YoY
    c_yoy = data["crop_indices"]
    assert "cloud_gaps_preserved" in c_yoy
    assert "July 2023" in c_yoy["cloud_gaps_preserved"]["2023"]
    assert "July 2024" in c_yoy["cloud_gaps_preserved"]["2024"]


def test_yoy_metric_filtering_and_validation():
    """Verify query param filtering and rejection of invalid metric."""
    res_w = client.get("/api/analysis/yoy?metric=weather")
    assert res_w.status_code == 200
    data_w = res_w.json()["data"]
    assert "weather" in data_w
    assert "soil_moisture" not in data_w

    res_inv = client.get("/api/analysis/yoy?metric=invalid_metric")
    assert res_inv.status_code == 400


def test_reports_export_json_akola_demo():
    """Verify POST /api/reports/export generates comprehensive JSON report."""
    payload = {"field_id": AKOLA_DEMO_ID, "format": "json"}
    res = client.post("/api/reports/export", json=payload)
    assert res.status_code == 200
    report = res.json()["data"]

    assert report["field_id"] == AKOLA_DEMO_ID
    assert report["area_hectares"] > 31000
    assert "module_summaries" in report
    assert "weather" in report["module_summaries"]
    assert "crop_health" in report["module_summaries"]
    assert "soil_conditions" in report["module_summaries"]
    assert "pest_phenology" in report["module_summaries"]
    assert len(report["active_alerts"]) >= 4
    assert len(report["citations"]) >= 4
    assert any("Fand, B.B." in c for c in report["citations"])
    assert any("Pathan, B." in c for c in report["citations"])


def test_reports_export_csv_download():
    """Verify report export in downloadable CSV format."""
    payload = {"field_id": AKOLA_DEMO_ID, "format": "csv"}
    res = client.post("/api/reports/export", json=payload)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "attachment; filename=" in res.headers["content-disposition"]

    csv_text = res.text
    assert "Section,Parameter / Metric,Value,Unit,Provenance,Source,Notes / Caveats" in csv_text
    assert "Akola Cotton Research Zone" in csv_text
    assert "NASA POWER" in csv_text
    assert "Fand, B.B." in csv_text


def test_reports_export_user_field():
    """Verify report generation for user field without fabricated data."""
    poly = {
        "type": "Polygon",
        "coordinates": [
            [
                [77.01, 20.71],
                [77.02, 20.71],
                [77.02, 20.72],
                [77.01, 20.72],
                [77.01, 20.71],
            ]
        ],
    }
    create_res = client.post("/api/fields", json={"name": "Farmer Ramrao Field", "boundary": poly})
    f_id = create_res.json()["data"]["id"]

    res = client.post("/api/reports/export", json={"field_id": f_id, "format": "json"})
    assert res.status_code == 200
    report = res.json()["data"]
    assert report["field_name"] == "Farmer Ramrao Field"
    assert report["module_summaries"]["status"] == "Awaiting Local Data Ingestion"


def test_locked_pbw_risk_endpoint():
    """Verify /api/analysis/pbw-risk remains locked with status unavailable."""
    res = client.get("/api/analysis/pbw-risk")
    assert res.status_code == 200
    data = res.json()
    assert data["provenance"] == "unavailable"
    assert data["data"]["status"] == "locked"
    assert data["data"]["risk_category"] == "unavailable"
    assert data["data"]["risk_score"] is None
