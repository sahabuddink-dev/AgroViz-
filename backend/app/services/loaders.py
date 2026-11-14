import os
import logging
from typing import Dict, Any, Tuple, Optional
import pandas as pd
import numpy as np

from ..config import DATA_RAW_DIR, DATA_PROCESSED_DIR

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 1. Weather Loader (NASA POWER MERRA-2)
# ---------------------------------------------------------------------------
def load_weather(save_processed: bool = True) -> pd.DataFrame:
    """
    Loads and cleans NASA POWER daily weather data.
    Source: MERRA-2 Reanalysis (Point 20.7069°N, 77.0022°E).
    Provenance: model_estimated (reanalysis).
    """
    raw_path = DATA_RAW_DIR / "POWER_Point_Daily_20230601_20241231_020d71N_077d00E_LST.csv"
    if not raw_path.exists():
        raise FileNotFoundError(f"Weather dataset missing at {raw_path}")

    # File has 13 header lines; row 14 is the column header
    df = pd.read_csv(raw_path, skiprows=13)
    
    # Standardize column names to lower case
    df.columns = [c.strip().lower() for c in df.columns]
    
    # Calculate ISO calendar date from YEAR and DOY (Day of Year)
    # Using format %Y%j
    df["date"] = pd.to_datetime(
        df["year"].astype(str) + df["doy"].astype(str).str.zfill(3),
        format="%Y%j"
    ).dt.strftime("%Y-%m-%d")

    # Reorder columns
    cols = ["date", "year", "doy", "t2m", "t2m_max", "t2m_min", "rh2m", "prectotcorr"]
    df = df[cols]

    # Validation checks
    if len(df) != 580:
        raise ValueError(f"Expected 580 daily rows, found {len(df)}")
    if df.isna().sum().sum() > 0:
        raise ValueError("Weather dataset contains unexpected NaN/missing values")
    if (df["t2m"] == -999).any() or (df["t2m_max"] == -999).any() or (df["t2m_min"] == -999).any():
        raise ValueError("Weather dataset contains unhandled -999 missing-value indicators")
    
    start_date, end_date = df["date"].min(), df["date"].max()
    if start_date != "2023-06-01" or end_date != "2024-12-31":
        raise ValueError(f"Expected date range 2023-06-01 to 2024-12-31, found {start_date} to {end_date}")

    if save_processed:
        DATA_PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
        df.to_csv(DATA_PROCESSED_DIR / "weather_cleaned.csv", index=False)

    return df

