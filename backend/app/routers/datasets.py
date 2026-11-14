from fastapi import APIRouter
from ..schemas import BaseResponse, DataRegistrySummary
from ..services.registry import get_data_registry_summary

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
