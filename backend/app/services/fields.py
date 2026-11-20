"""
AgroViz Spatial Field Management Service.
Handles CRUD operations for user-defined farm fields and the built-in Akola Research Demo AOI.
Uses flat-file JSON persistence in data/fields/fields.json without external database dependencies.
Calculates geodesic spherical area and validates GeoJSON polygon boundaries.
"""

import json
import math
import os
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.config import DATA_FIELDS_DIR

FIELDS_FILE_PATH = DATA_FIELDS_DIR / "fields.json"
AKOLA_DEMO_ID = "field_akola_research_demo"
EARTH_RADIUS_METERS = 6378137.0


def _generate_circle_polygon(
    lat_deg: float, lon_deg: float, radius_m: float = 10000.0, num_points: int = 64
) -> List[List[float]]:
    """
    Generates a regular spherical geodesic polygon approximating a circular buffer.
    Used to represent the 10 km radius research AOI centered at Akola (20.7069°N, 77.0022°E).
    """
    lat_r = math.radians(lat_deg)
    lon_r = math.radians(lon_deg)
    d_r = radius_m / EARTH_RADIUS_METERS

    coords = []
    for i in range(num_points):
        bearing = 2.0 * math.pi * i / num_points
        lat_point = math.asin(
            math.sin(lat_r) * math.cos(d_r)
            + math.cos(lat_r) * math.sin(d_r) * math.cos(bearing)
        )
        lon_point = lon_r + math.atan2(
            math.sin(bearing) * math.sin(d_r) * math.cos(lat_r),
            math.cos(d_r) - math.sin(lat_r) * math.sin(lat_point),
        )
        coords.append([round(math.degrees(lon_point), 6), round(math.degrees(lat_point), 6)])

    # Close the polygon ring
    coords.append(coords[0])
    return coords


def calculate_polygon_area_ha(coordinates: List[List[float]]) -> float:
    """
    Computes accurate surface area on the WGS84 sphere (in hectares) using spherical excess:
    Area = R^2 * |sum((lon_{i+1} - lon_i) * (2 + sin(lat_i) + sin(lat_{i+1})) / 2)|
    1 hectare = 10,000 m^2.
    """
    if not coordinates or len(coordinates) < 4:
        return 0.0

    total = 0.0
    n = len(coordinates)
    for i in range(n - 1):
        p1 = coordinates[i]
        p2 = coordinates[i + 1]
        lon1 = math.radians(p1[0])
        lat1 = math.radians(p1[1])
        lon2 = math.radians(p2[0])
        lat2 = math.radians(p2[1])
        total += (lon2 - lon1) * (2.0 + math.sin(lat1) + math.sin(lat2))

    area_sq_m = abs(total * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS / 2.0)
    return round(area_sq_m / 10000.0, 2)


def calculate_polygon_centroid(coordinates: List[List[float]]) -> Dict[str, float]:
    """Calculates center of mass (lat/lon) from polygon boundary ring vertices."""
    pts = coordinates[:-1] if len(coordinates) > 1 else coordinates
    if not pts:
        return {"latitude": 0.0, "longitude": 0.0}

    avg_lon = sum(p[0] for p in pts) / len(pts)
    avg_lat = sum(p[1] for p in pts) / len(pts)
    return {"latitude": round(avg_lat, 6), "longitude": round(avg_lon, 6)}


def calculate_polygon_bounds(coordinates: List[List[float]]) -> Dict[str, float]:
    """Computes bounding box [min_lat, min_lon, max_lat, max_lon] from vertices."""
    lons = [p[0] for p in coordinates]
    lats = [p[1] for p in coordinates]
    return {
        "min_lon": round(min(lons), 6),
        "min_lat": round(min(lats), 6),
        "max_lon": round(max(lons), 6),
        "max_lat": round(max(lats), 6),
    }


