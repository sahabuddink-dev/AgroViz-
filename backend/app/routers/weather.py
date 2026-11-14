from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query, HTTPException
from datetime import datetime

from ..schemas import BaseResponse
from ..services.weather import get_daily_weather, get_monthly_weather_summary

router = APIRouter(prefix="/api/weather", tags=["Weather"])

WEATHER_PROVENANCE_METADATA = {
    "provenance": "model_estimated",
    "source": "NASA POWER / MERRA-2 Reanalysis",
    "units": "°C (T2M, Tmax, Tmin), % (RH2M), mm/day (PRECTOTCORR)",
    "period": "2023-06-01 to 2024-12-31 (19 months daily)",
    "notes": [
        "NASA POWER surface meteorology is derived from NASA GMAO MERRA-2 atmospheric reanalysis model (~0.5° × 0.625° grid resolution), not a physical ground weather station.",
        "Coordinates: 20.7069°N, 77.0022°E (Akola study center point).",
        "Historical observational reanalysis only; does not provide future weather forecasts."
    ],
}

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

@router.get("", response_model=BaseResponse[Dict[str, Any]])
def get_weather_records(
    start: Optional[str] = Query(default=None, description="Start date in YYYY-MM-DD format"),
    end: Optional[str] = Query(default=None, description="End date in YYYY-MM-DD format"),
    limit: Optional[int] = Query(default=None, ge=1, le=1000, description="Max daily records to return"),
) -> BaseResponse[Dict[str, Any]]:
    valid_start = _validate_date_str(start, "start")
    valid_end = _validate_date_str(end, "end")

    if valid_start and valid_end and valid_start > valid_end:
        raise HTTPException(
            status_code=400,
            detail=f"Start date '{valid_start}' cannot be after end date '{valid_end}'."
        )

    data = get_daily_weather(start_date=valid_start, end_date=valid_end, limit=limit)

    return BaseResponse[Dict[str, Any]](
        provenance=WEATHER_PROVENANCE_METADATA["provenance"],
        source=WEATHER_PROVENANCE_METADATA["source"],
        units=WEATHER_PROVENANCE_METADATA["units"],
        period=WEATHER_PROVENANCE_METADATA["period"],
        notes=WEATHER_PROVENANCE_METADATA["notes"],
        data=data,
    )

@router.get("/summary", response_model=BaseResponse[List[Dict[str, Any]]])
def get_weather_summary(
    start: Optional[str] = Query(default=None, description="Start date in YYYY-MM-DD format"),
    end: Optional[str] = Query(default=None, description="End date in YYYY-MM-DD format"),
) -> BaseResponse[List[Dict[str, Any]]]:
    valid_start = _validate_date_str(start, "start")
    valid_end = _validate_date_str(end, "end")

    if valid_start and valid_end and valid_start > valid_end:
        raise HTTPException(
            status_code=400,
            detail=f"Start date '{valid_start}' cannot be after end date '{valid_end}'."
        )

    summaries = get_monthly_weather_summary(start_date=valid_start, end_date=valid_end)

    return BaseResponse[List[Dict[str, Any]]](
        provenance=WEATHER_PROVENANCE_METADATA["provenance"],
        source=WEATHER_PROVENANCE_METADATA["source"],
        units="°C (monthly mean), % (mean RH), mm (total rainfall)",
        period=WEATHER_PROVENANCE_METADATA["period"],
        notes=WEATHER_PROVENANCE_METADATA["notes"],
        data=summaries,
    )
