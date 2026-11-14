from typing import Any, Dict, List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import PlainTextResponse

from ..schemas import BaseResponse
from ..services.pbw import (
    get_pbw_context,
    get_pbw_status,
    get_pbw_csv_template,
    validate_and_save_pbw_upload,
)

router = APIRouter(prefix="/api/pbw", tags=["Pink Bollworm"])

@router.get("/context", response_model=BaseResponse[Dict[str, Any]])
def get_pink_bollworm_context() -> BaseResponse[Dict[str, Any]]:
    """
    Returns published Pink Bollworm survey and station records from Fand et al. (2025).
    Maintains strict separation between Annexure 3 stationwise data and Annexure 4 multilocation data.
    """
    context_data = get_pbw_context()
    return BaseResponse[Dict[str, Any]](
        provenance="measured",
        source="Fand et al. (2025) Agricultural Systems / Mendeley Data",
        units="% loculi damage, % yield loss",
        period="2015-16 to 2019-20 (annual seasons)",
        notes=[
            "Published survey context only; zero temporal overlap with 2023-2024 environmental monitoring.",
            "Annexure 3 and Annexure 4 data originate from different methodologies and must never be averaged.",
            "Boll rot yield loss (10.689%) and PBW yield loss (4.428%) are independent pathologies."
        ],
        data=context_data,
    )

@router.get("/status", response_model=BaseResponse[Dict[str, Any]])
def get_pink_bollworm_status() -> BaseResponse[Dict[str, Any]]:
    """
    Returns the explicit 'data unavailable' status for dated field observations,
    explaining data requirements and listing staged files.
    """
    status_data = get_pbw_status()
    return BaseResponse[Dict[str, Any]](
        provenance="unavailable",
        source="AgroViz Ground-Truth Verification Registry",
        units="none",
        period="2023-06-01 to 2024-12-31",
        notes=[
            "No dated field pest observations (trap counts / boll damage) are loaded.",
            "Published survey data does not overlap the weather/satellite period.",
            "Ground-truth observations are required before any pest risk model can be validated."
        ],
        data=status_data,
    )

@router.get("/template")
def download_csv_template() -> PlainTextResponse:
    """Returns the standardized CSV template for uploading dated pest observations."""
    csv_text = get_pbw_csv_template()
    return PlainTextResponse(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=agroviz_pbw_observation_template.csv"}
    )

@router.post("/upload", response_model=BaseResponse[Dict[str, Any]])
async def upload_pbw_observations(file: UploadFile = File(...)) -> BaseResponse[Dict[str, Any]]:
    """
    Validates uploaded pest observation files against required schema.
    Valid files are placed in data/uploads/ and remain strictly isolated from analytical pipelines.
    """
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    success, message, summary = validate_and_save_pbw_upload(contents, file.filename)
    if not success:
        raise HTTPException(status_code=400, detail=message)

    return BaseResponse[Dict[str, Any]](
        provenance="measured",
        source=f"User Upload ({file.filename})",
        units="various (specified per observation row)",
        period=f"{summary['date_range']['min']} to {summary['date_range']['max']}",
        notes=[
            message,
            "Uploaded observations are stored in data/uploads/ and profiled; they do not automatically compute or modify pest risk scores."
        ],
        data=summary,
    )
