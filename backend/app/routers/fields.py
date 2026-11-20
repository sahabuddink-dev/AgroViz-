"""
FastAPI Router for Spatial Field Management.
Provides CRUD endpoints for managing agricultural fields (built-in Akola Research Demo + user fields)
with GeoJSON polygon boundary validation and geodesic area calculation.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Path, status
from pydantic import BaseModel, Field

from app.schemas import BaseResponse
from app.services.fields import (
    create_user_field,
    delete_user_field,
    get_field_by_id,
    list_all_fields,
    update_user_field,
)

router = APIRouter(prefix="/api/fields", tags=["Spatial Field Management"])


class CreateFieldRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Field name")
    crop_type: Optional[str] = Field(default="Cotton", description="Crop type (e.g. Cotton, Soybean, Pigeonpea)")
    boundary: Dict[str, Any] = Field(..., description="GeoJSON Polygon boundary object")
    location: Optional[str] = Field(default=None, description="Human-readable location or village/district name")
    sowing_date: Optional[str] = Field(
        default=None,
        description="Sowing date in YYYY-MM-DD format",
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    )


class UpdateFieldRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    crop_type: Optional[str] = Field(default=None)
    boundary: Optional[Dict[str, Any]] = Field(default=None)
    location: Optional[str] = Field(default=None)
    sowing_date: Optional[str] = Field(
        default=None,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    )


@router.get(
    "",
    response_model=BaseResponse[List[Dict[str, Any]]],
    summary="List all registered fields (built-in Akola Research Demo + user fields)",
)
def get_fields():
    """
    Returns all registered spatial fields:
    - Preloaded Akola Cotton Research Demonstration (10 km AOI buffer)
    - All user-created farm field boundaries
    """
    fields = list_all_fields()
    return BaseResponse(
        provenance="calculated",
        source="AgroViz Field Management Registry",
        units="hectares / acres",
        period="current",
        notes=[
            "Contains built-in Akola 10 km research AOI and user-created farm boundaries.",
            "Area computed via WGS84 geodesic spherical excess.",
        ],
        data=fields,
    )


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=BaseResponse[Dict[str, Any]],
    summary="Create a new user farm field with GeoJSON polygon boundary",
)
def create_field(payload: CreateFieldRequest):
    """
    Registers a new user-defined farm boundary:
    - Validates name, crop, and GeoJSON polygon geometry
    - Calculates geodesic surface area in hectares and acres
    - Computes polygon centroid and bounding box
    - Enforces scientific isolation from regional research datasets
    """
    try:
        new_field = create_user_field(payload.model_dump())
        return BaseResponse(
            provenance="user_provided",
            source="User Spatial Registration",
            units="hectares / acres",
            period="current",
            notes=[
                f"Field '{new_field['name']}' successfully registered with area {new_field['area_hectares']} ha.",
                "Regional Akola baseline datasets are not automatically mapped to private user fields.",
            ],
            data=new_field,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get(
    "/{field_id}",
    response_model=BaseResponse[Dict[str, Any]],
    summary="Retrieve field details, GeoJSON boundary, and data availability",
)
def get_field(field_id: str = Path(..., description="Unique field ID")):
    """Retrieves full details for a single field by ID."""
    try:
        field = get_field_by_id(field_id)
        return BaseResponse(
            provenance=field.get("provenance", "calculated"),
            source=f"Field Registry ({field_id})",
            units="hectares / acres",
            period="current",
            notes=field.get("notes", []),
            data=field,
        )
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put(
    "/{field_id}",
    response_model=BaseResponse[Dict[str, Any]],
    summary="Update user field metadata or boundary geometry",
)
def update_field(
    payload: UpdateFieldRequest,
    field_id: str = Path(..., description="Unique field ID"),
):
    """Updates an existing user field. The built-in Akola demo cannot be altered."""
    try:
        updated = update_user_field(field_id, payload.model_dump(exclude_unset=True))
        return BaseResponse(
            provenance="user_provided",
            source=f"Field Registry Update ({field_id})",
            units="hectares / acres",
            period="current",
            notes=[f"Field '{updated['name']}' updated successfully."],
            data=updated,
        )
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.delete(
    "/{field_id}",
    response_model=BaseResponse[Dict[str, Any]],
    summary="Delete a user-created farm field",
)
def delete_field(field_id: str = Path(..., description="Unique field ID")):
    """Deletes a user-created field. The built-in Akola research demo cannot be deleted."""
    try:
        result = delete_user_field(field_id)
        return BaseResponse(
            provenance="user_provided",
            source="Field Registry Deletion",
            units="none",
            period="current",
            notes=[f"Field '{field_id}' deleted successfully."],
            data=result,
        )
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
