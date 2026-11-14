import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "AgroViz API is active" in response.json()["message"]

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    json_data = response.json()
    
    # Verify API contract envelope
    assert "provenance" in json_data
    assert "source" in json_data
    assert "units" in json_data
    assert "period" in json_data
    assert "notes" in json_data
    assert "data" in json_data
    
    # Check payload
    data = json_data["data"]
    assert data["status"] == "healthy"
    assert data["datasets_present"] == 9
    assert data["datasets_total"] == 9

def test_data_registry_endpoint():
    response = client.get("/api/datasets")
    assert response.status_code == 200
    json_data = response.json()
    
    data = json_data["data"]
    assert data["total_expected"] == 9
    assert data["total_found"] == 9
    assert data["all_present"] is True
    
    # Verify each dataset
    datasets = {d["canonical_filename"]: d for d in data["datasets"]}
    assert len(datasets) == 9
    
    # Verify all 9 files are marked exists=True and have size_bytes > 0
    for filename, item in datasets.items():
        assert item["exists"] is True, f"File {filename} should exist"
        assert item["size_bytes"] is not None and item["size_bytes"] > 0
        
    # Check specific provenance requirements
    # 1. NASA POWER weather is model/reanalysis-derived (CLAUDE.md Section 4 & 5.1 & Phase 1 req 9)
    weather_item = datasets["POWER_Point_Daily_20230601_20241231_020d71N_077d00E_LST.csv"]
    assert weather_item["provenance"] == "model_estimated"
    assert "reanalysis" in weather_item["source"].lower()
    
    # 2. Sentinel-2 indices is calculated from satellite
    s2_item = datasets["AgroViz_Akola_Sentinel2_Indices.csv"]
    assert s2_item["provenance"] == "calculated"
    
    # 3. ERA5 three-layer is model_estimated
    era5_item = datasets["AgroViz_Akola_ERA5_Three_Layer_Soil_Moisture.csv"]
    assert era5_item["provenance"] == "model_estimated"
    
    # 4. SoilGrids is model_estimated
    soilgrids_item = datasets["AgroViz_Akola_SoilGrids_Properties.csv"]
    assert soilgrids_item["provenance"] == "model_estimated"
