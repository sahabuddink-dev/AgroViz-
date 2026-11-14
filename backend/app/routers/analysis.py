from typing import Any, Dict, List, Optional, Literal
from fastapi import APIRouter, Query, HTTPException
from datetime import datetime

from ..schemas import BaseResponse
from ..services.pbw import calculate_degree_days, PARAMETER_SETS

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])

def _validate_date_str(date_str: Optional[str], param_name: str) -> Optional[str]:
    if not date_str:
        return None
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return date_str
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date format for '{param_name}': '{date_str}'. Expected YYYY-MM-DD."
        )

@router.get("/degree-days", response_model=BaseResponse[Dict[str, Any]])
def get_degree_day_analysis(
    param_set: Optional[str] = Query(default="both", description="Parameter set: A, B, or both"),
    start: Optional[str] = Query(default="2023-06-01", description="Biofix / sowing start date (YYYY-MM-DD)"),
    end: Optional[str] = Query(default=None, description="End date (YYYY-MM-DD)"),
) -> BaseResponse[Dict[str, Any]]:
    valid_start = _validate_date_str(start, "start") or "2023-06-01"
    valid_end = _validate_date_str(end, "end")

    if valid_end and valid_start > valid_end:
        raise HTTPException(
            status_code=400,
            detail=f"Start date '{valid_start}' cannot be after end date '{valid_end}'."
        )

    norm_set = param_set.upper() if param_set else "BOTH"
    if norm_set not in ["A", "B", "BOTH"]:
        raise HTTPException(status_code=400, detail="param_set must be 'A', 'B', or 'both'.")

    try:
        dd_data = calculate_degree_days(
            param_set_key=norm_set,
            start_date=valid_start,
            end_date=valid_end,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    citation_summary = (
        f"Set A: Scientific Reports 11:436 (2021) (13.4°C/35.5°C; 503.62 DD). "
        f"Set B: Beasley & Adams (1996) J. Econ. Entomol. 89:881-890 (13.9°C/32.8°C; 492 DD)."
    )

    return BaseResponse[Dict[str, Any]](
        provenance="model_estimated",
        source="NASA POWER MERRA-2 Daily Temperature (Single-Sine Cutoff)",
        units="°C·day (accumulated degree-days), generations (potential)",
        period=f"{valid_start} to {dd_data['end_date']}",
        notes=[
            "Thermal development potential, not an observation of pests.",
            "Parameters are literature values from other regions and are not validated against Akola field data.",
            "NASA POWER is reanalysis, not a station.",
            "Start date is user-selected: actual cotton sowing date for Akola is not recorded in the dataset.",
            citation_summary,
        ],
        data=dd_data,
    )

@router.get("/pbw-risk", response_model=BaseResponse[Dict[str, Any]])
def get_validated_pbw_risk() -> BaseResponse[Dict[str, Any]]:
    """
    Locked endpoint: Validated Pink Bollworm risk prediction is unavailable
    due to zero temporal overlap between historical damage surveys and 2023-2024 environmental monitoring.
    """
    return BaseResponse[Dict[str, Any]](
        provenance="unavailable",
        source="AgroViz Validation Registry",
        units="none",
        period="2023-06-01 to 2024-12-31",
        notes=[
            "Validated PBW risk estimation is locked: no dated ground-truth observations overlap the monitoring period.",
            "Satellite vegetation indices alone cannot confirm pest presence.",
            "Thermal degree-day indicators represent biological potential, not actual infestation risk.",
            "No 'low/medium/high' risk labels are assigned."
        ],
        data={
            "status": "locked",
            "reason": "Missing dated field observations of PBW trap catches or green boll loculi damage overlapping the June 2023 – December 2024 monitoring window.",
            "requirements_to_unlock": [
                "Field monitoring records with exact dates and GPS coordinates in Akola district.",
                "Pheromone trap catch counts or destructive boll sampling records.",
                "Temporal synchronization with NASA POWER weather and Sentinel-2 acquisitions.",
            ],
            "risk_score": None,
            "risk_category": "unavailable",
        },
    )
