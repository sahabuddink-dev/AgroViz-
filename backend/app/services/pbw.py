import os
import io
import math
import logging
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import numpy as np
from datetime import datetime

from ..config import DATA_PROCESSED_DIR, DATA_UPLOADS_DIR
from .loaders import load_weather, load_annexure_3, load_annexure_4

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Degree-Day Parameter Sets (CLAUDE.md Section 5.10)
# ---------------------------------------------------------------------------
PARAMETER_SETS = {
    "A": {
        "set_id": "A",
        "title": "Set A (Default, Indian Cotton States)",
        "lower_threshold_c": 13.4,
        "upper_threshold_c": 35.5,
        "dd_per_generation": 503.62,
        "method": "single_sine_horizontal_cutoff",
        "citation": "Scientific Reports 11:436 (2021). 'Degree day-based model predicts pink bollworm phenology across geographical locations', DOI 10.1038/s41598-020-80184-6.",
        "region": "Indian cotton growing tracts (Central and South zones)",
        "notes": "Parameter set calibrated from Indian field studies on Pectinophora gossypiella.",
    },
    "B": {
        "set_id": "B",
        "title": "Set B (Alternative, California Field Calibration)",
        "lower_threshold_c": 13.9,
        "upper_threshold_c": 32.8,
        "dd_per_generation": 492.0,
        "method": "single_sine_horizontal_cutoff",
        "citation": "Beasley, C.A. & Adams, C.J. (1996). 'Field-based degree-day model for pink bollworm development in cotton', J. Econ. Entomol. 89:881-890, DOI 10.1093/jee/89.4.881; also UC IPM.",
        "region": "California desert cotton valleys",
        "notes": "Alternative benchmark set from historical literature, lower upper threshold (32.8°C).",
    },
}

MANDATORY_NOTICES = [
    "Thermal development potential, not an observation of pests.",
    "Parameters are literature values from other regions and are not validated against Akola field data.",
    "NASA POWER is reanalysis, not a station.",
    "Start date is user-selected: actual cotton sowing date for Akola is not recorded in the dataset."
]

REQUIRED_UPLOAD_COLUMNS = [
    "date", "latitude", "longitude", "location_name",
    "observation_type", "value", "unit", "crop_stage", "source", "method"
]
VALID_OBSERVATION_TYPES = {"trap_count", "boll_damage_pct", "other"}

# ---------------------------------------------------------------------------
# Single Sine with Horizontal Cutoff Algorithm
# ---------------------------------------------------------------------------
def single_sine_horizontal_cutoff(
    tmin: float,
    tmax: float,
    lower_threshold: float,
    upper_threshold: float
) -> float:
    """
    Computes daily physiological heat units (degree-days) using the Baskerville & Emin (1969)
    single-sine algorithm with horizontal upper cutoff (truncation).
    
    Tmin > Tmax raises ValueError.
    Tmax <= lower_threshold gives 0.0.
    Tmax above upper_threshold is capped.
    """
    if tmin > tmax:
        raise ValueError(f"Invalid input: Tmin ({tmin}) cannot exceed Tmax ({tmax}).")

    L = lower_threshold
    U = upper_threshold

    # Case 1: Entire day below developmental threshold
    if tmax <= L:
        return 0.0

    # Case 2: Entire day above upper cutoff (horizontal cutoff: capped at U - L)
    if tmin >= U:
        return float(U - L)

    alpha = (tmax + tmin) / 2.0
    w = (tmax - tmin) / 2.0

    # Case 3: Completely within lower and upper thresholds
    if tmin >= L and tmax <= U:
        return float(alpha - L)

    # Case 4: Drops below L, does not exceed U
    if tmin < L and tmax <= U:
        ratio = max(-1.0, min(1.0, (L - alpha) / w))
        theta1 = math.asin(ratio)
        dd = (1.0 / math.pi) * ((alpha - L) * (math.pi / 2.0 - theta1) + w * math.cos(theta1))
        return max(0.0, float(dd))

    # Case 5: Stays above L, exceeds U
    if tmin >= L and tmax > U:
        ratio = max(-1.0, min(1.0, (U - alpha) / w))
        theta2 = math.asin(ratio)
        dd = (alpha - L) - (1.0 / math.pi) * ((alpha - U) * (math.pi / 2.0 - theta2) + w * math.cos(theta2))
        return max(0.0, float(dd))

    # Case 6: Drops below L and exceeds U
    if tmin < L and tmax > U:
        ratio1 = max(-1.0, min(1.0, (L - alpha) / w))
        ratio2 = max(-1.0, min(1.0, (U - alpha) / w))
        theta1 = math.asin(ratio1)
        theta2 = math.asin(ratio2)
        dd = (1.0 / math.pi) * (
            (alpha - L) * (theta2 - theta1)
            + w * (math.cos(theta1) - math.cos(theta2))
            + (U - L) * (math.pi / 2.0 - theta2)
        )
        return max(0.0, float(dd))

    return 0.0

