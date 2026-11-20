"""
FastAPI router for Imagery and Multispectral Raster Processing.
Provides endpoints for GeoTIFF upload validation and multispectral vegetation index
computation (NDVI, NDRE, NDMI).
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.schemas import BaseResponse
from app.services.raster import validate_and_save_geotiff, compute_raster_indices

router = APIRouter(prefix="/api/imagery", tags=["Imagery & Raster Processing"])


class ComputeIndicesRequest(BaseModel):
    upload_id: str = Field(..., description="Uploaded GeoTIFF filename or upload_id")
    band_mapping: Dict[str, int] = Field(
        ...,
        description="Mapping of spectral band names to 1-indexed band numbers, e.g. {'red': 3, 'nir': 5, 'red_edge': 4}",
    )
    selected_indices: Optional[List[str]] = Field(
        default=None,
        description="List of indices to compute, e.g. ['NDVI', 'NDRE', 'NDMI']. Defaults to all possible.",
    )


@router.post(
    "/upload",
    response_model=BaseResponse,
    summary="Upload and validate a multispectral GeoTIFF raster",
)
async def upload_geotiff_raster(file: UploadFile = File(...)):
    """
    Ingests and validates a user-uploaded GeoTIFF raster:
    - Verifies file format, TIFF magic headers, and corruption
    - Validates dimensions, data type, band count
    - Extracts CRS and spatial bounding coordinates
    - Detects NoData value and suggested band mappings
    - Safely stores file and metadata in data/uploads/
    """
    filename_lower = file.filename.lower()
    if not (filename_lower.endswith(".tif") or filename_lower.endswith(".tiff")):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid file format. Only GeoTIFF rasters (.tif, .tiff) are accepted.",
        )

    try:
        contents = await file.read()
        metadata = validate_and_save_geotiff(contents, file.filename)
        return BaseResponse(
            provenance="user_provided",
            source=f"User Upload ({file.filename})",
            units="reflectance_digital_number",
            period=metadata.get("uploaded_at", "current"),
            notes=[
                "GeoTIFF uploaded and validated. Metadata extracted and file stored in data/uploads/.",
                "Ready for band mapping and multispectral index computation."
            ],
            data=metadata,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing GeoTIFF upload: {str(e)}",
        )


@router.post(
    "/compute-indices",
    response_model=BaseResponse,
    summary="Compute multispectral vegetation indices (NDVI, NDRE, NDMI) from uploaded raster",
)
def compute_indices(req: ComputeIndicesRequest):
    """
    Computes requested vegetation indices from an uploaded raster:
    - NDVI = (NIR - Red) / (NIR + Red)
    - NDRE = (NIR - Red Edge) / (NIR + Red Edge)
    - NDMI = (NIR - SWIR) / (NIR + SWIR)

    Zonal statistics (mean, min, max, std, median) and distribution histograms are computed
    over valid pixels with robust zero-denominator and NoData handling.
    """
    try:
        results = compute_raster_indices(
            upload_id=req.upload_id,
            band_mapping=req.band_mapping,
            selected_indices=req.selected_indices,
        )
        return BaseResponse(
            provenance="calculated",
            source=f"Multispectral Raster ({req.upload_id})",
            units="index_ratio (-1.0 to 1.0)",
            period=results.get("computed_at", "current"),
            notes=[
                "Multispectral vegetation indices calculated directly from uploaded raster pixel values.",
                "Zero denominators and NoData pixels safely masked from zonal statistics.",
                "Indices indicate relative canopy vigor and moisture; they do NOT confirm specific crop disease or insect presence."
            ],
            data=results,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compute indices: {str(e)}",
        )