# ---------------------------------------------------------------------------
# 2. Sentinel-2 Indices Loader (Google Earth Engine Export - Primary Satellite)
# ---------------------------------------------------------------------------
def load_sentinel2_indices(save_processed: bool = True) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Loads Sentinel-2 indices and applies CLAUDE.md Section 5.2 cleaning rules:
    a. Identifies duplicate (date, tile) pairs; keeps row with larger NDVI_count (logs 14 duplicates).
       Yields exactly 295 de-duplicated tile scenes.
    b. Flags rows with NDVI_count < 5000 as partial_tile (3 rows flagged).
    c. Aggregates tiles per date using a simple unweighted mean (overlapping tiles).
    d. Verifies zero observations in July (monsoon gap).
    
    Returns:
        (scenes_df, daily_aoi_df)
    """
    raw_path = DATA_RAW_DIR / "AgroViz_Akola_Sentinel2_Indices.csv"
    if not raw_path.exists():
        raise FileNotFoundError(f"Sentinel-2 dataset missing at {raw_path}")

    raw_df = pd.read_csv(raw_path)
    if len(raw_df) != 309:
        raise ValueError(f"Expected 309 raw Sentinel-2 rows, found {len(raw_df)}")

    # Extract tile from scene_id (last 6 characters, e.g. T43QFC)
    raw_df["tile"] = raw_df["scene_id"].astype(str).str[-6:]
    raw_df["date"] = pd.to_datetime(raw_df["date"]).dt.strftime("%Y-%m-%d")

    # Cleaning rule (a): Handle duplicates on (date, tile)
    # Sort by date, tile, and NDVI_count ascending so drop_duplicates(keep='last') retains larger NDVI_count
    sorted_df = raw_df.sort_values(by=["date", "tile", "NDVI_count"], ascending=[True, True, True])
    dup_mask = sorted_df.duplicated(subset=["date", "tile"], keep=False)
    dup_count = dup_mask.sum() // 2  # Each duplicate pair accounts for 2 rows
    logger.info("Found %d duplicate (date, tile) rows in Sentinel-2 raw data", dup_count)

    scenes_df = sorted_df.drop_duplicates(subset=["date", "tile"], keep="last").copy()
    scenes_df = scenes_df.sort_values(by=["date", "tile"]).reset_index(drop=True)

    if len(scenes_df) != 295:
        raise ValueError(f"Expected 295 rows after de-duplication, got {len(scenes_df)}")

    # Cleaning rule (b): Flag partial tiles (<5,000 valid pixels)
    scenes_df["partial_tile"] = scenes_df["NDVI_count"] < 5000
    partial_count = scenes_df["partial_tile"].sum()
    if partial_count != 3:
        logger.warning("Expected 3 partial tiles with NDVI_count < 5000, found %d", partial_count)

    # Cleaning rule (c): Daily AOI aggregation using simple mean excluding partial tiles
    valid_tiles = scenes_df[~scenes_df["partial_tile"]].copy()
    daily_aoi_df = valid_tiles.groupby("date").agg(
        NDVI_mean=("NDVI_mean", "mean"),
        NDMI_mean=("NDMI_mean", "mean"),
        NDRE_mean=("NDRE_mean", "mean"),
        cloud_percentage=("cloud_percentage", "mean"),
        tile_count=("tile", "count"),
        total_valid_pixels=("NDVI_count", "sum"),
    ).reset_index()

    # Rule (d): Verify July monsoon gap
    july_dates = daily_aoi_df[daily_aoi_df["date"].str.contains("-07-")]
    if len(july_dates) > 0:
        raise ValueError(f"Found unexpected optical observations in July: {july_dates['date'].tolist()}")

    if save_processed:
        DATA_PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
        scenes_df.to_csv(DATA_PROCESSED_DIR / "sentinel2_scenes_cleaned.csv", index=False)
        daily_aoi_df.to_csv(DATA_PROCESSED_DIR / "sentinel2_daily_aoi.csv", index=False)

    return scenes_df, daily_aoi_df

# ---------------------------------------------------------------------------
# 3. ERA5-Land Soil Moisture Loader (3 Depths + Cross-Check)
# ---------------------------------------------------------------------------
def load_era5_soil_moisture(save_processed: bool = True) -> pd.DataFrame:
    """
    Loads ERA5-Land volumetric soil moisture across 3 layers (0-7 cm, 7-28 cm, 28-100 cm).
    Cross-checks layer 1 against single-layer ERA5 file.
    Provenance: model_estimated.
    """
    raw_path_3layer = DATA_RAW_DIR / "AgroViz_Akola_ERA5_Three_Layer_Soil_Moisture.csv"
    raw_path_1layer = DATA_RAW_DIR / "AgroViz_Akola_ERA5_Soil_Moisture.csv"
    
    if not raw_path_3layer.exists():
        raise FileNotFoundError(f"ERA5 3-layer dataset missing at {raw_path_3layer}")

    df3 = pd.read_csv(raw_path_3layer)
    if len(df3) != 580:
        raise ValueError(f"Expected 580 rows in ERA5 3-layer data, found {len(df3)}")

    # Verify counts are 9 on all days
    for col in ["sm_layer1_count", "sm_layer2_count", "sm_layer3_count"]:
        if not (df3[col] == 9).all():
            raise ValueError(f"Unexpected pixel count in {col}; expected 9 on all days")

    # Cross check against single-layer file if present
    if raw_path_1layer.exists():
        df1 = pd.read_csv(raw_path_1layer)
        if len(df1) == 580:
            max_diff = np.abs(df3["sm_layer1_mean"].values - df1["soil_moisture_mean"].values).max()
            if max_diff > 1e-6:
                raise ValueError(f"ERA5 layer 1 mismatch with single layer file: max diff {max_diff}")
            logger.info("ERA5 layer 1 verified against single-layer file (diff=%.4f)", max_diff)

    if save_processed:
        DATA_PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
        df3.to_csv(DATA_PROCESSED_DIR / "era5_soil_moisture_cleaned.csv", index=False)

    return df3

# ---------------------------------------------------------------------------
# 4. SoilGrids Loader & Reshaper
# ---------------------------------------------------------------------------
def classify_usda_texture(clay_pct: float, sand_pct: float, silt_pct: float) -> str:
    """
    Computes USDA Soil Texture Classification based on standard USDA soil texture triangle.
    """
    if silt_pct + 1.5 * clay_pct < 15:
        return "Sand"
    elif silt_pct + 2 * clay_pct < 30:
        return "Loamy Sand"
    elif (7 <= clay_pct < 20 and sand_pct > 52 and silt_pct + 2 * clay_pct >= 30) or (clay_pct < 7 and silt_pct < 50 and silt_pct + 2 * clay_pct >= 30):
        return "Sandy Loam"
    elif (7 <= clay_pct < 27 and 28 <= silt_pct < 50 and sand_pct <= 52):
        return "Loam"
    elif (silt_pct >= 50 and 12 <= clay_pct < 27) or (50 <= silt_pct < 80 and clay_pct < 12):
        return "Silt Loam"
    elif silt_pct >= 80 and clay_pct < 12:
        return "Silt"
    elif 20 <= clay_pct < 35 and sand_pct > 45 and silt_pct < 28:
        return "Sandy Clay Loam"
    elif 27 <= clay_pct < 40 and 20 <= sand_pct <= 45:
        return "Clay Loam"
    elif 27 <= clay_pct < 40 and sand_pct < 20:
        return "Silty Clay Loam"
    elif clay_pct >= 35 and sand_pct > 45:
        return "Sandy Clay"
    elif clay_pct >= 40 and silt_pct >= 40:
        return "Silty Clay"
    elif clay_pct >= 40:
        return "Clay"
    return "Unclassified"

def load_soilgrids(save_processed: bool = True) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Loads SoilGrids static properties and reshapes wide 1-row dataset to a 30-row long profile:
    5 properties (clay, sand, silt, ph, soc) x 6 standard depths.
    Calculates USDA soil texture per depth and area-mean texture.
    """
    raw_path = DATA_RAW_DIR / "AgroViz_Akola_SoilGrids_Properties.csv"
    if not raw_path.exists():
        raise FileNotFoundError(f"SoilGrids dataset missing at {raw_path}")

    raw_df = pd.read_csv(raw_path)
    if len(raw_df) != 1:
        raise ValueError(f"Expected 1 row in SoilGrids raw dataset, found {len(raw_df)}")

    row = raw_df.iloc[0].to_dict()

    depths_meta = [
        {"code": "0_5cm", "top_cm": 0, "bottom_cm": 5, "label": "0–5 cm"},
        {"code": "5_15cm", "top_cm": 5, "bottom_cm": 15, "label": "5–15 cm"},
        {"code": "15_30cm", "top_cm": 15, "bottom_cm": 30, "label": "15–30 cm"},
        {"code": "30_60cm", "top_cm": 30, "bottom_cm": 60, "label": "30–60 cm"},
        {"code": "60_100cm", "top_cm": 60, "bottom_cm": 100, "label": "60–100 cm"},
        {"code": "100_200cm", "top_cm": 100, "bottom_cm": 200, "label": "100–200 cm"},
    ]

    records = []
    texture_by_depth = {}

    for d in depths_meta:
        code = d["code"]
        clay_mean = float(row[f"clay_{code}_pct_mean"])
        clay_count = int(row[f"clay_{code}_pct_count"])
        sand_mean = float(row[f"sand_{code}_pct_mean"])
        sand_count = int(row[f"sand_{code}_pct_count"])
        silt_mean = float(row[f"silt_{code}_pct_mean"])
        silt_count = int(row[f"silt_{code}_pct_count"])
        ph_mean = float(row[f"ph_{code}_mean"])
        ph_count = int(row[f"ph_{code}_count"])
        soc_mean = float(row[f"soc_{code}_gkg_mean"])
        soc_count = int(row[f"soc_{code}_gkg_count"])

        texture = classify_usda_texture(clay_mean, sand_mean, silt_mean)
        texture_by_depth[d["label"]] = {
            "clay": round(clay_mean, 2),
            "sand": round(sand_mean, 2),
            "silt": round(silt_mean, 2),
            "texture": texture,
        }

        records.append({
            "property": "clay", "depth": d["label"], "top_cm": d["top_cm"],
            "bottom_cm": d["bottom_cm"], "unit": "%", "mean": clay_mean, "count": clay_count
        })
        records.append({
            "property": "sand", "depth": d["label"], "top_cm": d["top_cm"],
            "bottom_cm": d["bottom_cm"], "unit": "%", "mean": sand_mean, "count": sand_count
        })
        records.append({
            "property": "silt", "depth": d["label"], "top_cm": d["top_cm"],
            "bottom_cm": d["bottom_cm"], "unit": "%", "mean": silt_mean, "count": silt_count
        })
        records.append({
            "property": "ph", "depth": d["label"], "top_cm": d["top_cm"],
            "bottom_cm": d["bottom_cm"], "unit": "pH (presumed H2O)", "mean": ph_mean, "count": ph_count
        })
        records.append({
            "property": "soc", "depth": d["label"], "top_cm": d["top_cm"],
            "bottom_cm": d["bottom_cm"], "unit": "g/kg", "mean": soc_mean, "count": soc_count
        })

    long_df = pd.DataFrame(records)
    if len(long_df) != 30:
        raise ValueError(f"Expected 30 rows in reshaped SoilGrids table, got {len(long_df)}")

    # Overall area-mean texture across all depths
    overall_clay = long_df[long_df["property"] == "clay"]["mean"].mean()
    overall_sand = long_df[long_df["property"] == "sand"]["mean"].mean()
    overall_silt = long_df[long_df["property"] == "silt"]["mean"].mean()
    area_texture = classify_usda_texture(overall_clay, overall_sand, overall_silt)

    metadata = {
        "source": "ISRIC SoilGrids 2.0 (250m)",
        "study_area": "Akola 10km buffer",
        "provenance": "model_estimated",
        "area_mean_texture": area_texture,
        "texture_classification_basis": "area-mean based; indicative only",
        "texture_by_depth": texture_by_depth,
    }

    if save_processed:
        DATA_PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
        long_df.to_csv(DATA_PROCESSED_DIR / "soilgrids_profiles_long.csv", index=False)

    return long_df, metadata

