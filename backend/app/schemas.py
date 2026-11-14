from typing import Generic, List, Literal, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")

ProvenanceType = Literal["measured", "calculated", "model_estimated", "unavailable"]

class BaseResponse(BaseModel, Generic[T]):
    """Standard API contract response wrapper for all AgroViz endpoints (CLAUDE.md Section 8)."""
    provenance: ProvenanceType = Field(
        ...,
        description="Data provenance classification: measured, calculated, model_estimated, or unavailable"
    )
    source: str = Field(..., description="Data source or provider reference")
    units: str = Field(..., description="Measurement units or 'none'/'various'")
    period: str = Field(..., description="Temporal coverage or valid period")
    notes: List[str] = Field(default_factory=list, description="Methodology caveats and notices")
    data: T = Field(..., description="Payload data")

class HealthData(BaseModel):
    status: str
    app_name: str
    version: str
    environment: str
    datasets_present: int
    datasets_total: int
    data_raw_path: str

class DatasetManifestItem(BaseModel):
    id: str
    canonical_filename: str
    role: str
    role_category: Literal["core", "context", "validation", "cross_check"]
    provenance: ProvenanceType
    source: str
    period: str
    units: str
    description: str
    exists: bool
    size_bytes: Optional[int] = None
    notes: List[str] = Field(default_factory=list)

class DataRegistrySummary(BaseModel):
    total_expected: int
    total_found: int
    all_present: bool
    datasets: List[DatasetManifestItem]
