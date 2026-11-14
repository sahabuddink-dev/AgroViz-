from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
import pandas as pd

from ..schemas import BaseResponse, DataRegistrySummary
from ..services.registry import get_data_registry_summary, DATASET_MANIFEST_DEFINITIONS
from ..services.profiler import profile_dataset, profile_all_datasets
from ..services.loaders import (
    load_weather,
    load_sentinel2_indices,
    load_era5_soil_moisture,
    load_soilgrids,
    load_annexure_4,
    load_annexure_3,
    load_planetary_computer_validation,
    load_scene_inventory,
)

router = APIRouter(prefix="/api/datasets", tags=["Datasets"])

@router.get("", response_model=BaseResponse[DataRegistrySummary])
def get_dataset_registry() -> BaseResponse[DataRegistrySummary]:
    summary = get_data_registry_summary()
    return BaseResponse[DataRegistrySummary](
        provenance="measured",
        source="AgroViz Local Data Registry",
        units="count",
        period="static inventory",
        notes=[
            "Data manifest of canonical files according to CLAUDE.md Section 4.",
            "Raw files are strictly read-only and preserved."
        ],
        data=summary,
    )

@router.get("/{dataset_id}/profile", response_model=BaseResponse[Dict[str, Any]])
def get_dataset_profile(dataset_id: str) -> BaseResponse[Dict[str, Any]]:
    try:
        profile_data = profile_dataset(dataset_id)
        return BaseResponse[Dict[str, Any]](
            provenance=profile_data["provenance"],
            source=profile_data["source"],
            units=profile_data["units"],
            period=profile_data["period"],
            notes=profile_data["notes"],
            data=profile_data,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profiling failed: {str(e)}")

@router.get("/{dataset_id}/preview", response_model=BaseResponse[Dict[str, Any]])
def get_dataset_preview(
    dataset_id: str,
    limit: int = Query(default=10, ge=1, le=100)
) -> BaseResponse[Dict[str, Any]]:
    manifest_match = next((d for d in DATASET_MANIFEST_DEFINITIONS if d["id"] == dataset_id), None)
    if not manifest_match:
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_id} not found in manifest")

    try:
        preview_data = {}
        if dataset_id == "weather_nasa_power":
            df = load_weather(save_processed=False)
            preview_data = {
                "columns": list(df.columns),
                "total_rows": len(df),
                "preview_rows": df.head(limit).to_dict(orient="records"),
            }
        elif dataset_id == "sentinel2_indices_gee":
            scenes_df, daily_df = load_sentinel2_indices(save_processed=False)
            preview_data = {
                "columns": list(scenes_df.columns),
                "total_scenes": len(scenes_df),
                "daily_dates": len(daily_df),
                "preview_rows": scenes_df.head(limit).to_dict(orient="records"),
            }
        elif dataset_id == "era5_soil_moisture_three_layer":
            df = load_era5_soil_moisture(save_processed=False)
            preview_data = {
                "columns": list(df.columns),
                "total_rows": len(df),
                "preview_rows": df.head(limit).to_dict(orient="records"),
            }
        elif dataset_id == "soilgrids_properties":
            long_df, meta = load_soilgrids(save_processed=False)
            preview_data = {
                "columns": list(long_df.columns),
                "total_rows": len(long_df),
                "preview_rows": long_df.head(limit).to_dict(orient="records"),
                "area_mean_texture": meta["area_mean_texture"],
            }
        elif dataset_id == "pbw_annexure_4_multilocation":
            df = load_annexure_4(save_processed=False)
            preview_data = {
                "columns": list(df.columns),
                "total_rows": len(df),
                "preview_rows": df.head(limit).to_dict(orient="records"),
            }
        elif dataset_id == "pbw_annexure_3_seasonal":
            data = load_annexure_3(save_processed=False)
            preview_data = {
                "sheets": data["sheets_available"],
                "akola_seasonal_records": data["akola_seasonal_damage"][:limit],
                "akola_bt_5season_mean": data["akola_bt_5season_mean"],
                "ambiguous_cells": data["ambiguous_annotations"],
            }
        elif dataset_id == "sentinel2_indices_pc_validation":
            df, stats = load_planetary_computer_validation(save_processed=False)
            preview_data = {
                "columns": list(df.columns),
                "total_rows": len(df),
                "preview_rows": df.head(limit).to_dict(orient="records"),
                "comparison_stats": stats,
            }
        elif dataset_id == "sentinel2_inventory":
            df = load_scene_inventory()
            preview_data = {
                "columns": list(df.columns),
                "total_rows": len(df),
                "preview_rows": df.head(limit).to_dict(orient="records"),
            }
        elif dataset_id == "era5_soil_moisture_single_layer":
            df = load_era5_soil_moisture(save_processed=False)
            preview_data = {
                "columns": ["date", "sm_layer1_mean"],
                "total_rows": len(df),
                "preview_rows": df[["date", "sm_layer1_mean"]].head(limit).to_dict(orient="records"),
            }

        return BaseResponse[Dict[str, Any]](
            provenance=manifest_match["provenance"],
            source=manifest_match["source"],
            units=manifest_match["units"],
            period=manifest_match["period"],
            notes=manifest_match["notes"],
            data=preview_data,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate preview: {str(e)}")