# ---------------------------------------------------------------------------
# 5. Pink Bollworm Annexure 4 Loader (Multilocation Survey Context)
# ---------------------------------------------------------------------------
def load_annexure_4(save_processed: bool = True) -> pd.DataFrame:
    """
    Loads Annexure 4 multilocation PBW and Boll Rot yield loss dataset.
    Strips whitespace from text columns.
    Validates exactly 63 locations across 9 states, and isolates Akola/Paras row.
    """
    raw_path = DATA_RAW_DIR / "Annexure_4_Supplementary_data_Multilocation_loss_R1.xlsx"
    if not raw_path.exists():
        raise FileNotFoundError(f"Annexure 4 missing at {raw_path}")

    # Read first sheet
    df = pd.read_excel(raw_path, sheet_name=0)
    
    # Drop unnamed empty trailing columns if present
    df = df.loc[:, ~df.columns.str.contains('^Unnamed')].copy()

    # Strip whitespace on all string columns
    for col in df.select_dtypes(include=["object"]).columns:
        df[col] = df[col].astype(str).str.strip()

    if len(df) != 63:
        raise ValueError(f"Expected 63 location rows in Annexure 4, found {len(df)}")

    # Check Maharashtra locations count (expected 21)
    mh_count = (df["State"] == "Maharashtra").sum()
    if mh_count != 21:
        raise ValueError(f"Expected 21 Maharashtra locations in Annexure 4, found {mh_count}")

    # Check Akola row (Location Paras)
    akola_rows = df[df["District"].str.lower() == "akola"]
    if len(akola_rows) != 1:
        raise ValueError(f"Expected exactly 1 Akola location in Annexure 4, found {len(akola_rows)}")
    
    paras = akola_rows.iloc[0]
    pbw_loss = float(paras["Yield loss (%)_PBW"])
    br_loss = float(paras["Yield loss (%)_BR"])
    if not (4.4 < pbw_loss < 4.5 and 10.6 < br_loss < 10.8):
        raise ValueError(f"Unexpected loss values for Paras: PBW {pbw_loss}%, BR {br_loss}%")

    if save_processed:
        DATA_PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
        df.to_csv(DATA_PROCESSED_DIR / "pbw_annexure4_multilocation.csv", index=False)

    return df

