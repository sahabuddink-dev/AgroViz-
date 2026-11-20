"""
FastAPI Router for Field Health Report Compilation and Export.
Exports multi-layer agronomic summaries, spatial boundaries, and active alerts
in structured JSON or tabular CSV format.
"""

from typing import Any, Dict, List, Literal, Optional
from fastapi import APIRouter, HTTPException, Query, Response, status
from pydantic import BaseModel, Field

from app.schemas import BaseResponse
from app.services.fields import AKOLA_DEMO_ID
from app.services.reports import compile_field_report, export_report_to_csv

router = APIRouter(prefix="/api/reports", tags=["Field Health Reports"])


class ExportReportRequest(BaseModel):
    field_id: str = Field(default=AKOLA_DEMO_ID, description="Target field ID")
    format: Literal["json", "csv"] = Field(default="json", description="Export format: 'json' or 'csv'")


@router.post(
    "/export",
    summary="Compile and export field health report (JSON or downloadable CSV)",
)
def export_report_post(payload: ExportReportRequest):
    """
    Compiles a comprehensive field health report:
    - Spatial boundary & metadata
    - Biophysical module summaries (Weather, Soil, S2 Indices, PBW Phenology)
    - Active evidence-based agronomic alerts
    - Academic literature citations & scientific integrity audit trail
    """
    try:
        report = compile_field_report(payload.field_id)

        if payload.format == "csv":
            csv_content = export_report_to_csv(report)
            filename = f"agroviz_report_{payload.field_id}.csv"
            return Response(
                content=csv_content,
                media_type="text/csv",
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"',
                },
            )

        # Default JSON response
        return BaseResponse(
            provenance="calculated",
            source="AgroViz Field Report Generator",
            units="various",
            period="current",
            notes=[
                "Comprehensive precision agriculture field health report.",
                "Combines spatial geometry, active alerts, multi-layer analytics, and scientific citations.",
            ],
            data=report,
        )
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get(
    "/export",
    summary="Download field health report via GET (useful for direct browser link download)",
)
def export_report_get(
    field_id: str = Query(default=AKOLA_DEMO_ID, description="Target field ID"),
    format: Literal["json", "csv"] = Query(default="json", description="Format: 'json' or 'csv'"),
):
    """GET variant of report export for browser download links."""
    return export_report_post(ExportReportRequest(field_id=field_id, format=format))
