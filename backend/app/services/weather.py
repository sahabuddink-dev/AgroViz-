import os
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

from ..config import DATA_PROCESSED_DIR
from .loaders import load_weather

def _get_weather_df() -> pd.DataFrame:
    processed_path = DATA_PROCESSED_DIR / "weather_cleaned.csv"
    if processed_path.exists():
        df = pd.read_csv(processed_path)
    else:
        df = load_weather(save_processed=True)
    return df

def get_daily_weather(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: Optional[int] = None
) -> Dict[str, Any]:
    """
    Returns filtered daily weather records and aggregate descriptive statistics.
    Source: NASA POWER MERRA-2 reanalysis (Point 20.7069°N, 77.0022°E).
    """
    df = _get_weather_df()

    if start_date:
        df = df[df["date"] >= start_date]
    if end_date:
        df = df[df["date"] <= end_date]

    if df.empty:
        return {
            "records_count": 0,
            "date_range": {"start": start_date, "end": end_date},
            "latest_observation": None,
            "statistics": None,
            "records": [],
        }

    df_sorted = df.sort_values(by="date").reset_index(drop=True)
    latest_row = df_sorted.iloc[-1].to_dict()

    # Temperature statistics
    max_t_idx = df_sorted["t2m_max"].idxmax()
    min_t_idx = df_sorted["t2m_min"].idxmin()
    max_rain_idx = df_sorted["prectotcorr"].idxmax()

    stats = {
        "days_count": int(len(df_sorted)),
        "date_range": {
            "start": str(df_sorted["date"].min()),
            "end": str(df_sorted["date"].max()),
        },
        "temperature": {
            "mean_c": round(float(df_sorted["t2m"].mean()), 2),
            "max_c": round(float(df_sorted["t2m_max"].max()), 2),
            "max_date": str(df_sorted.loc[max_t_idx, "date"]),
            "min_c": round(float(df_sorted["t2m_min"].min()), 2),
            "min_date": str(df_sorted.loc[min_t_idx, "date"]),
        },
        "humidity": {
            "mean_pct": round(float(df_sorted["rh2m"].mean()), 2),
            "max_pct": round(float(df_sorted["rh2m"].max()), 2),
            "min_pct": round(float(df_sorted["rh2m"].min()), 2),
        },
        "precipitation": {
            "total_mm": round(float(df_sorted["prectotcorr"].sum()), 2),
            "mean_daily_mm": round(float(df_sorted["prectotcorr"].mean()), 2),
            "max_daily_mm": round(float(df_sorted["prectotcorr"].max()), 2),
            "max_daily_date": str(df_sorted.loc[max_rain_idx, "date"]),
            "rainy_days_count": int((df_sorted["prectotcorr"] > 0.1).sum()),
        },
    }

    records_df = df_sorted
    if limit is not None and limit > 0:
        records_df = df_sorted.head(limit)

    records = records_df.to_dict(orient="records")
    for r in records:
        r["year"] = int(r["year"])
        r["doy"] = int(r["doy"])
        r["t2m"] = round(float(r["t2m"]), 2)
        r["t2m_max"] = round(float(r["t2m_max"]), 2)
        r["t2m_min"] = round(float(r["t2m_min"]), 2)
        r["rh2m"] = round(float(r["rh2m"]), 2)
        r["prectotcorr"] = round(float(r["prectotcorr"]), 2)

    latest_cleaned = {
        "date": str(latest_row["date"]),
        "year": int(latest_row["year"]),
        "doy": int(latest_row["doy"]),
        "t2m": round(float(latest_row["t2m"]), 2),
        "t2m_max": round(float(latest_row["t2m_max"]), 2),
        "t2m_min": round(float(latest_row["t2m_min"]), 2),
        "rh2m": round(float(latest_row["rh2m"]), 2),
        "prectotcorr": round(float(latest_row["prectotcorr"]), 2),
    }

    return {
        "records_count": int(len(df_sorted)),
        "returned_records_count": int(len(records)),
        "date_range": stats["date_range"],
        "latest_observation": latest_cleaned,
        "statistics": stats,
        "records": records,
    }

def get_monthly_weather_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Computes monthly aggregation summaries for temperature, relative humidity, and rainfall.
    """
    df = _get_weather_df()

    if start_date:
        df = df[df["date"] >= start_date]
    if end_date:
        df = df[df["date"] <= end_date]

    if df.empty:
        return []

    df = df.copy()
    df["year_month"] = df["date"].str.slice(0, 7)
    df["is_rainy"] = df["prectotcorr"] > 0.1

    grouped = df.groupby("year_month").agg(
        days_count=("date", "count"),
        mean_t2m=("t2m", "mean"),
        mean_t2m_max=("t2m_max", "mean"),
        mean_t2m_min=("t2m_min", "mean"),
        mean_rh2m=("rh2m", "mean"),
        total_precipitation_mm=("prectotcorr", "sum"),
        max_daily_precipitation_mm=("prectotcorr", "max"),
        rainy_days_count=("is_rainy", "sum"),
    ).reset_index()

    month_names = {
        "01": "January", "02": "February", "03": "March", "04": "April",
        "05": "May", "06": "June", "07": "July", "08": "August",
        "09": "September", "10": "October", "11": "November", "12": "December"
    }

    summaries = []
    for _, row in grouped.iterrows():
        ym = str(row["year_month"])
        y, m = ym.split("-")
        m_name = f"{month_names.get(m, m)} {y}"

        summaries.append({
            "year_month": ym,
            "month_label": m_name,
            "year": int(y),
            "month_number": int(m),
            "days_count": int(row["days_count"]),
            "mean_t2m": round(float(row["mean_t2m"]), 2),
            "mean_t2m_max": round(float(row["mean_t2m_max"]), 2),
            "mean_t2m_min": round(float(row["mean_t2m_min"]), 2),
            "mean_rh2m": round(float(row["mean_rh2m"]), 2),
            "total_precipitation_mm": round(float(row["total_precipitation_mm"]), 2),
            "max_daily_precipitation_mm": round(float(row["max_daily_precipitation_mm"]), 2),
            "rainy_days_count": int(row["rainy_days_count"]),
        })

    return summaries
