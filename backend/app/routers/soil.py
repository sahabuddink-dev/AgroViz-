"""
FastAPI router for Soil Conditions module.
Endpoints for ERA5-Land 3-depth moisture, ISRIC SoilGrids 2.0 depth profiles,
and in-situ soil sensor CSV upload validation.
"""

from typing import Optional
from fastapi import APIRouter, File, HTTPException, Query, Response, UploadFile, status

from app.schemas import BaseResponse
from app.services.soil import (
    SOIL_SENSOR_CSV_TEMPLATE,
    get_soil_moisture_data,
    get_soil_properties_data,
    validate_and_save_soil_sensor_upload,
)

router = APIRouter(prefix="/api/soil", tags=["Soil Conditions"])


@router.get(
    "/moisture",
    response_model=BaseResponse,
    summary="Get 3-depth ERA5-Land volumetric soil moisture series and statistics",
)
def get_soil_moisture(
    start: Optional[str] = Query(
        None,
        description="Start date (YYYY-MM-DD), e.g., 2023-06-01",
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    ),
    end: Optional[str] = Query(
        None,
        description="End date (YYYY-MM-DD), e.g., 2024-12-31",
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    ),
    limit: Optional[int] = Query(
        None,
        ge=1,
        le=580,
        description="Limit the number of records returned (most recent records)",
    ),
):
    """
    Returns daily volumetric soil moisture across 3 standardized depths:
    - Layer 1: 0–7 cm (surface root-zone)
    - Layer 2: 7–28 cm (mid root-zone)
    - Layer 3: 28–100 cm (deep root-zone)
    Derived from ECMWF ERA5-Land atmospheric reanalysis.
    Includes depth-wise descriptive statistics and actual Pearson correlations.
    """
    try:
        res = get_soil_moisture_data(start=start, end=end, limit=limit)
        return BaseResponse(
            provenance=res["provenance"],
            source=res["source"],
            units=res["units"],
            period=res["period"],
            notes=res["notes"],
            data=res["data"],
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load soil moisture data: {str(e)}",
        )


@router.get(
    "/properties",
    response_model=BaseResponse,
    summary="Get ISRIC SoilGrids 2.0 physical depth profiles and USDA classification",
)
def get_soil_properties():
    """
    Returns ISRIC SoilGrids 2.0 static physical properties across 6 standard depth intervals:
    - Clay %, Sand %, Silt %, pH, Soil Organic Carbon (SOC g/kg)
    - Depths: 0–5, 5–15, 15–30, 30–60, 60–100, 100–200 cm
    - USDA soil texture classification per depth and overall area average (Clay).
    """
    try:
        res = get_soil_properties_data()
        return BaseResponse(
            provenance=res["provenance"],
            source=res["source"],
            units=res["units"],
            period=res["period"],
            notes=res["notes"],
            data=res["data"],
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load soil properties profile: {str(e)}",
        )


@router.get(
    "/template",
    summary="Download standardized in-situ soil sensor CSV template",
)
def download_soil_sensor_template():
    """
    Returns a standardized CSV template for uploading in-situ capacitive FDR/TDR soil sensor observations.
    """
    return Response(
        content=SOIL_SENSOR_CSV_TEMPLATE,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=soil_sensor_template.csv"
        },
    )


@router.post(
    "/sensor-upload",
    response_model=BaseResponse,
    summary="Upload and validate in-situ soil sensor CSV file",
)
async def upload_soil_sensor_observations(file: UploadFile = File(...)):
    """
    Ingests and validates user-uploaded in-situ soil sensor observations:
    - Enforces schema: date, sensor_id, depth_cm, soil_moisture
    - Validates date format (YYYY-MM-DD) and depth bounds (0–200 cm)
    - Normalizes soil moisture units safely (values > 1.0 treated as % and normalized to m³/m³)
    - Stores validated file into data/uploads/
    - Marked as user_provided provenance
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid file type. Only CSV files (.csv) are accepted for soil sensor logs.",
        )

    try:
        contents = await file.read()
        res = validate_and_save_soil_sensor_upload(contents, file.filename)
        return BaseResponse(
            provenance=res["provenance"],
            source=res["source"],
            units=res["units"],
            period=res["period"],
            notes=res["notes"],
            data=res,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during sensor upload processing: {str(e)}",
        )
