"""
Zone management and multi-sensor data service for AgroViz SIH25099.
Manages the 30 monitoring zones across the Vidarbha / Akola cotton belt.
Integrates:
- Multi-band Sentinel-2 surface reflectance and indices (NDVI, NDRE, NDMI, BSI)
- Sentinel-1 SAR GRD dual-polarization backscatter (VH, VV in dB and linear)
- ERA5-Land gridded daily temperature and 3-layer soil water
- CHIRPS high-resolution daily rainfall
- ISRIC SoilGrids 2.0 depth profiles and terrain attributes (slope, elevation)
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

from app.config import DATA_RAW_DIR

logger = logging.getLogger(__name__)

# File paths
ZONES_GEO_PATH = DATA_RAW_DIR / "AgroViz_zones.csv"
S2_CLEAN_PATH = DATA_RAW_DIR / "AgroViz_Sentinel2_zone_daily_clean_2023-06-01_2025-01-01.csv"
S1_SAR_PATH = DATA_RAW_DIR / "AgroViz_zones_S1_2023-06-01_2025-01-01.csv"
ERA5_PATH = DATA_RAW_DIR / "AgroViz_zones_ERA5Land_2023-06-01_2025-01-01.csv"
CHIRPS_PATH = DATA_RAW_DIR / "AgroViz_zones_CHIRPS_2023-06-01_2025-01-01.csv"
STATIC_SOIL_PATH = DATA_RAW_DIR / "AgroViz_zones_static_soilgrids_terrain.csv"

# In-memory caches
_cache_zones_df: Optional[pd.DataFrame] = None
_cache_s2_df: Optional[pd.DataFrame] = None
_cache_s1_df: Optional[pd.DataFrame] = None
_cache_era5_df: Optional[pd.DataFrame] = None
_cache_chirps_df: Optional[pd.DataFrame] = None
_cache_static_df: Optional[pd.DataFrame] = None


def _get_zones_df() -> pd.DataFrame:
    global _cache_zones_df
    if _cache_zones_df is None:
        if not ZONES_GEO_PATH.exists():
            raise FileNotFoundError(f"Missing {ZONES_GEO_PATH}")
        df = pd.read_csv(ZONES_GEO_PATH)
        df["zone_id"] = df["zone_id"].astype(int)
        _cache_zones_df = df
    return _cache_zones_df


def _get_s2_df() -> pd.DataFrame:
    global _cache_s2_df
    if _cache_s2_df is None:
        if not S2_CLEAN_PATH.exists():
            raise FileNotFoundError(f"Missing {S2_CLEAN_PATH}")
        df = pd.read_csv(S2_CLEAN_PATH)
        df["zone_id"] = df["zone_id"].astype(int)
        df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
        _cache_s2_df = df
    return _cache_s2_df


def _get_s1_df() -> pd.DataFrame:
    global _cache_s1_df
    if _cache_s1_df is None:
        if not S1_SAR_PATH.exists():
            raise FileNotFoundError(f"Missing {S1_SAR_PATH}")
        df = pd.read_csv(S1_SAR_PATH)
        df["zone_id"] = df["zone_id"].astype(int)
        df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
        _cache_s1_df = df
    return _cache_s1_df


def _get_era5_df() -> pd.DataFrame:
    global _cache_era5_df
    if _cache_era5_df is None:
        if not ERA5_PATH.exists():
            raise FileNotFoundError(f"Missing {ERA5_PATH}")
        df = pd.read_csv(ERA5_PATH)
        df["zone_id"] = df["zone_id"].astype(int)
        df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
        _cache_era5_df = df
    return _cache_era5_df


def _get_chirps_df() -> pd.DataFrame:
    global _cache_chirps_df
    if _cache_chirps_df is None:
        if not CHIRPS_PATH.exists():
            raise FileNotFoundError(f"Missing {CHIRPS_PATH}")
        df = pd.read_csv(CHIRPS_PATH)
        df["zone_id"] = df["zone_id"].astype(int)
        df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
        _cache_chirps_df = df
    return _cache_chirps_df


def _get_static_df() -> pd.DataFrame:
    global _cache_static_df
    if _cache_static_df is None:
        if not STATIC_SOIL_PATH.exists():
            raise FileNotFoundError(f"Missing {STATIC_SOIL_PATH}")
        df = pd.read_csv(STATIC_SOIL_PATH)
        df["zone_id"] = df["zone_id"].astype(int)
        _cache_static_df = df
    return _cache_static_df


def _classify_canopy_stress(ndvi: float, bsi: float) -> Dict[str, Any]:
    """Preliminary agronomic classification based on canopy vigor and bare soil exposure."""
    if np.isnan(ndvi):
        return {"stress_class": "Unknown", "code": -1, "label": "No Data"}
    if ndvi >= 0.55:
        return {"stress_class": "Healthy", "code": 0, "label": "Robust Canopy (High Vigor)"}
    elif ndvi >= 0.40:
        return {"stress_class": "Moderate Stress", "code": 1, "label": "Moderate Vegetative Stress"}
    elif ndvi >= 0.25:
        return {"stress_class": "Severe Stress", "code": 2, "label": "Severe Stress / Senescence"}
    else:
        return {"stress_class": "Bare Soil", "code": 3, "label": "Fallow / Bare Soil"}


def get_all_zones() -> List[Dict[str, Any]]:
    """Returns a list of all 30 monitoring zones with latest multi-sensor metrics."""
    zones_df = _get_zones_df()
    s2_df = _get_s2_df()
    s1_df = _get_s1_df()
    era5_df = _get_era5_df()
    chirps_df = _get_chirps_df()
    static_df = _get_static_df()

    # Get latest records
    latest_s2 = s2_df.sort_values("date").groupby("zone_id").last().reset_index()
    latest_s1 = s1_df.sort_values("date").groupby("zone_id").last().reset_index()
    latest_era5 = era5_df.sort_values("date").groupby("zone_id").last().reset_index()
    latest_chirps = chirps_df.sort_values("date").groupby("zone_id").last().reset_index()

    zones_list = []
    for _, zrow in zones_df.iterrows():
        zid = int(zrow["zone_id"])
        
        # Merge latest S2
        s2_match = latest_s2[latest_s2["zone_id"] == zid]
        ndvi = float(s2_match["NDVI"].values[0]) if not s2_match.empty else None
        ndre = float(s2_match["NDRE"].values[0]) if not s2_match.empty else None
        ndmi = float(s2_match["NDMI"].values[0]) if not s2_match.empty else None
        bsi = float(s2_match["BSI"].values[0]) if not s2_match.empty else None
        s2_date = str(s2_match["date"].values[0]) if not s2_match.empty else None

        # Merge latest S1 SAR
        s1_match = latest_s1[latest_s1["zone_id"] == zid]
        vh_db = float(s1_match["VH_mean_dB"].values[0]) if not s1_match.empty else None
        vv_db = float(s1_match["VV_mean_dB"].values[0]) if not s1_match.empty else None
        sar_ratio = round(vh_db - vv_db, 2) if (vh_db is not None and vv_db is not None) else None
        s1_date = str(s1_match["date"].values[0]) if not s1_match.empty else None

        # Merge latest ERA5
        era5_match = latest_era5[latest_era5["zone_id"] == zid]
        temp_2m = round(float(era5_match["temperature_2m"].values[0]) - 273.15, 1) if not era5_match.empty else None
        sm_l1 = round(float(era5_match["volumetric_soil_water_layer_1"].values[0]), 3) if not era5_match.empty else None

        # Merge latest CHIRPS
        chirps_match = latest_chirps[latest_chirps["zone_id"] == zid]
        rain_mm = round(float(chirps_match["first"].values[0]), 1) if not chirps_match.empty else 0.0

        # Static terrain
        st_match = static_df[static_df["zone_id"] == zid]
        elevation = round(float(st_match["elevation_m"].values[0]), 1) if not st_match.empty else None
        slope = round(float(st_match["slope_deg"].values[0]), 1) if not st_match.empty else None

        stress = _classify_canopy_stress(ndvi if ndvi is not None else np.nan, bsi if bsi is not None else np.nan)

        # Parse polygon bounds
        try:
            geo_obj = json.loads(zrow[".geo"])
        except Exception:
            geo_obj = None

        zones_list.append({
            "zone_id": zid,
            "name": f"Monitoring Zone {zid}",
            "region": "Akola Cotton Belt, Maharashtra",
            "latitude": round(float(zrow["lat"]), 5),
            "longitude": round(float(zrow["lon"]), 5),
            "elevation_m": elevation,
            "slope_deg": slope,
            "latest_s2_date": s2_date,
            "ndvi": round(ndvi, 3) if ndvi is not None else None,
            "ndre": round(ndre, 3) if ndre is not None else None,
            "ndmi": round(ndmi, 3) if ndmi is not None else None,
            "bsi": round(bsi, 3) if bsi is not None else None,
            "latest_s1_date": s1_date,
            "vh_db": round(vh_db, 2) if vh_db is not None else None,
            "vv_db": round(vv_db, 2) if vv_db is not None else None,
            "sar_ratio_db": sar_ratio,
            "temperature_c": temp_2m,
            "soil_moisture_l1": sm_l1,
            "rainfall_latest_mm": rain_mm,
            "crop_stress": stress["stress_class"],
            "stress_label": stress["label"],
            "geometry": geo_obj,
        })

    return sorted(zones_list, key=lambda x: x["zone_id"])


def get_zones_geojson() -> Dict[str, Any]:
    """Returns a GeoJSON FeatureCollection containing all 30 zones with summary properties."""
    zones = get_all_zones()
    features = []
    for z in zones:
        geom = z.get("geometry")
        if not geom:
            continue
        props = {k: v for k, v in z.items() if k != "geometry"}
        features.append({
            "type": "Feature",
            "id": z["zone_id"],
            "geometry": geom,
            "properties": props,
        })
    return {
        "type": "FeatureCollection",
        "features": features,
    }


def get_zone_detail(zone_id: int) -> Dict[str, Any]:
    """Retrieves full profile, static soil/terrain, and latest indicators for one zone."""
    zones = get_all_zones()
    match = [z for z in zones if z["zone_id"] == zone_id]
    if not match:
        raise ValueError(f"Zone ID {zone_id} not found (valid range: 1 to 30).")
    
    zone_base = match[0]

    # Get static soil details
    st_df = _get_static_df()
    st_match = st_df[st_df["zone_id"] == zone_id]
    soil_profile = {}
    if not st_match.empty:
        r = st_match.iloc[0]
        soil_profile = {
            "clay_0_5cm": round(float(r.get("clay_0-5cm_mean", 0)), 1),
            "clay_5_15cm": round(float(r.get("clay_5-15cm_mean", 0)), 1),
            "clay_15_30cm": round(float(r.get("clay_15-30cm_mean", 0)), 1),
            "clay_30_60cm": round(float(r.get("clay_30-60cm_mean", 0)), 1),
            "clay_60_100cm": round(float(r.get("clay_60-100cm_mean", 0)), 1),
            "sand_0_5cm": round(float(r.get("sand_0-5cm_mean", 0)), 1),
            "silt_0_5cm": round(float(r.get("silt_0-5cm_mean", 0)), 1),
            "ph_0_5cm": round(float(r.get("phh2o_0-5cm_mean", 0)) / 10.0, 2),  # SoilGrids pH is scaled by 10
            "soc_0_5cm": round(float(r.get("soc_0-5cm_mean", 0)) / 10.0, 2),   # Organic carbon dg/kg -> g/kg
        }

    return {
        "zone": zone_base,
        "soil_profile": soil_profile,
    }


def get_zone_series(
    zone_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Returns time-synchronized daily observations for the specified zone.
    Combines Sentinel-2 optical, Sentinel-1 SAR, ERA5-Land weather/soil, and CHIRPS rainfall.
    """
    s2_df = _get_s2_df()
    s1_df = _get_s1_df()
    era5_df = _get_era5_df()
    chirps_df = _get_chirps_df()

    # Filter by zone
    s2_zone = s2_df[s2_df["zone_id"] == zone_id].copy()
    s1_zone = s1_df[s1_df["zone_id"] == zone_id].copy()
    era5_zone = era5_df[era5_df["zone_id"] == zone_id].copy()
    chirps_zone = chirps_df[chirps_df["zone_id"] == zone_id].copy()

    if s2_zone.empty:
        raise ValueError(f"Zone ID {zone_id} has no observations.")

    # Filter by date if specified
    if start_date:
        s2_zone = s2_zone[s2_zone["date"] >= start_date]
        s1_zone = s1_zone[s1_zone["date"] >= start_date]
        era5_zone = era5_zone[era5_zone["date"] >= start_date]
        chirps_zone = chirps_zone[chirps_zone["date"] >= start_date]
    if end_date:
        s2_zone = s2_zone[s2_zone["date"] <= end_date]
        s1_zone = s1_zone[s1_zone["date"] <= end_date]
        era5_zone = era5_zone[era5_zone["date"] <= end_date]
        chirps_zone = chirps_zone[chirps_zone["date"] <= end_date]

    # Convert S2 observations to records
    s2_records = []
    for _, r in s2_zone.iterrows():
        s2_records.append({
            "date": r["date"],
            "NDVI": round(float(r["NDVI"]), 4) if pd.notna(r["NDVI"]) else None,
            "NDRE": round(float(r["NDRE"]), 4) if pd.notna(r["NDRE"]) else None,
            "NDMI": round(float(r["NDMI"]), 4) if pd.notna(r["NDMI"]) else None,
            "BSI": round(float(r["BSI"]), 4) if pd.notna(r["BSI"]) else None,
            "cloud_pct": round(float(r["cloud_pct_weighted"]), 2) if pd.notna(r.get("cloud_pct_weighted")) else None,
            "B2": round(float(r["B2_reflectance"]), 4) if pd.notna(r.get("B2_reflectance")) else None,
            "B3": round(float(r["B3_reflectance"]), 4) if pd.notna(r.get("B3_reflectance")) else None,
            "B4": round(float(r["B4_reflectance"]), 4) if pd.notna(r.get("B4_reflectance")) else None,
            "B5": round(float(r["B5_reflectance"]), 4) if pd.notna(r.get("B5_reflectance")) else None,
            "B8": round(float(r["B8_reflectance"]), 4) if pd.notna(r.get("B8_reflectance")) else None,
            "B8A": round(float(r["B8A_reflectance"]), 4) if pd.notna(r.get("B8A_reflectance")) else None,
            "B11": round(float(r["B11_reflectance"]), 4) if pd.notna(r.get("B11_reflectance")) else None,
            "B12": round(float(r["B12_reflectance"]), 4) if pd.notna(r.get("B12_reflectance")) else None,
        })

    # S1 SAR records
    s1_records = []
    for _, r in s1_zone.iterrows():
        vh = float(r["VH_mean_dB"]) if pd.notna(r["VH_mean_dB"]) else None
        vv = float(r["VV_mean_dB"]) if pd.notna(r["VV_mean_dB"]) else None
        ratio = round(vh - vv, 2) if (vh is not None and vv is not None) else None
        s1_records.append({
            "date": r["date"],
            "vh_db": round(vh, 2) if vh is not None else None,
            "vv_db": round(vv, 2) if vv is not None else None,
            "sar_ratio_db": ratio,
            "orbit_pass": r.get("orbit_pass"),
        })

    # Environmental weather records (daily)
    era5_records = []
    for _, r in era5_zone.iterrows():
        t2m = float(r["temperature_2m"]) - 273.15 if pd.notna(r["temperature_2m"]) else None
        tmax = float(r["temperature_2m_max"]) - 273.15 if pd.notna(r["temperature_2m_max"]) else None
        tmin = float(r["temperature_2m_min"]) - 273.15 if pd.notna(r["temperature_2m_min"]) else None
        sm1 = float(r["volumetric_soil_water_layer_1"]) if pd.notna(r["volumetric_soil_water_layer_1"]) else None
        sm2 = float(r["volumetric_soil_water_layer_2"]) if pd.notna(r["volumetric_soil_water_layer_2"]) else None
        sm3 = float(r["volumetric_soil_water_layer_3"]) if pd.notna(r["volumetric_soil_water_layer_3"]) else None

        era5_records.append({
            "date": r["date"],
            "temp_mean_c": round(t2m, 2) if t2m is not None else None,
            "temp_max_c": round(tmax, 2) if tmax is not None else None,
            "temp_min_c": round(tmin, 2) if tmin is not None else None,
            "soil_moisture_layer1": round(sm1, 3) if sm1 is not None else None,
            "soil_moisture_layer2": round(sm2, 3) if sm2 is not None else None,
            "soil_moisture_layer3": round(sm3, 3) if sm3 is not None else None,
        })

    # CHIRPS rainfall
    chirps_records = []
    for _, r in chirps_zone.iterrows():
        p = float(r["first"]) if pd.notna(r["first"]) else 0.0
        chirps_records.append({
            "date": r["date"],
            "rainfall_mm": round(p, 2),
        })

    return {
        "zone_id": zone_id,
        "counts": {
            "sentinel2_dates": len(s2_records),
            "sentinel1_dates": len(s1_records),
            "weather_dates": len(era5_records),
            "rainfall_dates": len(chirps_records),
        },
        "sentinel2_series": s2_records,
        "sentinel1_series": s1_records,
        "environmental_series": era5_records,
        "rainfall_series": chirps_records,
    }
