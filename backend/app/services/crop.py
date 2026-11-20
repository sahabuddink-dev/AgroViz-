"""
Crop Health service module for AgroViz.
Serves cleaned Sentinel-2 daily vegetation indices (NDVI, NDRE, NDMI) for the Akola 10 km AOI,
including date filtering, descriptive statistics, and explicit July monsoon cloud gap reporting.
"""

import logging
from typing import Dict, Any, Optional, List
import pandas as pd

from app.services.loaders import load_sentinel2_indices

logger = logging.getLogger(__name__)

# Documented monsoon cloud gaps in the optical satellite time series
JULY_CLOUD_GAPS = [
    {
        "period": "July 2023",
        "dates_expected": "2023-07-01 to 2023-07-31",
        "valid_optical_observations": 0,
        "reason": "Persistent monsoon cloud cover. 100% of scene pixels masked by Sentinel-2 SCL cloud/shadow detector. Gap is preserved as observed reality and never interpolated.",
    },
    {
        "period": "July 2024",
        "dates_expected": "2024-07-01 to 2024-07-31",
        "valid_optical_observations": 0,
        "reason": "Persistent monsoon cloud cover. 100% of scene pixels masked by Sentinel-2 SCL cloud/shadow detector. Gap is preserved as observed reality and never interpolated.",
    },
]


def get_crop_indices_data(
    start: Optional[str] = None,
    end: Optional[str] = None,
    limit: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Retrieves cleaned daily Sentinel-2 multi-spectral vegetation indices:
    - NDVI: (B8 - B4) / (B8 + B4) (Canopy greenness & biomass)
    - NDRE: (B8A - B5) / (B8A + B5) (Canopy chlorophyll & nitrogen content)
    - NDMI: (B8A - B11) / (B8A + B11) (Canopy liquid water content)

    Values represent the 10 km circular AOI around 20.7069°N, 77.0022°E (Akola),
    combining overlapping tiles with simple unweighted means excluding partial tiles.
    """
    _, daily_df = load_sentinel2_indices(save_processed=False)

    # Date range filtering
    if start:
        daily_df = daily_df[daily_df["date"] >= start]
    if end:
        daily_df = daily_df[daily_df["date"] <= end]

    if daily_df.empty:
        raise ValueError(f"No Sentinel-2 crop index observations found for date range {start} to {end}")

    if limit and limit > 0:
        daily_df = daily_df.iloc[-limit:]

    start_date = str(daily_df["date"].min())
    end_date = str(daily_df["date"].max())

    ndvi_s = daily_df["NDVI_mean"]
    ndre_s = daily_df["NDRE_mean"]
    ndmi_s = daily_df["NDMI_mean"]
    cloud_s = daily_df["cloud_percentage"]

    stats = {
        "ndvi": {
            "name": "Normalized Difference Vegetation Index (NDVI)",
            "band_formula": "(B8 - B4) / (B8 + B4)",
            "mean": round(float(ndvi_s.mean()), 4),
            "min": round(float(ndvi_s.min()), 4),
            "max": round(float(ndvi_s.max()), 4),
            "std": round(float(ndvi_s.std()), 4),
            "latest": round(float(ndvi_s.iloc[-1]), 4),
        },
        "ndre": {
            "name": "Normalized Difference Red Edge Index (NDRE)",
            "band_formula": "(B8A - B5) / (B8A + B5)",
            "mean": round(float(ndre_s.mean()), 4),
            "min": round(float(ndre_s.min()), 4),
            "max": round(float(ndre_s.max()), 4),
            "std": round(float(ndre_s.std()), 4),
            "latest": round(float(ndre_s.iloc[-1]), 4),
        },
        "ndmi": {
            "name": "Normalized Difference Moisture Index (NDMI)",
            "band_formula": "(B8A - B11) / (B8A + B11)",
            "mean": round(float(ndmi_s.mean()), 4),
            "min": round(float(ndmi_s.min()), 4),
            "max": round(float(ndmi_s.max()), 4),
            "std": round(float(ndmi_s.std()), 4),
            "latest": round(float(ndmi_s.iloc[-1]), 4),
        },
        "coverage": {
            "mean_cloud_percentage": round(float(cloud_s.mean()), 2),
            "total_valid_pixels_sum": int(daily_df["total_valid_pixels"].sum()),
            "average_valid_pixels_per_date": int(daily_df["total_valid_pixels"].mean()),
        },
    }

    # Format records
    records = [
        {
            "date": str(r["date"]),
            "ndvi": round(float(r["NDVI_mean"]), 4),
            "ndre": round(float(r["NDRE_mean"]), 4),
            "ndmi": round(float(r["NDMI_mean"]), 4),
            "cloud_percentage": round(float(r["cloud_percentage"]), 2),
            "tile_count": int(r["tile_count"]),
            "valid_pixels": int(r["total_valid_pixels"]),
        }
        for _, r in daily_df.iterrows()
    ]

    return {
        "provenance": "calculated",
        "source": "Copernicus Sentinel-2 L2A (Harmonized) via Google Earth Engine",
        "units": "index_ratio (-1.0 to 1.0)",
        "period": f"{start_date} to {end_date}",
        "notes": [
            "Values reflect AOI-level aggregate vegetation condition for the entire 10 km radius buffer (20.7069°N, 77.0022°E) covering bare soil, diverse crops, and mixed vegetation, NOT isolated cotton fields.",
            "Daily values are simple unweighted means of valid overlapping tiles (T43QFC, QFD, QGC, QGD) excluding partial scenes (<5,000 valid pixels).",
            "Zero valid optical observations occurred in July 2023 and July 2024 due to continuous monsoon cloud cover. Missing dates are preserved and never interpolated.",
            "NDMI measures optical canopy liquid water content, NOT ground or soil moisture.",
            "Spectral vegetation indices indicate relative biomass, greenness, and canopy moisture; they do NOT diagnose specific plant diseases or confirm Pink Bollworm infestation."
        ],
        "data": {
            "total_observation_dates": len(daily_df),
            "start_date": start_date,
            "end_date": end_date,
            "statistics": stats,
            "july_cloud_gaps": JULY_CLOUD_GAPS,
            "records": records,
        },
    }
