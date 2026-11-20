"""
Router for AI & Machine Learning Inference Services (AgroViz SIH25099).
Provides:
- Model Registry & Architecture Metadata (CNN & LSTM)
- CNN-based Spectral Canopy Stress Prediction
- LSTM-based 15-Day Vegetation Index Trajectory Forecasting
- Multi-Modal AI Pest & Disease Risk Indicator
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query

from ..schemas import BaseResponse
from ..ml.cnn_model import predict_crop_stress
from ..ml.lstm_model import forecast_vegetation_indices
from ..ml.registry import get_ai_models_metadata
from ..services.zones import get_zone_series, get_all_zones
from ..services.pbw import calculate_degree_days

router = APIRouter(prefix="/api/ai", tags=["AI Inference & Models"])


class SpectralPredictRequest(BaseModel):
    zone_id: Optional[int] = Field(None, description="Optional zone ID to use latest observed spectral bands")
    spectral_bands: Optional[Dict[str, float]] = Field(
        None,
        description="Dictionary of 8 Sentinel-2 bands: B2, B3, B4, B5, B8, B8A, B11, B12 (values 0.0 to 1.0)",
    )
    scale_factor: float = Field(1.0, description="Scale factor if values are unscaled integers (e.g. 0.0001 for 10000)")


class LSTMFoerecastRequest(BaseModel):
    zone_id: Optional[int] = Field(None, description="Optional zone ID to forecast from historical zone series")
    horizon_days: int = Field(15, ge=5, le=30, description="Forecast horizon in days (default: 15)")
    custom_sequence: Optional[List[Dict[str, Any]]] = Field(
        None, description="Optional custom time-series sequence for hypothetical simulation"
    )


@router.get("/models", response_model=BaseResponse[Dict[str, Any]])
def get_model_registry() -> BaseResponse[Dict[str, Any]]:
    """Retrieves metadata, architectures, layer parameters, and benchmarks for registered AI models."""
    meta = get_ai_models_metadata()
    return BaseResponse[Dict[str, Any]](
        provenance="model_estimated",
        source="AgroViz AI Model Registry (PyTorch 2.14)",
        units="none",
        period="v1.2.0",
        notes=[
            "Models execute deterministically in local PyTorch runtime.",
            "CNN operates across 8 multi-spectral Sentinel-2 bands.",
            "LSTM ingests multi-variate optical + radar + weather sequences.",
        ],
        data=meta,
    )


@router.post("/predict/crop-stress", response_model=BaseResponse[Dict[str, Any]])
def predict_canopy_stress(payload: SpectralPredictRequest) -> BaseResponse[Dict[str, Any]]:
    """
    Executes Spatial-Spectral CNN forward pass to classify crop canopy health state.
    Can ingest either custom 8-band spectral dictionary or use the latest observation from a zone.
    """
    bands_input: Dict[str, float] = {}

    if payload.zone_id is not None:
        try:
            series = get_zone_series(payload.zone_id)
            s2_list = series.get("sentinel2_series", [])
            if not s2_list:
                raise ValueError(f"No Sentinel-2 observations found for Zone {payload.zone_id}")
            latest_obs = s2_list[-1]
            bands_input = {
                "B2": latest_obs.get("B2") or 0.04,
                "B3": latest_obs.get("B3") or 0.07,
                "B4": latest_obs.get("B4") or 0.05,
                "B5": latest_obs.get("B5") or 0.12,
                "B8": latest_obs.get("B8") or 0.45,
                "B8A": latest_obs.get("B8A") or 0.46,
                "B11": latest_obs.get("B11") or 0.15,
                "B12": latest_obs.get("B12") or 0.09,
            }
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
    elif payload.spectral_bands:
        bands_input = payload.spectral_bands
    else:
        raise HTTPException(
            status_code=400,
            detail="Must provide either 'zone_id' or 'spectral_bands' with B2, B3, B4, B5, B8, B8A, B11, B12.",
        )

    try:
        pred = predict_crop_stress(bands_input, scale_factor=payload.scale_factor)
        if payload.zone_id is not None:
            pred["zone_id"] = payload.zone_id
            pred["zone_name"] = f"Monitoring Zone {payload.zone_id}"

        return BaseResponse[Dict[str, Any]](
            provenance="model_estimated",
            source="CropStressCNN v1.2.0 (PyTorch 2.14)",
            units="probability",
            period="real-time inference",
            notes=[
                "Classification inferred directly from 8-band spectral surface reflectance.",
                "Combines learned CNN latent feature representations with physiological index calibration.",
            ],
            data=pred,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CNN inference error: {str(e)}")


@router.post("/forecast/indices", response_model=BaseResponse[Dict[str, Any]])
def forecast_vegetation_trend(payload: LSTMFoerecastRequest) -> BaseResponse[Dict[str, Any]]:
    """
    Executes Multi-Variate LSTM forward pass to forecast next 15 days of NDVI trajectory.
    Detects sudden vegetative drops and flags temporal anomalies.
    """
    seq_records: List[Dict[str, Any]] = []
    base_date: Optional[str] = None

    if payload.zone_id is not None:
        try:
            series = get_zone_series(payload.zone_id)
            seq_records = series.get("sentinel2_series", [])
            if not seq_records:
                raise ValueError(f"No historical observations available for Zone {payload.zone_id}")
            base_date = seq_records[-1].get("date")
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
    elif payload.custom_sequence:
        seq_records = payload.custom_sequence
    else:
        raise HTTPException(
            status_code=400,
            detail="Must provide either 'zone_id' or 'custom_sequence' containing historical observations.",
        )

    try:
        fc = forecast_vegetation_indices(
            seq_records,
            horizon_days=payload.horizon_days,
            last_date=base_date,
        )
        if payload.zone_id is not None:
            fc["zone_id"] = payload.zone_id
            fc["zone_name"] = f"Monitoring Zone {payload.zone_id}"

        return BaseResponse[Dict[str, Any]](
            provenance="model_estimated",
            source="VegetationLSTMForecaster v1.1.0 (PyTorch 2.14)",
            units="NDVI index [-1.0 to 1.0]",
            period=f"Next {payload.horizon_days} days forward",
            notes=[
                f"15-day forward NDVI trajectory projected from {len(seq_records)} historical multi-sensor observations.",
                "Confidence intervals (95%) expand dynamically over the forecast horizon.",
                "Forecast models physiological trajectory; actual future NDVI will depend on unobserved weather events.",
            ],
            data=fc,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LSTM forecasting error: {str(e)}")


@router.get("/pest-risk", response_model=BaseResponse[Dict[str, Any]])
def get_ai_pest_risk_indicator(
    zone_id: Optional[int] = Query(1, description="Monitoring Zone ID (1 to 30)"),
) -> BaseResponse[Dict[str, Any]]:
    """
    AI-supported multi-factor pest and disease risk indicator for cotton Pink Bollworm.
    Integrates:
    - Thermal degree-day accumulation (Single-sine phenology)
    - LSTM vegetative anomaly score (canopy defoliation / premature drop)
    - CHIRPS moisture & rainfall conditions
    """
    try:
        series = get_zone_series(zone_id)
        s2_list = series.get("sentinel2_series", [])
        env_list = series.get("environmental_series", [])
        chirps_list = series.get("rainfall_series", [])

        # Run LSTM anomaly check
        lstm_res = forecast_vegetation_indices(s2_list, horizon_days=15)
        anomaly_score = lstm_res.get("anomaly_score", 0.0)

        # Calculate thermal degree days for Akola region
        dd_data = calculate_degree_days(param_set_key="A")
        dd_summary = dd_data.get("summary", {})
        accumulated_dd = dd_summary.get("total_accumulated_dd", 0.0)
        generations = dd_summary.get("completed_generations", 0)

        # Recent rainfall sum (past 14 days)
        recent_rain = sum(r.get("rainfall_mm", 0.0) for r in chirps_list[-14:])

        # Multi-factor score formulation (0.0 to 1.0)
        # 1. Thermal factor: higher DD accumulation promotes rapid pest lifecycle
        thermal_factor = min(1.0, accumulated_dd / 2500.0) * 0.40
        # 2. Vegetation anomaly factor: rapid drop suggests potential damage
        canopy_factor = anomaly_score * 0.35
        # 3. Moisture factor: high humidity and moderate rainfall favor emergence
        moisture_factor = min(1.0, recent_rain / 100.0) * 0.25

        risk_score = round(thermal_factor + canopy_factor + moisture_factor, 3)

        if risk_score >= 0.70:
            risk_level = "High Risk"
            recommendation = "High alert: thermal generation threshold and canopy stress alignment. Perform in-field pheromone trap scouting."
        elif risk_score >= 0.40:
            risk_level = "Moderate Risk"
            recommendation = "Moderate risk: active thermal accumulation detected. Monitor square/boll formation stages."
        else:
            risk_level = "Low Risk"
            recommendation = "Low current risk: environmental and spectral indicators within baseline bounds."

        return BaseResponse[Dict[str, Any]](
            provenance="model_estimated",
            source="AgroViz AI Pest Risk Multi-Factor Fusion Model",
            units="risk_score [0.0 to 1.0]",
            period="current evaluation",
            notes=[
                "Evidence-based indicator fusing thermal phenology, LSTM canopy anomaly scoring, and rainfall drivers.",
                "Degree-day accumulation indicates thermal feasibility of pest development.",
                "Indicator is a screening alert; physical trap catches are required for statutory infestation confirmation.",
            ],
            data={
                "zone_id": zone_id,
                "risk_level": risk_level,
                "risk_score": risk_score,
                "recommendation": recommendation,
                "component_factors": {
                    "thermal_degree_days_accumulated": round(accumulated_dd, 1),
                    "completed_generations": generations,
                    "canopy_anomaly_score": round(anomaly_score, 3),
                    "recent_14day_rainfall_mm": round(recent_rain, 1),
                },
                "lstm_trend": lstm_res.get("trend_assessment"),
                "evaluated_at": "2024-12-31",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pest risk indicator failed: {str(e)}")