def validate_geojson_polygon(boundary_input: Any) -> Tuple[Dict[str, Any], float, Dict[str, float], Dict[str, float]]:
    """
    Strictly validates GeoJSON Polygon geometry.
    Returns (cleaned_geojson_dict, area_hectares, centroid, bounds).
    Raises ValueError with descriptive detail on invalid input.
    """
    if not isinstance(boundary_input, dict):
        raise ValueError("Field boundary must be a valid GeoJSON object (dictionary).")

    # If wrapped in a GeoJSON Feature or FeatureCollection
    if boundary_input.get("type") == "Feature":
        geom = boundary_input.get("geometry")
        if not geom or not isinstance(geom, dict):
            raise ValueError("GeoJSON Feature is missing a valid geometry object.")
        boundary_input = geom
    elif boundary_input.get("type") == "FeatureCollection":
        features = boundary_input.get("features", [])
        if not features or not isinstance(features[0], dict):
            raise ValueError("GeoJSON FeatureCollection contains no features.")
        geom = features[0].get("geometry")
        if not geom or not isinstance(geom, dict):
            raise ValueError("GeoJSON FeatureCollection feature is missing geometry.")
        boundary_input = geom

    geom_type = boundary_input.get("type")
    if geom_type != "Polygon":
        raise ValueError(
            f"Invalid geometry type '{geom_type}'. Only 'Polygon' boundaries are supported for field management."
        )

    coords = boundary_input.get("coordinates")
    if not coords or not isinstance(coords, list) or len(coords) < 1:
        raise ValueError("Polygon coordinates must be a non-empty list of coordinate rings.")

    exterior_ring = coords[0]
    if not isinstance(exterior_ring, list) or len(exterior_ring) < 4:
        raise ValueError(
            f"Polygon exterior ring must contain at least 4 coordinate pairs (first and last to close), got {len(exterior_ring) if isinstance(exterior_ring, list) else 0}."
        )

    cleaned_ring = []
    for idx, pt in enumerate(exterior_ring):
        if not isinstance(pt, (list, tuple)) or len(pt) < 2:
            raise ValueError(f"Coordinate at index {idx} is invalid; must be a [longitude, latitude] pair.")
        try:
            lon = float(pt[0])
            lat = float(pt[1])
        except (ValueError, TypeError):
            raise ValueError(f"Coordinate values at index {idx} must be numeric floats.")

        if not (-180.0 <= lon <= 180.0):
            raise ValueError(f"Longitude {lon} at index {idx} is out of valid range [-180, 180].")
        if not (-90.0 <= lat <= 90.0):
            raise ValueError(f"Latitude {lat} at index {idx} is out of valid range [-90, 90].")

        cleaned_ring.append([round(lon, 6), round(lat, 6)])

    # Ensure ring closure (first point equals last point)
    first_pt = cleaned_ring[0]
    last_pt = cleaned_ring[-1]
    if abs(first_pt[0] - last_pt[0]) > 1e-6 or abs(first_pt[1] - last_pt[1]) > 1e-6:
        cleaned_ring.append([first_pt[0], first_pt[1]])

    # Verify at least 3 distinct vertices
    distinct_pts = {f"{p[0]},{p[1]}" for p in cleaned_ring[:-1]}
    if len(distinct_pts) < 3:
        raise ValueError("Polygon is degenerate; it must contain at least 3 distinct non-collinear vertices.")

    # Calculate area and ensure non-zero
    area_ha = calculate_polygon_area_ha(cleaned_ring)
    if area_ha <= 0.0001:
        raise ValueError("Calculated polygon area is 0 or negligible. Please provide a valid non-empty field boundary.")

    centroid = calculate_polygon_centroid(cleaned_ring)
    bounds = calculate_polygon_bounds(cleaned_ring)

    cleaned_geojson = {
        "type": "Polygon",
        "coordinates": [cleaned_ring],
    }
    return cleaned_geojson, area_ha, centroid, bounds


