"""
FastAPI Router for Deterministic Agricultural Alert Engine.
Serves evidence-based agronomic alerts evaluated on field data.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas import BaseResponse
from app.services.alerts import evaluate_field_alerts
from app.services.fields import AKOLA_DEMO_ID

router = APIRouter(prefix="/api/alerts", tags=["Agricultural Alert Engine"])


@router.get(
    "",
    response_model=BaseResponse[List[Dict[str, Any]]],
    summary="Get active deterministic agronomic alerts for a field",
)
def get_alerts(
    field_id: Optional[str] = Query(
        default=AKOLA_DEMO_ID,
        description="Field ID to evaluate alerts for (defaults to Akola Research Demo)",
    )
):
    """
    Evaluates evidence-based agricultural rules for a field:
    - Optical satellite cloud occlusion alerts (monsoon blindspot)
    - Topsoil volumetric moisture depletion (provisional threshold)
    - Thermal degree-day insect phenology milestones (Set A & Set B)
    - High diurnal summer heatwave thresholds (>35.5°C upper cutoff)
    - Field data onboarding requirements for user fields

    Enforces strict scientific provenance and isolation between regional baselines and farm fields.
    """
    try:
        alerts = evaluate_field_alerts(field_id)
        return BaseResponse(
            provenance="calculated",
            source="AgroViz Deterministic Alert Engine",
            units="none",
            period="current",
            notes=[
                "Alerts derived strictly from deterministic agronomic rules and observed reanalysis/satellite thresholds.",
                "Degree-day heat units denote biological developmental potential, NOT confirmed in-situ infestation.",
                "Regional 10 km Akola research baseline alerts are not attributed to private user fields.",
            ],
            data=alerts,
        )
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
