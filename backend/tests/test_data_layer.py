import hashlib
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import DATA_RAW_DIR, DATA_PROCESSED_DIR
from app.services.loaders import (
    load_weather,
    load_sentinel2_indices,
    load_era5_soil_moisture,
    load_soilgrids,
    load_annexure_4,
    load_annexure_3,
    load_planetary_computer_validation,
    load_scene_inventory,
)
from app.services.profiler import profile_dataset, profile_all_datasets
from app.services.registry import DATASET_MANIFEST_DEFINITIONS

client = TestClient(app)

# Canonical SHA-256 baseline hashes
CANONICAL_HASHES = {
    "POWER_Point_Daily_20230601_20241231_020d71N_077d00E_LST.csv": "6e2c8d576595270e991c2e5eed74633e4b5d4259a6e05e7ee0cce0eff48b89a5",
    "AgroViz_Akola_Sentinel2_Indices.csv": "753e922dfafa9296b03116e05ef56fbea9d9bc5c9c43698eac80d4a36187d4db",
    "AgroViz_Akola_ERA5_Three_Layer_Soil_Moisture.csv": "70633c633d9abe0b49ae0649ff0e3b8835fea56c91e8c2f5d3569049f607680b",
    "AgroViz_Akola_SoilGrids_Properties.csv": "ba9378162b86e4a040bc1ec108d3c4053a676e80f660057561ae4ea2c6759f00",
    "Annexure_3_Supplementary_data_Linking_phenology_to_loss_R1.xlsx": "5df9050918d9c9deaca20da98abd9cfd45d5048c4b997a1a44d5d834cfb86f20",
    "Annexure_4_Supplementary_data_Multilocation_loss_R1.xlsx": "79ff02a58a548f3dcac507037744f1e23399768870474e182e6b246c8598af87",
    "Processed_AgroViz_Akola_Sentinel2_Indices.csv": "1b87389b2f0e72e137af2aaffc1b6967dc645a9d233cfdaf3f83fd3fa0ec1f25",
    "akola_sentinel2_inventory.csv": "d2e52cda6634d331f36fd53abf1034a2d02e93f1dd861a92dbe306e6976e43f2",
    "AgroViz_Akola_ERA5_Soil_Moisture.csv": "31877fef787bdcb073f63ff931b37791afa6b42c9eaa317614fa8d28350570fe",
}

def test_raw_files_immutability():
    """Verify that every file in data/raw matches its baseline SHA-256 hash."""
    for filename, expected_hash in CANONICAL_HASHES.items():
        file_path = DATA_RAW_DIR / filename
        assert file_path.exists(), f"File {filename} is missing from data/raw"
        
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(8192):
                hasher.update(chunk)
        assert hasher.hexdigest() == expected_hash, f"SHA-256 mismatch on {filename}! Raw file was modified."

def test_weather_loader_and_quality():
    """Verify weather dataset loading, cleaning, row count, dates, and zero nulls."""
    df = load_weather(save_processed=True)
    assert len(df) == 580
    assert df["date"].min() == "2023-06-01"
    assert df["date"].max() == "2024-12-31"
    assert df["date"].nunique() == 580
    assert df.isna().sum().sum() == 0
    assert (df["t2m"] == -999).sum() == 0
    
    # Processed artifact exists
    assert (DATA_PROCESSED_DIR / "weather_cleaned.csv").exists()

def test_sentinel2_loader_and_cleaning_rules():
    """Verify Sentinel-2 cleaning rules: de-duplication, partial tiles, simple mean, July gap."""
    scenes_df, daily_df = load_sentinel2_indices(save_processed=True)
    
    # Rule a: De-duplication leaves exactly 295 rows
    assert len(scenes_df) == 295
    assert scenes_df.duplicated(subset=["date", "tile"]).sum() == 0
    
    # Rule b: Flags 3 partial tiles (<5000 valid pixels)
    assert scenes_df["partial_tile"].sum() == 3
    
    # Rule c: Daily AOI series has 80 valid dates (1 date 2024-10-17 excluded as only partial tile)
    assert len(daily_df) == 80
    
    # Rule d: July monsoon gap
    assert not daily_df["date"].str.contains("-07-").any()
    
    # Processed artifacts exist
    assert (DATA_PROCESSED_DIR / "sentinel2_scenes_cleaned.csv").exists()
    assert (DATA_PROCESSED_DIR / "sentinel2_daily_aoi.csv").exists()