def _build_akola_demo_field() -> Dict[str, Any]:
    """Constructs the canonical built-in Akola Research Demo Field entry."""
    circle_coords = _generate_circle_polygon(20.7069, 77.0022, radius_m=10000.0, num_points=64)
    area_ha = calculate_polygon_area_ha(circle_coords)
    area_acres = round(area_ha * 2.47105, 2)
    centroid = {"latitude": 20.7069, "longitude": 77.0022}
    bounds = calculate_polygon_bounds(circle_coords)

    return {
        "id": AKOLA_DEMO_ID,
        "name": "Akola Cotton Research Zone (10 km AOI)",
        "crop_type": "Cotton (Kharif Baseline)",
        "field_type": "research_aoi",
        "location": "Akola District, Maharashtra, India (Central Coordinate: 20.7069°N, 77.0022°E)",
        "centroid": centroid,
        "bounds": bounds,
        "boundary": {
            "type": "Polygon",
            "coordinates": [circle_coords],
        },
        "area_hectares": area_ha,
        "area_acres": area_acres,
        "sowing_date": "2023-06-15",
        "created_at": "2023-06-01T00:00:00Z",
        "updated_at": "2026-11-20T00:00:00Z",
        "is_demo": True,
        "data_availability": {
            "weather": {
                "available": True,
                "source": "NASA POWER (MERRA-2 Reanalysis)",
                "period": "2023-06-01 to 2024-12-31",
                "records": 580,
                "scope": "Macro-level ~50x60 km grid cell centered at 20.7069°N, 77.0022°E",
            },
            "soil_moisture": {
                "available": True,
                "source": "ECMWF ERA5-Land",
                "period": "2023-06-01 to 2024-12-31",
                "depths": "Layer 1 (0-7cm), Layer 2 (7-28cm), Layer 3 (28-100cm)",
                "records": 580,
                "scope": "9 reanalysis cells covering the 10 km AOI buffer",
            },
            "soil_properties": {
                "available": True,
                "source": "ISRIC SoilGrids 2.0",
                "texture": "Clay (USDA Classification)",
                "depth_slices": 6,
                "scope": "250m global digital soil model (4,419 AOI pixels)",
            },
            "crop_indices": {
                "available": True,
                "source": "Copernicus Sentinel-2 L2A (Harmonized)",
                "period": "2023-06-05 to 2024-12-31",
                "dates": 80,
                "monsoon_cloud_gaps": ["July 2023", "July 2024"],
                "scope": "Unweighted mean across overlapping tiles covering bare soil, diverse vegetation, and crops",
            },
            "pbw_phenology": {
                "available": True,
                "source": "Single-Sine Degree-Day Phenological Model (Sets A & B)",
                "records": 580,
                "scope": "Thermal accumulation driven by NASA POWER daily Tmax/Tmin",
            },
            "entomological_context": {
                "available": True,
                "source": "ICAR-CICR Loss Surveys (Annexures 3 & 4)",
                "note": "Historical survey context without direct 2023-2024 temporal overlap",
            },
            "uploaded_imagery": {"count": 0, "status": "none"},
            "uploaded_sensors": {"count": 0, "status": "none"},
        },
        "provenance": "model_estimated",
        "notes": [
            "Built-in Akola Research Demonstration representing the 10 km radius macro-level research buffer.",
            "Clearly distinguishes the regional research study area from an individual farm parcel.",
            "All underlying datasets reflect regional agro-meteorological baselines and are not to be confused with private single-farm measurements.",
        ],
    }


