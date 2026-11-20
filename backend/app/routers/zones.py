"""
Router for 30 Remote Sensing Monitoring Zones (AgroViz SIH25099).
Provides zonal listings, GeoJSON polygon boundaries, static terrain/soil profiles,
and synchronized multi-sensor time-series (Sentinel-2, Sentinel-1 SAR, ERA5, CHIRPS).
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query

from ..schemas import BaseResponse
from ..services.zones import (
    get_all_zones,
    get_zones_geojson,
    get_zone_detail,
    get_zone_series,
)

router = APIRouter(prefix="/api/zones", tags=["Remote Sensing Zones"])


@router.get("", response_model=BaseResponse[List[Dict[str, Any]]])
def list_monitoring_zones() -> BaseResponse[List[Dict[str, Any]]]:
    """Retrieves all 30 remote sensing monitoring zones with latest multi-sensor metrics."""
    zones = get_all_zones()
    return BaseResponse[List[Dict[str, Any]]](
        provenance="measured",
        source="AgroViz Multi-Sensor Zone Registry (S2 MSI, S1 SAR, ERA5-Land, CHIRPS)",
        units="various",
        period="2023-06-01 to 2024-12-31",
        notes=[
            f"30 monitoring zones covering the Vidarbha cotton agro-ecological zone.",
            "Each zone represents a defined remote sensing polygon observation area.",
            "Metrics reflect latest available observations across optical and radar sensors.",
        ],
        data=zones,
    )


@router.get("/geojson", response_model=BaseResponse[Dict[str, Any]])
def get_zones_map_geojson() -> BaseResponse[Dict[str, Any]]:
    """Returns a GeoJSON FeatureCollection containing all 30 zone polygon boundaries and properties."""
    fc = get_zones_geojson()
    return BaseResponse[Dict[str, Any]](
        provenance="measured",
        source="AgroViz Spatial Database",
        units="coordinates",
        period="current",
        notes=["GeoJSON FeatureCollection formatted for direct Leaflet / OpenLayers rendering."],
        data=fc,
    )


@router.get("/{zone_id}", response_model=BaseResponse[Dict[str, Any]])
def get_zone_information(zone_id: int) -> BaseResponse[Dict[str, Any]]:
    """Retrieves detailed profile, terrain parameters, and SoilGrids depth profiles for a single zone."""
    try:
        detail = get_zone_detail(zone_id)
        return BaseResponse[Dict[str, Any]](
            provenance="measured",
            source="AgroViz Zone Data Service",
            units="various",
            period="2023-06-01 to 2024-12-31",
            notes=[f"Comprehensive diagnostic dossier for Zone {zone_id}."],
            data=detail,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{zone_id}/series", response_model=BaseResponse[Dict[str, Any]])
def get_zone_multisensor_series(
    zone_id: int,
    start: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
) -> BaseResponse[Dict[str, Any]]:
    """Retrieves synchronized multi-sensor daily series (Sentinel-2, Sentinel-1 SAR, ERA5 weather, CHIRPS rainfall)."""
    try:
        series_data = get_zone_series(zone_id, start_date=start, end_date=end)
        return BaseResponse[Dict[str, Any]](
            provenance="measured",
            source="Multi-Sensor Fusion (Sentinel-2 L2A, Sentinel-1 GRD, ERA5-Land, CHIRPS)",
            units="various",
            period=f"{start or '2023-06-01'} to {end or '2024-12-31'}",
            notes=[
                "Sentinel-2 optical observations are strictly cloud-filtered; monsoon gaps are preserved without fabrication.",
                "Sentinel-1 SAR dual-polarization observations provide all-weather cloud-penetrating radar backscatter.",
            ],
            data=series_data,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