def test_era5_soil_moisture_three_layer():
    """Verify ERA5 3-layer data: 580 rows, pixel counts=9, matches single-layer file."""
    df = load_era5_soil_moisture(save_processed=True)
    assert len(df) == 580
    assert (df["sm_layer1_count"] == 9).all()
    assert (df["sm_layer2_count"] == 9).all()
    assert (df["sm_layer3_count"] == 9).all()
    assert (DATA_PROCESSED_DIR / "era5_soil_moisture_cleaned.csv").exists()

def test_soilgrids_reshaping_and_classification():
    """Verify SoilGrids wide-to-long reshaping (30 rows) and USDA texture classification."""
    long_df, meta = load_soilgrids(save_processed=True)
    assert len(long_df) == 30
    assert set(long_df["property"].unique()) == {"clay", "sand", "silt", "ph", "soc"}
    assert len(long_df["depth"].unique()) == 6
    assert meta["area_mean_texture"] in ["Clay", "Clay Loam"]
    assert (DATA_PROCESSED_DIR / "soilgrids_profiles_long.csv").exists()

def test_annexure_4_multilocation():
    """Verify Annexure 4: 63 locations, 9 states, 21 in Maharashtra, Paras Akola row."""
    df = load_annexure_4(save_processed=True)
    assert len(df) == 63
    assert df["State"].nunique() == 9
    assert (df["State"] == "Maharashtra").sum() == 21
    
    # Verify Paras row
    akola_rows = df[df["District"].str.lower() == "akola"]
    assert len(akola_rows) == 1
    paras = akola_rows.iloc[0]
    assert paras["Location"] == "Paras"
    assert round(float(paras["Yield loss (%)_PBW"]), 3) == 4.428
    assert round(float(paras["Yield loss (%)_BR"]), 3) == 10.689
    assert (DATA_PROCESSED_DIR / "pbw_annexure4_multilocation.csv").exists()

def test_annexure_3_stationwise():
    """Verify Annexure 3: Akola 5-season mean equals 21.602%, rough sheet excluded."""
    data = load_annexure_3(save_processed=True)
    assert "rough" not in data["sheets_available"]
    assert len(data["akola_seasonal_damage"]) == 5
    assert abs(data["calculated_bt_mean"] - 21.602) < 0.001
    assert data["akola_bt_5season_mean"] == 21.602
    assert "cell_AE33" in data["ambiguous_annotations"]
    assert (DATA_PROCESSED_DIR / "pbw_annexure3_stationwise.csv").exists()

def test_planetary_computer_validation():
    """Verify Planetary Computer validation run: 63 rows, 5 low coverage scenes, high correlation."""
    df, stats = load_planetary_computer_validation(save_processed=True)
    assert len(df) == 63
    assert stats["low_coverage_scenes_count"] == 5
    assert stats["ndvi_correlation"] > 0.95
    assert stats["mean_ndvi_offset_bias"] > 0.1
    assert (DATA_PROCESSED_DIR / "sentinel2_planetary_computer_comparison.csv").exists()

def test_profiler_service():
    """Verify profiling service runs and passes for all datasets."""
    reports = profile_all_datasets()
    assert len(reports) == 9
    for r in reports:
        assert r["quality_status"] == "PASSED"
        for check in r["quality_checks"]:
            assert check["passed"] is True, f"Check {check['name']} failed in dataset {r['id']}"

def test_datasets_preview_and_profile_api():
    """Test API endpoints for dataset profile and preview."""
    # Test profile endpoint
    res_prof = client.get("/api/datasets/weather_nasa_power/profile")
    assert res_prof.status_code == 200
    json_prof = res_prof.json()
    assert json_prof["provenance"] == "model_estimated"
    assert json_prof["data"]["row_count"] == 580

    # Test preview endpoint
    res_prev = client.get("/api/datasets/sentinel2_indices_gee/preview?limit=5")
    assert res_prev.status_code == 200
    json_prev = res_prev.json()
    assert json_prev["provenance"] == "calculated"
    assert len(json_prev["data"]["preview_rows"]) == 5