# ---------------------------------------------------------------------------
# 6. Pink Bollworm Annexure 3 Loader (Stationwise Seasonal Context)
# ---------------------------------------------------------------------------
def load_annexure_3(save_processed: bool = True) -> Dict[str, Any]:
    """
    Loads Annexure 3 supplementary dataset from Fand et al. (2025).
    Extracts Akola seasonal Bt and NBt loculi damage from 'AICRP-Stationwise data'
    and 'BT_Loculi damage_AI'.
    Excludes the scratch 'rough' sheet.
    """
    raw_path = DATA_RAW_DIR / "Annexure_3_Supplementary_data_Linking_phenology_to_loss_R1.xlsx"
    if not raw_path.exists():
        raise FileNotFoundError(f"Annexure 3 missing at {raw_path}")

    # Inspect sheet names
    xl = pd.ExcelFile(raw_path)
    sheet_names = xl.sheet_names
    valid_sheets = [s for s in sheet_names if s != "rough"]

    # Parse AICRP-Stationwise data
    stationwise_df = pd.read_excel(raw_path, sheet_name="AICRP-Stationwise data", header=None)
    
    # Locate Akola row
    # In inspection, Akola was in row index 32 (Row 33 in 1-based index)
    akola_mask = (stationwise_df[0].astype(str).str.strip().str.lower() == "akola") | (stationwise_df[16].astype(str).str.strip().str.lower() == "akola")
    akola_rows = stationwise_df[akola_mask]
    
    if len(akola_rows) == 0:
        raise ValueError("Could not locate Akola row in AICRP-Stationwise data")

    akola_row = akola_rows.iloc[0]

    # Seasons 2015-16 through 2019-20
    # NBt columns: F(5), G(6), H(7), I(8), J(9)
    # Bt columns: V(21), W(22), X(23), Y(24), Z(25)
    seasons = ["2015-16", "2016-17", "2017-18", "2018-19", "2019-20"]
    nbt_vals = [float(akola_row[5]), float(akola_row[6]), float(akola_row[7]), float(akola_row[8]), float(akola_row[9])]
    bt_vals = [float(akola_row[21]), float(akola_row[22]), float(akola_row[23]), float(akola_row[24]), float(akola_row[25])]
    
    bt_mean = round(float(np.mean(bt_vals)), 3)
    # Col AD (index 29) has the 5-season mean: 21.602
    recorded_bt_mean = float(akola_row[29])

    seasonal_df = pd.DataFrame({
        "season": seasons,
        "nbt_loculi_damage_pct": nbt_vals,
        "bt_loculi_damage_pct": bt_vals,
    })

    # Ambiguous cells noted in CLAUDE.md: AE (index 30) = 3.555 (2021-2023), AJ (index 35) = 33.633 (2021-22)
    ambiguous_annotations = {
        "cell_AE33": {"label": "2021-2023", "value": float(akola_row[30]), "status": "unverified"},
        "cell_AJ33": {"label": "2021-22", "value": float(akola_row[35]), "status": "unverified"},
    }

    # Parse BT_Loculi damage_AI sheet
    bt_loculi_df = pd.read_excel(raw_path, sheet_name="BT_Loculi damage_AI", header=3)
    bt_loculi_df.columns = [str(c).strip() for c in bt_loculi_df.columns]
    akola_loculi_rows = bt_loculi_df[bt_loculi_df["Location"].astype(str).str.strip().str.lower() == "akola"]
    
    modelled_loss = None
    if len(akola_loculi_rows) > 0:
        ak_row = akola_loculi_rows.iloc[0]
        modelled_loss = {
            "location": "Akola",
            "lat": float(ak_row["Lat"]),
            "lon": float(ak_row["Long"]),
            "observed_loculi_damage_pct": float(ak_row["Observed loculi damage (%)"]),
            "yield_loss_pct": float(ak_row["Yield loss"]),
        }

    result = {
        "sheets_available": valid_sheets,
        "excluded_sheets": ["rough"],
        "akola_seasonal_damage": seasonal_df.to_dict(orient="records"),
        "akola_bt_5season_mean": recorded_bt_mean,
        "calculated_bt_mean": bt_mean,
        "ambiguous_annotations": ambiguous_annotations,
        "modelled_loss_ai": modelled_loss,
    }

    if save_processed:
        DATA_PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
        seasonal_df.to_csv(DATA_PROCESSED_DIR / "pbw_annexure3_stationwise.csv", index=False)

    return result

