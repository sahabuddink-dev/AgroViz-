"""
Soil service module for AgroViz.
Handles ERA5-Land 3-layer soil moisture time series, ISRIC SoilGrids 2.0 physical depth profiles,
and in-situ soil sensor CSV upload validation with unit normalization.
"""

import io
import re
import math
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List

import numpy as np
import pandas as pd

from app.config import DATA_UPLOADS_DIR
from app.services.loaders import load_era5_soil_moisture, load_soilgrids

logger = logging.getLogger(__name__)

# Standard sensor CSV template
SOIL_SENSOR_CSV_TEMPLATE = (
    "date,sensor_id,depth_cm,soil_moisture,soil_temperature,electrical_conductivity\n"
    "2024-07-01,SENSOR_PDKV_01,10.0,0.342,28.4,0.45\n"
    "2024-07-01,SENSOR_PDKV_01,30.0,0.385,26.8,0.52\n"
    "2024-07-01,SENSOR_PDKV_01,60.0,0.410,25.2,0.48\n"
)

REQUIRED_SENSOR_COLUMNS = ["date", "sensor_id", "depth_cm", "soil_moisture"]


def get_soil_moisture_data(
    start: Optional[str] = None,
    end: Optional[str] = None,
    limit: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Retrieves daily ERA5-Land volumetric soil moisture across 3 layers:
    - Layer 1: 0–7 cm
    - Layer 2: 7–28 cm
    - Layer 3: 28–100 cm
    Calculates depth-wise descriptive statistics and actual layer-to-layer Pearson correlations.
    """
    df = load_era5_soil_moisture(save_processed=False)

    # Date filtering
    if start:
        df = df[df["date"] >= start]
    if end:
        df = df[df["date"] <= end]

    if df.empty:
        raise ValueError(f"No soil moisture records found for date range {start} to {end}")

    if limit and limit > 0:
        df = df.iloc[-limit:]

    start_date = str(df["date"].min())
    end_date = str(df["date"].max())

    l1 = df["sm_layer1_mean"]
    l2 = df["sm_layer2_mean"]
    l3 = df["sm_layer3_mean"]

    # Calculate actual Pearson correlations
    corr12 = float(l1.corr(l2)) if len(df) > 1 else 0.0
    corr13 = float(l1.corr(l3)) if len(df) > 1 else 0.0
    corr23 = float(l2.corr(l3)) if len(df) > 1 else 0.0

    stats = {
        "layer1": {
            "depth_range": "0–7 cm",
            "mean": round(float(l1.mean()), 4),
            "min": round(float(l1.min()), 4),
            "max": round(float(l1.max()), 4),
            "std": round(float(l1.std()), 4),
            "latest": round(float(l1.iloc[-1]), 4),
        },
        "layer2": {
            "depth_range": "7–28 cm",
            "mean": round(float(l2.mean()), 4),
            "min": round(float(l2.min()), 4),
            "max": round(float(l2.max()), 4),
            "std": round(float(l2.std()), 4),
            "latest": round(float(l2.iloc[-1]), 4),
        },
        "layer3": {
            "depth_range": "28–100 cm",
            "mean": round(float(l3.mean()), 4),
            "min": round(float(l3.min()), 4),
            "max": round(float(l3.max()), 4),
            "std": round(float(l3.std()), 4),
            "latest": round(float(l3.iloc[-1]), 4),
        },
    }

    # Monthly aggregations
    df_monthly = df.copy()
    df_monthly["month"] = pd.to_datetime(df_monthly["date"]).dt.strftime("%Y-%m")
    monthly_grouped = df_monthly.groupby("month").agg(
        l1_mean=("sm_layer1_mean", "mean"),
        l2_mean=("sm_layer2_mean", "mean"),
        l3_mean=("sm_layer3_mean", "mean"),
        days_count=("date", "count"),
    ).reset_index()

    monthly_summary = [
        {
            "month": str(r["month"]),
            "layer1_mean": round(float(r["l1_mean"]), 4),
            "layer2_mean": round(float(r["l2_mean"]), 4),
            "layer3_mean": round(float(r["l3_mean"]), 4),
            "days_count": int(r["days_count"]),
        }
        for _, r in monthly_grouped.iterrows()
    ]

    records = [
        {
            "date": str(r["date"]),
            "sm_layer1": round(float(r["sm_layer1_mean"]), 4),
            "sm_layer2": round(float(r["sm_layer2_mean"]), 4),
            "sm_layer3": round(float(r["sm_layer3_mean"]), 4),
        }
        for _, r in df.iterrows()
    ]

    return {
        "provenance": "model_estimated",
        "source": "ECMWF ERA5-Land via Google Earth Engine export",
        "units": "m³/m³ (presumed)",
        "period": f"{start_date} to {end_date}",
        "notes": [
            "ERA5-Land is a numerical land-surface model simulation (~11 km grid resolution), driven by atmospheric forcing, NOT an in-situ capacitive FDR/TDR soil probe.",
            "9 grid cells covering the 10 km circular AOI around 20.7069°N, 77.0022°E.",
            "Three standard depth layers: Layer 1 (0–7 cm), Layer 2 (7–28 cm), Layer 3 (28–100 cm).",
            "Subsoil layers (Layer 3) exhibit substantial thermal and moisture inertia compared to rapid surface layer fluctuations.",
            "Generic moisture thresholds (e.g. 0.28 or 0.25 m³/m³) are provisional statistical indicators, NOT field-calibrated wilting points for Akola Vertisols."
        ],
        "data": {
            "total_records": len(df),
            "start_date": start_date,
            "end_date": end_date,
            "statistics": stats,
            "correlations": {
                "layer1_layer2": round(corr12, 4),
                "layer1_layer3": round(corr13, 4),
                "layer2_layer3": round(corr23, 4),
            },
            "records": records,
            "monthly_summary": monthly_summary,
        },
    }


def get_soil_properties_data() -> Dict[str, Any]:
    """
    Retrieves ISRIC SoilGrids 2.0 static soil physical properties and depth profile:
    - 5 properties: Clay, Sand, Silt, pH, Soil Organic Carbon
    - 6 standardized depth intervals: 0–5 cm, 5–15 cm, 15–30 cm, 30–60 cm, 60–100 cm, 100–200 cm
    - USDA soil texture classification per depth and overall area mean (Clay).
    """
    records_df, summary = load_soilgrids(save_processed=False)

    records = [
        {
            "property": str(r["property"]),
            "depth": str(r["depth"]),
            "top_cm": int(r["top_cm"]),
            "bottom_cm": int(r["bottom_cm"]),
            "unit": str(r["unit"]),
            "mean": round(float(r["mean"]), 2),
            "count": int(r["count"]),
        }
        for _, r in records_df.iterrows()
    ]

    # Group by property for depth profiles
    depth_profiles = {}
    for prop in ["clay", "sand", "silt", "ph", "soc"]:
        prop_df = records_df[records_df["property"] == prop].sort_values(by="top_cm")
        depth_profiles[prop] = [
            {
                "depth": str(r["depth"]),
                "top_cm": int(r["top_cm"]),
                "bottom_cm": int(r["bottom_cm"]),
                "mean": round(float(r["mean"]), 2),
                "unit": str(r["unit"]),
            }
            for _, r in prop_df.iterrows()
        ]

    # Group by depth for texture composition
    depth_textures = summary.get("texture_by_depth", {})

    # Overall averages across the 6 depths
    overall_averages = {
        "clay_pct": round(float(records_df[records_df["property"] == "clay"]["mean"].mean()), 2),
        "sand_pct": round(float(records_df[records_df["property"] == "sand"]["mean"].mean()), 2),
        "silt_pct": round(float(records_df[records_df["property"] == "silt"]["mean"].mean()), 2),
        "ph": round(float(records_df[records_df["property"] == "ph"]["mean"].mean()), 2),
        "soc_gkg": round(float(records_df[records_df["property"] == "soc"]["mean"].mean()), 2),
        "usda_texture": str(summary.get("area_mean_texture", "Clay")),
    }

    return {
        "provenance": "model_estimated",
        "source": "ISRIC SoilGrids 2.0 (250m)",
        "units": "Clay/Sand/Silt: %, pH: pH (presumed H₂O), SOC: g/kg",
        "period": "Static snapshot",
        "notes": [
            "ISRIC SoilGrids 2.0 digital soil mapping snapshot at 250 m resolution, generated via machine learning on global profile databases.",
            "Pixel values are unweighted means of 4,419 pixels across the 10 km circular AOI around 20.7069°N, 77.0022°E.",
            "Not direct on-farm soil sampling or core analysis.",
            "USDA texture classification is derived from area-wide unweighted pixel averages across standard depths."
        ],
        "data": {
            "total_profile_records": len(records),
            "study_area": str(summary.get("study_area", "Akola 10km buffer")),
            "overall_texture": str(summary.get("area_mean_texture", "Clay")),
            "texture_basis": str(summary.get("texture_classification_basis", "area-mean based; indicative only")),
            "overall_averages": overall_averages,
            "texture_by_depth": depth_textures,
            "depth_profiles": depth_profiles,
            "records": records,
        },
    }


def get_soil_sensor_template() -> str:
    """Returns the standardized CSV template for in-situ soil sensors."""
    return SOIL_SENSOR_CSV_TEMPLATE


def validate_and_save_soil_sensor_upload(contents: bytes, filename: str) -> Dict[str, Any]:
    """
    Validates an uploaded in-situ soil sensor CSV file against the canonical schema:
    - Required columns: date, sensor_id, depth_cm, soil_moisture
    - Valid dates (YYYY-MM-DD)
    - Valid depth (0 to 200 cm)
    - Valid soil moisture (0.0 to 100.0)
    - Normalizes soil moisture to standard volumetric fraction (m³/m³, 0.0 to 1.0)
      while retaining original units and values.
    - Saves validated file to data/uploads/
    - Returns structured summary with provenance: user_provided
    """
    if not contents:
        raise ValueError("Uploaded file is empty (0 bytes).")

    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise ValueError(f"Unable to parse CSV file: {str(e)}")

    if df.empty:
        raise ValueError("Uploaded CSV contains no data rows.")

    # Column header validation
    clean_cols = [c.strip().lower() for c in df.columns]
    df.columns = clean_cols

    missing_cols = [c for c in REQUIRED_SENSOR_COLUMNS if c not in clean_cols]
    if missing_cols:
        raise ValueError(
            f"Missing required columns: {missing_cols}. "
            f"Required headers are: {REQUIRED_SENSOR_COLUMNS}."
        )

    errors = []
    normalized_records = []

    # Iterate and validate rows
    for idx, row in df.iterrows():
        row_num = idx + 2  # 1-indexed plus header

        # 1. Date validation
        raw_date = str(row["date"]).strip()
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", raw_date):
            errors.append(f"Row {row_num}: Invalid date format '{raw_date}'. Expected YYYY-MM-DD.")
            continue
        try:
            datetime.strptime(raw_date, "%Y-%m-%d")
        except ValueError:
            errors.append(f"Row {row_num}: Calendar date '{raw_date}' does not exist.")
            continue

        # 2. Sensor ID
        sensor_id = str(row["sensor_id"]).strip()
        if not sensor_id or sensor_id == "nan":
            errors.append(f"Row {row_num}: Missing sensor_id.")
            continue

        # 3. Depth validation
        try:
            depth_cm = float(row["depth_cm"])
            if depth_cm < 0.0 or depth_cm > 200.0 or math.isnan(depth_cm):
                errors.append(f"Row {row_num}: Depth {depth_cm} cm out of realistic bounds (0 to 200 cm).")
                continue
        except (ValueError, TypeError):
            errors.append(f"Row {row_num}: Invalid numeric depth_cm '{row['depth_cm']}'.")
            continue

        # 4. Moisture validation & normalization
        try:
            raw_moist = float(row["soil_moisture"])
            if raw_moist < 0.0 or raw_moist > 100.0 or math.isnan(raw_moist):
                errors.append(
                    f"Row {row_num}: Soil moisture {raw_moist} out of physical range (0.0 to 100.0)."
                )
                continue

            # Unit normalization
            if raw_moist > 1.0:
                # Value was supplied as percentage (e.g. 34.2%)
                normalized_m3m3 = round(raw_moist / 100.0, 4)
                original_unit = "%"
            else:
                # Value was supplied as volumetric fraction (e.g. 0.342)
                normalized_m3m3 = round(raw_moist, 4)
                original_unit = "m³/m³"

        except (ValueError, TypeError):
            errors.append(f"Row {row_num}: Invalid numeric soil_moisture '{row['soil_moisture']}'.")
            continue

        # Optional fields
        soil_temp = None
        if "soil_temperature" in df.columns and pd.notna(row["soil_temperature"]):
            try:
                soil_temp = round(float(row["soil_temperature"]), 2)
                if soil_temp < -20.0 or soil_temp > 70.0:
                    errors.append(f"Row {row_num}: Soil temperature {soil_temp}°C out of range (-20 to 70°C).")
                    continue
            except (ValueError, TypeError):
                errors.append(f"Row {row_num}: Invalid numeric soil_temperature '{row['soil_temperature']}'.")
                continue

        ec = None
        if "electrical_conductivity" in df.columns and pd.notna(row["electrical_conductivity"]):
            try:
                ec = round(float(row["electrical_conductivity"]), 3)
                if ec < 0.0 or ec > 30.0:
                    errors.append(f"Row {row_num}: Electrical conductivity {ec} dS/m out of range (0 to 30 dS/m).")
                    continue
            except (ValueError, TypeError):
                errors.append(f"Row {row_num}: Invalid numeric electrical_conductivity '{row['electrical_conductivity']}'.")
                continue

        normalized_records.append({
            "date": raw_date,
            "sensor_id": sensor_id,
            "depth_cm": depth_cm,
            "original_moisture": raw_moist,
            "original_unit": original_unit,
            "normalized_moisture_m3m3": normalized_m3m3,
            "soil_temperature": soil_temp,
            "electrical_conductivity": ec,
        })

    if errors:
        max_reported = 10
        summary_errors = errors[:max_reported]
        if len(errors) > max_reported:
            summary_errors.append(f"...and {len(errors) - max_reported} more validation errors.")
        raise ValueError("CSV validation failed: " + "; ".join(summary_errors))

    if not normalized_records:
        raise ValueError("No valid records could be processed from the uploaded file.")

    # Save to data/uploads/
    DATA_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    clean_filename = re.sub(r"[^a-zA-Z0-9_.-]", "_", filename)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    saved_filename = f"soil_sensor_{timestamp}_{clean_filename}"
    saved_path = DATA_UPLOADS_DIR / saved_filename

    norm_df = pd.DataFrame(normalized_records)
    norm_df.to_csv(saved_path, index=False)
    logger.info("Successfully validated and saved in-situ soil sensor log to %s", saved_path)

    sensors = norm_df["sensor_id"].unique().tolist()
    depths = sorted(norm_df["depth_cm"].unique().tolist())
    date_min = str(norm_df["date"].min())
    date_max = str(norm_df["date"].max())
    mean_moist = round(float(norm_df["normalized_moisture_m3m3"].mean()), 4)

    return {
        "status": "success",
        "provenance": "user_provided",
        "source": "User-Uploaded In-Situ Soil Sensor Log",
        "units": "m³/m³ (normalized from original input)",
        "period": f"{date_min} to {date_max}",
        "filename": saved_filename,
        "total_rows": len(norm_df),
        "sensors": sensors,
        "depths_measured_cm": depths,
        "date_range": {"start": date_min, "end": date_max},
        "mean_normalized_moisture_m3m3": mean_moist,
        "preview": normalized_records[:10],
        "notes": [
            "Uploaded sensor records are stored in data/uploads/ as user_provided data.",
            "Values have been normalized to volumetric fraction (m³/m³).",
            "This upload provides in-situ ground truth for field-specific moisture monitoring.",
            "Not automatically merged with ERA5-Land model reanalysis."
        ],
    }
