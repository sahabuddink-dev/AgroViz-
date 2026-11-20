"""
FastAPI router for Crop Health module.
Serves cleaned Sentinel-2 daily vegetation indices (NDVI, NDRE, NDMI) for the Akola 10 km AOI,
highlighting monsoon cloud gaps and providing descriptive statistics.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas import BaseResponse
from app.services.crop import get_crop_indices_data

router = APIRouter(prefix="/api/crop", tags=["Crop Health"])


@router.get(
    "/indices",
    response_model=BaseResponse,
    summary="Get cleaned Sentinel-2 daily crop indices (NDVI, NDRE, NDMI) for Akola 10 km AOI",
)
def get_crop_indices(
    start: Optional[str] = Query(
        None,
        description="Start date (YYYY-MM-DD), e.g., 2023-06-05",
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
        le=80,
        description="Limit number of observation dates returned (most recent dates)",
    ),
):
    """
    Returns cleaned multi-spectral Sentinel-2 vegetation indices:
    - NDVI: (B8 - B4) / (B8 + B4)
    - NDRE: (B8A - B5) / (B8A + B5)
    - NDMI: (B8A - B11) / (B8A + B11)

    Values represent the 10 km radius AOI around 20.7069°N, 77.0022°E.
    Explicitly reports missing July 2023 and July 2024 monsoon cloud gaps.
    """
    try:
        res = get_crop_indices_data(start=start, end=end, limit=limit)
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
            detail=f"Failed to load crop indices: {str(e)}",
        )
