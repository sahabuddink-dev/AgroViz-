"""
Tests for AI Inference Models and Remote Sensing Monitoring Zones (AgroViz SIH25099).
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.raster import compute_raster_indices

client = TestClient(app)


def test_list_zones():
    res = client.get("/api/zones")
    assert res.status_code == 200
    body = res.json()
    assert body["provenance"] == "measured"
    data = body["data"]
    assert len(data) == 30
    z1 = data[0]
    assert z1["zone_id"] == 1
    assert "latitude" in z1
    assert "longitude" in z1
    assert z1["ndvi"] is not None
    assert z1["vh_db"] is not None
    assert z1["crop_stress"] in ["Healthy", "Moderate Stress", "Severe Stress", "Bare Soil"]


def test_get_zones_geojson():
    res = client.get("/api/zones/geojson")
    assert res.status_code == 200
    body = res.json()
    data = body["data"]
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) == 30
    f0 = data["features"][0]
    assert f0["geometry"]["type"] == "Polygon"
    assert f0["properties"]["zone_id"] == 1


def test_get_zone_detail():
    res = client.get("/api/zones/1")
    assert res.status_code == 200
    body = res.json()
    data = body["data"]
    assert data["zone"]["zone_id"] == 1
    assert "soil_profile" in data
    soil = data["soil_profile"]
    assert "clay_0_5cm" in soil
    assert "ph_0_5cm" in soil


def test_get_zone_detail_invalid():
    res = client.get("/api/zones/999")
    assert res.status_code == 404


def test_get_zone_series():
    res = client.get("/api/zones/1/series")
    assert res.status_code == 200
    body = res.json()
    data = body["data"]
    assert data["zone_id"] == 1
    assert data["counts"]["sentinel2_dates"] > 0
    assert data["counts"]["sentinel1_dates"] > 0
    assert data["counts"]["weather_dates"] > 0
    assert len(data["sentinel2_series"]) > 0


def test_ai_models_registry():
    res = client.get("/api/ai/models")
    assert res.status_code == 200
    body = res.json()
    data = body["data"]
    assert data["models_count"] == 2
    models = {m["id"]: m for m in data["models"]}
    assert "cnn_crop_stress" in models
    assert "lstm_vegetation_forecaster" in models
    assert models["cnn_crop_stress"]["trainable_parameters"] > 0
    assert models["lstm_vegetation_forecaster"]["trainable_parameters"] > 0


def test_cnn_predict_crop_stress_with_bands():
    payload = {
        "spectral_bands": {
            "B2": 0.03,
            "B3": 0.06,
            "B4": 0.04,
            "B5": 0.12,
            "B8": 0.50,
            "B8A": 0.52,
            "B11": 0.14,
            "B12": 0.08,
        }
    }
    res = client.post("/api/ai/predict/crop-stress", json=payload)
    assert res.status_code == 200
    body = res.json()
    data = body["data"]
    assert data["predicted_class"] in ["Healthy", "Moderate Stress", "Severe Stress", "Bare Soil"]
    assert 0.0 <= data["confidence"] <= 1.0
    assert "computed_indices" in data
    assert data["computed_indices"]["NDVI"] is not None
    assert data["computed_indices"]["BSI"] is not None


def test_cnn_predict_crop_stress_with_zone_id():
    res = client.post("/api/ai/predict/crop-stress", json={"zone_id": 1})
    assert res.status_code == 200
    body = res.json()
    data = body["data"]
    assert data["zone_id"] == 1
    assert data["predicted_class"] in ["Healthy", "Moderate Stress", "Severe Stress", "Bare Soil"]


def test_lstm_forecast_indices_with_zone_id():
    res = client.post("/api/ai/forecast/indices", json={"zone_id": 1, "horizon_days": 15})
    assert res.status_code == 200
    body = res.json()
    data = body["data"]
    assert data["zone_id"] == 1
    assert len(data["forecast_series"]) == 15
    first_pt = data["forecast_series"][0]
    assert "predicted_ndvi" in first_pt
    assert "lower_bound_95" in first_pt
    assert "upper_bound_95" in first_pt
    assert first_pt["lower_bound_95"] <= first_pt["predicted_ndvi"] <= first_pt["upper_bound_95"]


def test_ai_pest_risk_indicator():
    res = client.get("/api/ai/pest-risk?zone_id=1")
    assert res.status_code == 200
    body = res.json()
    data = body["data"]
    assert data["zone_id"] == 1
    assert 0.0 <= data["risk_score"] <= 1.0
    assert data["risk_level"] in ["Low Risk", "Moderate Risk", "High Risk"]
    assert "component_factors" in data
