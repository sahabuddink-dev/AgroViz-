from fastapi import APIRouter
from ..config import APP_TITLE, APP_VERSION, DATA_RAW_DIR
from ..schemas import BaseResponse, HealthData
from ..services.registry import get_data_registry_summary

router = APIRouter(prefix="/api", tags=["System"])

@router.get("/health", response_model=BaseResponse[HealthData])
def get_health() -> BaseResponse[HealthData]:
    registry_summary = get_data_registry_summary()
    
    health_payload = HealthData(
        status="healthy" if registry_summary.all_present else "degraded",
        app_name=APP_TITLE,
        version=APP_VERSION,
        environment="local",
        datasets_present=registry_summary.total_found,
        datasets_total=registry_summary.total_expected,
        data_raw_path=str(DATA_RAW_DIR),
    )
    
    return BaseResponse[HealthData](
        provenance="measured",
        source="AgroViz Diagnostic Monitor",
        units="count",
        period="current",
        notes=[
            f"{registry_summary.total_found} of {registry_summary.total_expected} canonical datasets detected in data/raw.",
            "All datasets tagged with provenance per CLAUDE.md guidelines."
        ],
        data=health_payload,
    )