def _load_user_fields() -> List[Dict[str, Any]]:
    """Loads user fields from flat-file storage in data/fields/fields.json."""
    DATA_FIELDS_DIR.mkdir(parents=True, exist_ok=True)
    if not FIELDS_FILE_PATH.exists():
        return []

    try:
        with open(FIELDS_FILE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            return []
    except Exception as e:
        return []


def _save_user_fields(fields: List[Dict[str, Any]]) -> None:
    """Safely writes user fields list to flat-file storage."""
    DATA_FIELDS_DIR.mkdir(parents=True, exist_ok=True)
    temp_path = FIELDS_FILE_PATH.with_suffix(".tmp")
    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(fields, f, indent=2)
    os.replace(temp_path, FIELDS_FILE_PATH)


# =========================================================================
# Public Field Management Operations
# =========================================================================

def list_all_fields() -> List[Dict[str, Any]]:
    """
    Returns all registered fields:
    The built-in Akola Research Demo Field always appears first, followed by any user-created fields.
    """
    demo_field = _build_akola_demo_field()
    user_fields = _load_user_fields()
    return [demo_field] + user_fields


def get_field_by_id(field_id: str) -> Dict[str, Any]:
    """Retrieves a single field by its unique identifier."""
    if field_id == AKOLA_DEMO_ID:
        return _build_akola_demo_field()

    user_fields = _load_user_fields()
    for f in user_fields:
        if f.get("id") == field_id:
            return f

    raise KeyError(f"Field with ID '{field_id}' does not exist.")


def create_user_field(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Creates a new user farm field:
    - Validates name and crop type
    - Strictly validates GeoJSON polygon geometry
    - Computes geodesic surface area (hectares and acres)
    - Sets centroid and bounding box
    - Initializes availability contracts with explicit unavailable states for unuploaded data
    - Persists to data/fields/fields.json
    """
    name = str(payload.get("name", "")).strip()
    if not name:
        raise ValueError("Field name cannot be empty.")
    if len(name) > 100:
        raise ValueError("Field name cannot exceed 100 characters.")

    crop_type = str(payload.get("crop_type", "Cotton")).strip() or "Cotton"
    location = str(payload.get("location", "")).strip() or None
    sowing_date = payload.get("sowing_date")
    if sowing_date:
        sowing_date = str(sowing_date).strip()
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", sowing_date):
            raise ValueError(f"Sowing date '{sowing_date}' is invalid; must be format YYYY-MM-DD.")

    boundary_raw = payload.get("boundary")
    if not boundary_raw:
        raise ValueError("Field boundary polygon is required.")

    cleaned_geojson, area_ha, centroid, bounds = validate_geojson_polygon(boundary_raw)
    area_acres = round(area_ha * 2.47105, 2)

    now_iso = datetime.now().isoformat()
    unique_id = f"field_{uuid.uuid4().hex[:10]}"

    new_field = {
        "id": unique_id,
        "name": name,
        "crop_type": crop_type,
        "field_type": "farm_boundary",
        "location": location or f"Coordinates ({centroid['latitude']}, {centroid['longitude']})",
        "centroid": centroid,
        "bounds": bounds,
        "boundary": cleaned_geojson,
        "area_hectares": area_ha,
        "area_acres": area_acres,
        "sowing_date": sowing_date,
        "created_at": now_iso,
        "updated_at": now_iso,
        "is_demo": False,
        "data_availability": {
            "weather": {
                "available": False,
                "status": "unavailable",
                "reason": "Requires on-farm weather station CSV upload or localized meteorological integration.",
            },
            "soil_moisture": {
                "available": False,
                "status": "unavailable",
                "reason": "Requires in-situ capacitive soil sensor CSV upload for field root-zone monitoring.",
            },
            "soil_properties": {
                "available": False,
                "status": "unavailable",
                "reason": "Requires field soil laboratory report or localized physical depth extraction.",
            },
            "crop_indices": {
                "available": False,
                "status": "unavailable",
                "reason": "Requires multispectral drone or high-resolution satellite GeoTIFF raster upload.",
            },
            "pbw_phenology": {
                "available": False,
                "status": "unavailable",
                "reason": "Requires on-farm temperature logs and localized field scouting counts.",
            },
            "entomological_context": {
                "available": False,
                "status": "unavailable",
                "reason": "Regional ICAR-CICR historical research surveys do not represent this individual farm parcel.",
            },
            "uploaded_imagery": {"count": 0, "status": "none"},
            "uploaded_sensors": {"count": 0, "status": "none"},
        },
        "provenance": "user_provided",
        "notes": [
            "User-created precision agriculture farm field.",
            "Area calculated using WGS84 geodesic spherical excess.",
            "Strict scientific isolation: regional 10 km Akola research baseline data is NOT automatically displayed as this farm's observations.",
        ],
    }

    user_fields = _load_user_fields()
    user_fields.append(new_field)
    _save_user_fields(user_fields)

    return new_field


def update_user_field(field_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Updates an existing user field. The built-in Akola demo cannot be altered."""
    if field_id == AKOLA_DEMO_ID:
        raise PermissionError("The built-in Akola Research Demo field cannot be modified.")

    user_fields = _load_user_fields()
    found_idx = None
    for idx, f in enumerate(user_fields):
        if f.get("id") == field_id:
            found_idx = idx
            break

    if found_idx is None:
        raise KeyError(f"Field with ID '{field_id}' does not exist.")

    field = user_fields[found_idx]

    if "name" in payload and payload["name"] is not None:
        name = str(payload["name"]).strip()
        if not name:
            raise ValueError("Field name cannot be empty.")
        if len(name) > 100:
            raise ValueError("Field name cannot exceed 100 characters.")
        field["name"] = name

    if "crop_type" in payload and payload["crop_type"] is not None:
        field["crop_type"] = str(payload["crop_type"]).strip()

    if "location" in payload:
        field["location"] = str(payload["location"]).strip() if payload["location"] else None

    if "sowing_date" in payload:
        s_date = payload["sowing_date"]
        if s_date:
            s_date = str(s_date).strip()
            if not re.match(r"^\d{4}-\d{2}-\d{2}$", s_date):
                raise ValueError(f"Sowing date '{s_date}' is invalid; must be format YYYY-MM-DD.")
            field["sowing_date"] = s_date
        else:
            field["sowing_date"] = None

    if "boundary" in payload and payload["boundary"] is not None:
        cleaned_geojson, area_ha, centroid, bounds = validate_geojson_polygon(payload["boundary"])
        field["boundary"] = cleaned_geojson
        field["area_hectares"] = area_ha
        field["area_acres"] = round(area_ha * 2.47105, 2)
        field["centroid"] = centroid
        field["bounds"] = bounds

    field["updated_at"] = datetime.now().isoformat()
    user_fields[found_idx] = field
    _save_user_fields(user_fields)

    return field


def delete_user_field(field_id: str) -> Dict[str, Any]:
    """Deletes an existing user field. The built-in Akola demo cannot be deleted."""
    if field_id == AKOLA_DEMO_ID:
        raise PermissionError("The built-in Akola Research Demo field is permanent and cannot be deleted.")

    user_fields = _load_user_fields()
    initial_len = len(user_fields)
    user_fields = [f for f in user_fields if f.get("id") != field_id]

    if len(user_fields) == initial_len:
        raise KeyError(f"Field with ID '{field_id}' does not exist.")

    _save_user_fields(user_fields)
    return {"id": field_id, "deleted": True}
