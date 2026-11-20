"""
AgroViz Year-on-Year (YoY) Descriptive Screening Service.
Compares common overlapping calendar windows (June–December 2023 vs June–December 2024)
across Surface Weather (NASA POWER), Soil Moisture (ERA5-Land), and Crop Indices (Sentinel-2 L2A).
Strictly documents that 2023 begins on 2023-06-01 and preserves missing observations without interpolation.
"""

from typing import Any, Dict, List, Optional
import pandas as pd
import numpy as np

from app.services.loaders import load_weather, load_sentinel2_indices, load_era5_soil_moisture


def compute_yoy_analysis(metric_category: Optional[str] = "all") -> Dict[str, Any]:
    """
    Computes comparative descriptive statistics for the common June–December calendar period
    between Season 2023 and Season 2024 over the 10 km Akola AOI (20.7069°N, 77.0022°E).
    """
    results: Dict[str, Any] = {
        "comparison_period": "June 1 to December 31 (Common Overlapping Window)",
        "seasons_compared": ["Season 2023 (Jun–Dec)", "Season 2024 (Jun–Dec)"],
        "notes": [
            "Year-on-year comparisons are strictly limited to June–December because environmental monitoring begins on 2023-06-01.",
            "January–May 2023 records do not exist in the dataset; they are preserved as unobserved and never interpolated or backfilled.",
            "July 2023 and July 2024 both experienced 0 valid optical Sentinel-2 observations due to continuous monsoon cloud cover.",
            "Metrics reflect macro-level 10 km AOI reanalysis and satellite observations, not a single farm plot.",
            "Observed differences are purely descriptive and do NOT represent an empirical causal crop yield forecast.",
        ],
    }

    # 1. Weather YoY (NASA POWER)
    if metric_category in ("all", "weather"):
        weather_df = load_weather()
        # Filter to common June-December months for both years
        w23 = weather_df[(weather_df["date"] >= "2023-06-01") & (weather_df["date"] <= "2023-12-31")].copy()
        w24 = weather_df[(weather_df["date"] >= "2024-06-01") & (weather_df["date"] <= "2024-12-31")].copy()

        def _w_stats(df: pd.DataFrame, year: int) -> Dict[str, Any]:
            rain_days = int((df["prectotcorr"] > 0.1).sum())
            return {
                "year": year,
                "days_count": len(df),
                "mean_temperature_c": round(float(df["t2m"].mean()), 2),
                "mean_max_temperature_c": round(float(df["t2m_max"].mean()), 2),
                "mean_min_temperature_c": round(float(df["t2m_min"].mean()), 2),
                "mean_relative_humidity_pct": round(float(df["rh2m"].mean()), 2),
                "total_precipitation_mm": round(float(df["prectotcorr"].sum()), 2),
                "max_single_day_rain_mm": round(float(df["prectotcorr"].max()), 2),
                "rainy_days_count": rain_days,
            }

        s23 = _w_stats(w23, 2023)
        s24 = _w_stats(w24, 2024)

        # Monthly breakdown
        month_names = ["June", "July", "August", "September", "October", "November", "December"]
        months_comparison = []
        for m_idx, m_name in enumerate(month_names, start=6):
            m_str = f"{m_idx:02d}"
            df23_m = w23[w23["date"].str.slice(5, 7) == m_str]
            df24_m = w24[w24["date"].str.slice(5, 7) == m_str]

            months_comparison.append({
                "month": m_name,
                "month_num": m_idx,
                "2023": {
                    "mean_t2m": round(float(df23_m["t2m"].mean()), 2),
                    "rainfall_mm": round(float(df23_m["prectotcorr"].sum()), 2),
                    "mean_rh": round(float(df23_m["rh2m"].mean()), 2),
                },
                "2024": {
                    "mean_t2m": round(float(df24_m["t2m"].mean()), 2),
                    "rainfall_mm": round(float(df24_m["prectotcorr"].sum()), 2),
                    "mean_rh": round(float(df24_m["rh2m"].mean()), 2),
                },
                "rainfall_diff_mm": round(float(df24_m["prectotcorr"].sum() - df23_m["prectotcorr"].sum()), 2),
                "temp_diff_c": round(float(df24_m["t2m"].mean() - df23_m["t2m"].mean()), 2),
            })

        results["weather"] = {
            "source": "NASA POWER MERRA-2 (Point 20.7069°N, 77.0022°E)",
            "season_totals": {"2023": s23, "2024": s24},
            "net_difference": {
                "rainfall_change_mm": round(s24["total_precipitation_mm"] - s23["total_precipitation_mm"], 2),
                "rainfall_change_pct": round(
                    ((s24["total_precipitation_mm"] - s23["total_precipitation_mm"]) / s23["total_precipitation_mm"]) * 100.0,
                    2,
                ),
                "mean_temperature_change_c": round(s24["mean_temperature_c"] - s23["mean_temperature_c"], 2),
                "rainy_days_change": s24["rainy_days_count"] - s23["rainy_days_count"],
            },
            "monthly_breakdown": months_comparison,
        }

    # 2. Soil Moisture YoY (ERA5-Land 3 Layers)
    if metric_category in ("all", "soil"):
        soil_df = load_era5_soil_moisture()
        sm23 = soil_df[(soil_df["date"] >= "2023-06-01") & (soil_df["date"] <= "2023-12-31")].copy()
        sm24 = soil_df[(soil_df["date"] >= "2024-06-01") & (soil_df["date"] <= "2024-12-31")].copy()

        def _sm_stats(df: pd.DataFrame, year: int) -> Dict[str, Any]:
            return {
                "year": year,
                "days_count": len(df),
                "layer1_0_7cm_mean_m3m3": round(float(df["sm_layer1_mean"].mean()), 4),
                "layer2_7_28cm_mean_m3m3": round(float(df["sm_layer2_mean"].mean()), 4),
                "layer3_28_100cm_mean_m3m3": round(float(df["sm_layer3_mean"].mean()), 4),
            }

        sm_s23 = _sm_stats(sm23, 2023)
        sm_s24 = _sm_stats(sm24, 2024)

        results["soil_moisture"] = {
            "source": "ECMWF ERA5-Land (9 grid cells covering 10 km Akola AOI)",
            "season_averages": {"2023": sm_s23, "2024": sm_s24},
            "layer_differences": {
                "layer1_diff_m3m3": round(sm_s24["layer1_0_7cm_mean_m3m3"] - sm_s23["layer1_0_7cm_mean_m3m3"], 4),
                "layer2_diff_m3m3": round(sm_s24["layer2_7_28cm_mean_m3m3"] - sm_s23["layer2_7_28cm_mean_m3m3"], 4),
                "layer3_diff_m3m3": round(sm_s24["layer3_28_100cm_mean_m3m3"] - sm_s23["layer3_28_100cm_mean_m3m3"], 4),
            },
        }

    # 3. Sentinel-2 Crop Indices YoY
    if metric_category in ("all", "crop_indices"):
        _, s2_daily = load_sentinel2_indices(save_processed=False)
        s2_23 = s2_daily[(s2_daily["date"] >= "2023-06-01") & (s2_daily["date"] <= "2023-12-31")].copy()
        s2_24 = s2_daily[(s2_daily["date"] >= "2024-06-01") & (s2_daily["date"] <= "2024-12-31")].copy()

        results["crop_indices"] = {
            "source": "Copernicus Sentinel-2 L2A (Harmonized, 10 km AOI unweighted mean)",
            "season_averages": {
                "2023": {
                    "valid_observation_dates": len(s2_23),
                    "ndvi_mean": round(float(s2_23["NDVI_mean"].mean()), 4),
                    "ndre_mean": round(float(s2_23["NDRE_mean"].mean()), 4),
                    "ndmi_mean": round(float(s2_23["NDMI_mean"].mean()), 4),
                },
                "2024": {
                    "valid_observation_dates": len(s2_24),
                    "ndvi_mean": round(float(s2_24["NDVI_mean"].mean()), 4),
                    "ndre_mean": round(float(s2_24["NDRE_mean"].mean()), 4),
                    "ndmi_mean": round(float(s2_24["NDMI_mean"].mean()), 4),
                },
            },
            "cloud_gaps_preserved": {
                "2023": "Zero valid dates in July 2023 due to 100% monsoon cloud occlusion",
                "2024": "Zero valid dates in July 2024 due to 100% monsoon cloud occlusion",
            },
        }

    return results