def calculate_degree_days(
    param_set_key: str = "both",
    start_date: str = "2023-06-01",
    end_date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Calculates single-sine degree-days and potential generations from cleaned weather records.
    Supports Set A, Set B, or 'both' for side-by-side comparative analysis.
    """
    weather_path = DATA_PROCESSED_DIR / "weather_cleaned.csv"
    if weather_path.exists():
        df = pd.read_csv(weather_path)
    else:
        df = load_weather(save_processed=True)

    df = df[df["date"] >= start_date].copy()
    if end_date:
        df = df[df["date"] <= end_date].copy()

    if df.empty:
        raise ValueError(f"No weather observations found for date window {start_date} to {end_date}")

    df = df.sort_values(by="date").reset_index(drop=True)

    # Compute daily DD for Set A and Set B
    set_a = PARAMETER_SETS["A"]
    set_b = PARAMETER_SETS["B"]

    dd_a = [
        single_sine_horizontal_cutoff(r["t2m_min"], r["t2m_max"], set_a["lower_threshold_c"], set_a["upper_threshold_c"])
        for _, r in df.iterrows()
    ]
    dd_b = [
        single_sine_horizontal_cutoff(r["t2m_min"], r["t2m_max"], set_b["lower_threshold_c"], set_b["upper_threshold_c"])
        for _, r in df.iterrows()
    ]

    df["daily_dd_a"] = [round(v, 2) for v in dd_a]
    df["cum_dd_a"] = [round(v, 2) for v in np.cumsum(dd_a)]
    df["potential_gen_a"] = [round(v / set_a["dd_per_generation"], 3) for v in df["cum_dd_a"]]

    df["daily_dd_b"] = [round(v, 2) for v in dd_b]
    df["cum_dd_b"] = [round(v, 2) for v in np.cumsum(dd_b)]
    df["potential_gen_b"] = [round(v / set_b["dd_per_generation"], 3) for v in df["cum_dd_b"]]

    # Monthly aggregation
    df["year_month"] = df["date"].str.slice(0, 7)
    monthly_grouped = df.groupby("year_month").agg(
        days=("date", "count"),
        monthly_dd_a=("daily_dd_a", "sum"),
        monthly_dd_b=("daily_dd_b", "sum"),
        mean_tmax=("t2m_max", "mean"),
        mean_tmin=("t2m_min", "mean"),
    ).reset_index()

    monthly_grouped["cum_dd_a"] = np.cumsum(monthly_grouped["monthly_dd_a"]).round(2)
    monthly_grouped["cum_dd_b"] = np.cumsum(monthly_grouped["monthly_dd_b"]).round(2)
    monthly_grouped["gen_a"] = (monthly_grouped["cum_dd_a"] / set_a["dd_per_generation"]).round(2)
    monthly_grouped["gen_b"] = (monthly_grouped["cum_dd_b"] / set_b["dd_per_generation"]).round(2)

    monthly_summaries = []
    for _, m_row in monthly_grouped.iterrows():
        monthly_summaries.append({
            "year_month": str(m_row["year_month"]),
            "days_count": int(m_row["days"]),
            "monthly_dd_a": round(float(m_row["monthly_dd_a"]), 2),
            "cum_dd_a": round(float(m_row["cum_dd_a"]), 2),
            "potential_gen_a": float(m_row["gen_a"]),
            "monthly_dd_b": round(float(m_row["monthly_dd_b"]), 2),
            "cum_dd_b": round(float(m_row["cum_dd_b"]), 2),
            "potential_gen_b": float(m_row["gen_b"]),
            "mean_tmax": round(float(m_row["mean_tmax"]), 2),
            "mean_tmin": round(float(m_row["mean_tmin"]), 2),
        })

    total_cum_a = float(df["cum_dd_a"].iloc[-1])
    total_cum_b = float(df["cum_dd_b"].iloc[-1])
    final_gen_a = float(df["potential_gen_a"].iloc[-1])
    final_gen_b = float(df["potential_gen_b"].iloc[-1])

    daily_series = []
    for _, r in df.iterrows():
        daily_series.append({
            "date": str(r["date"]),
            "t2m_max": round(float(r["t2m_max"]), 2),
            "t2m_min": round(float(r["t2m_min"]), 2),
            "t2m": round(float(r["t2m"]), 2),
            "daily_dd_a": float(r["daily_dd_a"]),
            "cum_dd_a": float(r["cum_dd_a"]),
            "potential_gen_a": float(r["potential_gen_a"]),
            "daily_dd_b": float(r["daily_dd_b"]),
            "cum_dd_b": float(r["cum_dd_b"]),
            "potential_gen_b": float(r["potential_gen_b"]),
        })

    return {
        "start_date": start_date,
        "end_date": str(df["date"].max()),
        "days_accumulated": int(len(df)),
        "parameter_sets": {
            "set_A": set_a,
            "set_B": set_b,
        },
        "summary": {
            "set_A": {
                "accumulated_degree_days": total_cum_a,
                "potential_generations": round(final_gen_a, 2),
                "daily_average_dd": round(total_cum_a / len(df), 2),
                "dd_per_generation": set_a["dd_per_generation"],
            },
            "set_B": {
                "accumulated_degree_days": total_cum_b,
                "potential_generations": round(final_gen_b, 2),
                "daily_average_dd": round(total_cum_b / len(df), 2),
                "dd_per_generation": set_b["dd_per_generation"],
            },
        },
        "mandatory_notices": MANDATORY_NOTICES,
        "monthly_summaries": monthly_summaries,
        "daily_series": daily_series,
    }

# ---------------------------------------------------------------------------
# Published Context Service (Annexures 3 and 4)
# ---------------------------------------------------------------------------
def get_pbw_context() -> Dict[str, Any]:
    """
    Retrieves published historical PBW context data from Fand et al. (2025).
    Maintains strict separation between Annexure 3 stationwise data and Annexure 4 multilocation survey.
    """
    annex3_data = load_annexure_3(save_processed=False)
    annex4_df = load_annexure_4(save_processed=False)

    # Annexure 4: Extract Maharashtra subset and Paras record
    mh_df = annex4_df[annex4_df["State"] == "Maharashtra"].copy()
    paras_row = mh_df[mh_df["Location"] == "Paras"].iloc[0].to_dict()

    locations_list = []
    for _, row in annex4_df.iterrows():
        locations_list.append({
            "state": str(row["State"]),
            "district": str(row.get("District", "")),
            "location": str(row["Location"]),
            "latitude": float(row["Latitude"]),
            "longitude": float(row["Longitude"]),
            "yield_loss_pbw_pct": round(float(row["Yield loss (%)_PBW"]), 3),
            "yield_loss_br_pct": round(float(row["Yield loss (%)_BR"]), 3),
            "is_akola": str(row.get("District", "")).lower() == "akola",
        })

    return {
        "provenance": "measured",
        "citation": "Fand, B.B. et al. (2025). Agricultural Systems 224:104246, DOI 10.1016/j.agsy.2024.104246; Mendeley Data DOI 10.17632/2xp6xvct2x.1.",
        "temporal_overlap_notice": "Published survey records cover 2015-16 to 2022-23 annual seasons. Zero temporal overlap with 2023-2024 environmental monitoring. No statistical or predictive linkage may be derived.",
        "annexure_3": {
            "title": "Annexure 3 — Station-wise Historical Seasonal Loculi Damage (Akola)",
            "source": "AICRP-Stationwise data",
            "akola_seasons": annex3_data["akola_seasonal_damage"],
            "published_5season_bt_mean": annex3_data["akola_bt_5season_mean"],
            "calculated_5season_bt_mean": annex3_data["calculated_bt_mean"],
            "nbt_disclaimer": "NBt is presumed non-Bt cotton (unconfirmed in original survey documentation).",
            "ambiguous_annotations": annex3_data["ambiguous_annotations"],
            "modelled_ai_loss": annex3_data["modelled_loss_ai"],
        },
        "annexure_4": {
            "title": "Annexure 4 — Multi-Location Cotton Yield Loss Survey (India)",
            "total_surveyed_locations": len(annex4_df),
            "maharashtra_locations_count": len(mh_df),
            "akola_paras_record": {
                "district": "Akola",
                "location": "Paras",
                "latitude": float(paras_row["Latitude"]),
                "longitude": float(paras_row["Longitude"]),
                "yield_loss_pbw_pct": round(float(paras_row["Yield loss (%)_PBW"]), 3),
                "yield_loss_boll_rot_pct": round(float(paras_row["Yield loss (%)_BR"]), 3),
                "caveat": "Boll rot yield loss (10.689%) and PBW yield loss (4.428%) are independent pathology categories and must never be conflated or averaged.",
            },
            "maharashtra_summary": {
                "mean_pbw_loss_pct": round(float(mh_df["Yield loss (%)_PBW"].mean()), 2),
                "max_pbw_loss_pct": round(float(mh_df["Yield loss (%)_PBW"].max()), 2),
                "min_pbw_loss_pct": round(float(mh_df["Yield loss (%)_PBW"].min()), 2),
            },
            "locations": locations_list,
        },
    }

# ---------------------------------------------------------------------------
# Observed Pest Data Status, Template & Validation Service
# ---------------------------------------------------------------------------
def get_pbw_status() -> Dict[str, Any]:
    """
    Returns the explicit 'data unavailable' status for dated field pest observations,
    explaining data requirements and listing staged files.
    """
    DATA_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    uploaded_files = [f.name for f in DATA_UPLOADS_DIR.glob("*.csv") if f.name != ".gitkeep"]

    return {
        "status": "unavailable",
        "message": "No dated pest observations are currently available for Akola district covering the 2023-2024 monitoring period.",
        "reason": "Published datasets provide historical context (2015-2023 annual) with zero temporal overlap with 2023-2024 weather and Sentinel-2 data. Direct ground-truth trap counts or boll damage observations have not been provided.",
        "requirements_to_enable_risk_validation": [
            "Dated observations with exact calendar date (YYYY-MM-DD) overlapping June 2023 – December 2024.",
            "Geographic coordinates within the Akola 10 km study area AOI (20.7069°N, 77.0022°E).",
            "Consistent observation type: pheromone trap catch ('trap_count') or green boll loculi damage ('boll_damage_pct').",
            "Metadata including crop growth stage, source institution (e.g. PDKV Akola, CICR Nagpur), and sampling protocol.",
        ],
        "template_endpoint": "/api/pbw/template",
        "upload_endpoint": "/api/pbw/upload",
        "staged_files_count": len(uploaded_files),
        "staged_files": uploaded_files,
        "isolation_guarantee": "Uploaded records are profiled into data/uploads/; they remain strictly isolated and do not automatically compute or modify pest risk scores.",
    }

def get_pbw_csv_template() -> str:
    """Returns downloadable CSV template content with exact required headers."""
    header = ",".join(REQUIRED_UPLOAD_COLUMNS)
    sample_row_1 = "2023-08-15,20.7069,77.0022,Akola Central,trap_count,8,moths/trap/week,flowering,PDKV Survey,Delta pheromone trap"
    sample_row_2 = "2023-09-10,20.7167,76.8150,Paras,boll_damage_pct,6.5,%,boll_development,CICR Advisory,Destructive boll sampling 20 bolls"
    return f"{header}\n{sample_row_1}\n{sample_row_2}\n"

def validate_and_save_pbw_upload(
    file_bytes: bytes,
    filename: str
) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Validates uploaded CSV/Excel file against REQUIRED_UPLOAD_COLUMNS and value schemas.
    Saves valid file to data/uploads/ and returns preview records.
    """
    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(file_bytes))
        elif filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(file_bytes))
        else:
            return False, "Unsupported file format. Please upload a .csv or .xlsx file.", None
    except Exception as e:
        return False, f"Failed to parse file: {str(e)}", None

    # Strip whitespace from column names
    df.columns = [str(c).strip().lower() for c in df.columns]

    # Check for missing required columns
    missing_cols = [c for c in REQUIRED_UPLOAD_COLUMNS if c not in df.columns]
    if missing_cols:
        return False, f"Missing required columns: {', '.join(missing_cols)}. Expected: {', '.join(REQUIRED_UPLOAD_COLUMNS)}", None

    if len(df) == 0:
        return False, "Uploaded file contains no data rows.", None

    # Row-by-row data validation
    errors = []
    cleaned_records = []

    for idx, row in df.iterrows():
        row_num = idx + 2  # 1-based index including header
        row_date = str(row["date"]).strip()

        # 1. Date format validation
        try:
            parsed_date = pd.to_datetime(row_date).strftime("%Y-%m-%d")
        except Exception:
            errors.append(f"Row {row_num}: Invalid date '{row_date}'. Expected format: YYYY-MM-DD.")
            continue

        # 2. Coordinate validation
        try:
            lat = float(row["latitude"])
            lon = float(row["longitude"])
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                errors.append(f"Row {row_num}: Coordinates ({lat}, {lon}) out of global range.")
        except Exception:
            errors.append(f"Row {row_num}: Latitude or Longitude is not a valid number.")

        # 3. Observation type
        obs_type = str(row["observation_type"]).strip().lower()
        if obs_type not in VALID_OBSERVATION_TYPES:
            errors.append(f"Row {row_num}: Invalid observation_type '{obs_type}'. Must be one of: {', '.join(VALID_OBSERVATION_TYPES)}.")

        # 4. Numeric value
        try:
            val = float(row["value"])
            if val < 0:
                errors.append(f"Row {row_num}: Value cannot be negative ({val}).")
        except Exception:
            errors.append(f"Row {row_num}: 'value' must be a numeric measurement.")

        if len(errors) >= 10:
            errors.append("Too many validation errors; aborting further row processing.")
            break

    if errors:
        return False, f"Schema validation failed ({len(errors)} issues): " + "; ".join(errors[:5]), None

    # Save to data/uploads with timestamped name
    DATA_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_filename = f"pbw_obs_{timestamp}_{os.path.basename(filename)}"
    save_path = DATA_UPLOADS_DIR / clean_filename
    
    # Save standard cleaned CSV
    df.to_csv(save_path, index=False)

    summary = {
        "saved_filename": clean_filename,
        "total_records": len(df),
        "date_range": {"min": str(df["date"].min()), "max": str(df["date"].max())},
        "observation_types": df["observation_type"].value_counts().to_dict(),
        "preview": df.head(10).to_dict(orient="records"),
        "isolation_notice": "Stored in data/uploads/. These records remain isolated and do not automatically calculate pest risk.",
    }

    return True, "File successfully validated and staged in data/uploads/.", summary