# ---------------------------------------------------------------------------
# 7. Planetary Computer Validation Loader
# ---------------------------------------------------------------------------
def load_planetary_computer_validation(save_processed: bool = True) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Loads Microsoft Planetary Computer Sentinel-2 processing run for cross-validation only.
    Flags rows with valid_coverage_percent < 50% (5 rows).
    Computes comparative statistics against the primary GEE dataset.
    """
    raw_path = DATA_RAW_DIR / "Processed_AgroViz_Akola_Sentinel2_Indices.csv"
    if not raw_path.exists():
        raise FileNotFoundError(f"Planetary Computer validation file missing at {raw_path}")

    df = pd.read_csv(raw_path)
    if len(df) != 63:
        raise ValueError(f"Expected 63 rows in Planetary Computer run, found {len(df)}")

    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    df["low_coverage_flag"] = df["valid_coverage_percent"] < 50.0

    low_cov_count = int(df["low_coverage_flag"].sum())
    if low_cov_count != 5:
        logger.warning("Expected 5 rows with <50%% coverage, found %d", low_cov_count)

    # Cross-reference with primary GEE daily series
    _, gee_daily = load_sentinel2_indices(save_processed=False)
    merged = pd.merge(df, gee_daily, on="date", suffixes=("_pc", "_gee"))
    
    corr_ndvi = float(merged["NDVI_mean_pc"].corr(merged["NDVI_mean_gee"]))
    mean_diff_ndvi = float((merged["NDVI_mean_gee"] - merged["NDVI_mean_pc"]).mean())

    stats = {
        "total_scenes": len(df),
        "low_coverage_scenes_count": low_cov_count,
        "shared_dates_with_gee": len(merged),
        "ndvi_correlation": round(corr_ndvi, 4),
        "mean_ndvi_offset_bias": round(mean_diff_ndvi, 4),
        "note": "Planetary Computer values are systematically lower due to uncorrected 1000 DN processing baseline offset in Sentinel-2 PB >= 4.0",
    }

    if save_processed:
        DATA_PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
        df.to_csv(DATA_PROCESSED_DIR / "sentinel2_planetary_computer_comparison.csv", index=False)

    return df, stats

# ---------------------------------------------------------------------------
# 8. Sentinel-2 Scene Inventory Loader
# ---------------------------------------------------------------------------
def load_scene_inventory() -> pd.DataFrame:
    """Loads Sentinel-2 scene catalog inventory metadata (329 scenes, 74 dates)."""
    raw_path = DATA_RAW_DIR / "akola_sentinel2_inventory.csv"
    if not raw_path.exists():
        raise FileNotFoundError(f"Inventory dataset missing at {raw_path}")
    df = pd.read_csv(raw_path)
    if len(df) != 329:
        raise ValueError(f"Expected 329 inventory scenes, found {len(df)}")
    return df
