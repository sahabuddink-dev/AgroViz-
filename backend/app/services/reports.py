"""
AgroViz Field Health Report Generation Service.
Compiles multi-layer agronomic summaries, spatial boundaries, biophysical indicators,
active alerts, literature citations, and provenance logs into structured JSON and tabular CSV exports.
"""

import io
import csv
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from app.services.alerts import evaluate_field_alerts
from app.services.fields import AKOLA_DEMO_ID, get_field_by_id
from app.services.weather import get_daily_weather, get_monthly_weather_summary
from app.services.soil import get_soil_properties_data
from app.services.crop import get_crop_indices_data
from app.services.pbw import calculate_degree_days


def compile_field_report(field_id: str) -> Dict[str, Any]:
    """
    Assembles a comprehensive precision agriculture field report for the specified field.
    """
    field = get_field_by_id(field_id)
    is_demo = field.get("is_demo") or field.get("field_type") == "research_aoi"
    alerts = evaluate_field_alerts(field_id)
    generated_at = datetime.now().isoformat()

    report: Dict[str, Any] = {
        "report_id": f"report_{field_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "field_id": field_id,
        "field_name": field["name"],
        "crop_type": field.get("crop_type", "Cotton"),
        "field_type": field.get("field_type", "farm_boundary"),
        "location": field.get("location"),
        "centroid": field.get("centroid"),
        "area_hectares": field.get("area_hectares"),
        "area_acres": field.get("area_acres"),
        "sowing_date": field.get("sowing_date"),
        "generated_at": generated_at,
        "platform_version": "0.1.0",
        "data_availability": field.get("data_availability", {}),
        "active_alerts": alerts,
        "citations": [
            "Fand, B.B. et al. (2025). Field estimates of current and predicted cotton yield loss due to pink bollworm and boll rot in India. Agricultural Systems, 224, 104246. DOI: 10.1016/j.agsy.2024.104246",
            "Pathan, B. et al. (2021). Degree day-based model predicts pink bollworm phenology across geographical locations. Scientific Reports, 11, 436. DOI: 10.1038/s41598-020-80184-6",
            "NASA POWER / MERRA-2 Global Atmospheric Reanalysis (NASA Langley Research Center)",
            "Copernicus Sentinel-2 L2A (Harmonized) via European Space Agency / Google Earth Engine",
            "ECMWF ERA5-Land Reanalysis (European Centre for Medium-Range Weather Forecasts)",
            "ISRIC SoilGrids 2.0 Global Gridded Soil Information (International Soil Reference and Information Centre)",
        ],
        "scientific_disclaimers": [
            "AgroViz enforces strict scientific boundaries between regional research baselines and private farm fields.",
            "Optical vegetation indices (NDVI/NDRE/NDMI) reflect relative canopy greenness and liquid water content; they do NOT diagnose specific plant diseases or confirm Pink Bollworm infestation.",
            "Thermal degree-days indicate physiological heat accumulation potential only, not confirmed in-situ trap captures.",
            "Soil moisture volumetric thresholds are provisional until calibrated with local soil water retention curves.",
        ],
    }

    if is_demo:
        # Preloaded Akola Research Demonstration Summaries
        w_res = get_daily_weather(limit=1)
        w_stats = w_res.get("statistics", {})

        s2_res = get_crop_indices_data(limit=1)
        s2_stats = s2_res.get("data", {}).get("statistics", {})

        soil_props = get_soil_properties_data()
        soil_avg = soil_props.get("overall_averages", {})

        dd_res = calculate_degree_days(param_set_key="BOTH", start_date="2023-06-15", end_date="2024-12-31")

        report["module_summaries"] = {
            "weather": {
                "source": "NASA POWER (Point 20.7069°N, 77.0022°E)",
                "period": "2023-06-01 to 2024-12-31 (580 continuous daily records)",
                "mean_temperature_c": w_stats.get("temperature", {}).get("mean_t2m"),
                "max_temperature_c": w_stats.get("temperature", {}).get("highest_t2m_max", {}).get("value"),
                "total_precipitation_mm": w_stats.get("precipitation", {}).get("total_precipitation_mm"),
                "rainy_days": w_stats.get("precipitation", {}).get("rainy_days_count"),
            },
            "crop_health": {
                "source": "Copernicus Sentinel-2 L2A (10 km AOI unweighted mean)",
                "period": "2023-06-05 to 2024-12-31 (80 observation dates)",
                "mean_ndvi": s2_stats.get("ndvi", {}).get("mean"),
                "mean_ndre": s2_stats.get("ndre", {}).get("mean"),
                "mean_ndmi": s2_stats.get("ndmi", {}).get("mean"),
                "cloud_gap_notice": "Zero valid observations in July 2023 & July 2024 due to 100% monsoon cloud cover (preserved without interpolation).",
            },
            "soil_conditions": {
                "source": "ECMWF ERA5-Land (3 Depths) & ISRIC SoilGrids 2.0",
                "texture_classification": soil_avg.get("usda_texture", "Clay"),
                "clay_pct": soil_avg.get("clay_pct"),
                "silt_pct": soil_avg.get("silt_pct"),
                "sand_pct": soil_avg.get("sand_pct"),
                "ph_h2o": soil_avg.get("ph_h2o"),
            },
            "pest_phenology": {
                "source": "Single-Sine Degree-Day Engine (NASA POWER)",
                "biofix_start_date": "2023-06-15",
                "accumulated_degree_days_set_a": dd_res.get("set_a", {}).get("accumulated_degree_days"),
                "potential_generations_set_a": dd_res.get("set_a", {}).get("potential_generations"),
                "accumulated_degree_days_set_b": dd_res.get("set_b", {}).get("accumulated_degree_days"),
                "potential_generations_set_b": dd_res.get("set_b", {}).get("potential_generations"),
            },
        }
    else:
        # User-created farm field
        report["module_summaries"] = {
            "status": "Awaiting Local Data Ingestion",
            "message": "Field boundary registered. Regional Akola research reanalysis is not assigned to private farm parcels. Upload drone/satellite GeoTIFF or in-situ probe logs to populate module metrics.",
            "uploaded_imagery_count": field.get("data_availability", {}).get("uploaded_imagery", {}).get("count", 0),
            "uploaded_sensors_count": field.get("data_availability", {}).get("uploaded_sensors", {}).get("count", 0),
        }

    return report


def export_report_to_csv(report: Dict[str, Any]) -> str:
    """
    Flattens a compiled field report dictionary into clean tabular CSV format.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    # Header Row
    writer.writerow(["Section", "Parameter / Metric", "Value", "Unit", "Provenance", "Source", "Notes / Caveats"])

    # 1. Field Metadata
    f_name = report.get("field_name", "Unknown")
    f_id = report.get("field_id", "Unknown")
    f_type = report.get("field_type", "farm_boundary")
    writer.writerow(["Metadata", "Report ID", report.get("report_id"), "none", "system", "AgroViz Platform", ""])
    writer.writerow(["Metadata", "Field ID", f_id, "none", "system", "Field Registry", ""])
    writer.writerow(["Metadata", "Field Name", f_name, "none", "user_provided", "Field Registry", ""])
    writer.writerow(["Metadata", "Field Type", f_type, "none", "system", "Field Registry", ""])
    writer.writerow(["Metadata", "Crop Type", report.get("crop_type"), "none", "user_provided", "Field Configuration", ""])
    writer.writerow(["Metadata", "Surface Area (ha)", report.get("area_hectares"), "hectares", "calculated", "WGS84 Geodesic", "Spherical excess formula"])
    writer.writerow(["Metadata", "Surface Area (ac)", report.get("area_acres"), "acres", "calculated", "WGS84 Geodesic", "ha * 2.47105"])
    writer.writerow(["Metadata", "Sowing Date", report.get("sowing_date") or "Unassigned", "YYYY-MM-DD", "user_provided", "User Input", ""])
    writer.writerow(["Metadata", "Centroid Latitude", report.get("centroid", {}).get("latitude"), "degrees_north", "calculated", "Polygon Centroid", ""])
    writer.writerow(["Metadata", "Centroid Longitude", report.get("centroid", {}).get("longitude"), "degrees_east", "calculated", "Polygon Centroid", ""])
    writer.writerow(["Metadata", "Generated At", report.get("generated_at"), "ISO-8601", "system", "AgroViz Platform", ""])

    # 2. Module Summaries
    mod = report.get("module_summaries", {})
    if "weather" in mod:
        w = mod["weather"]
        writer.writerow(["Weather", "Mean Temperature", w.get("mean_temperature_c"), "°C", "model_estimated", w.get("source"), w.get("period")])
        writer.writerow(["Weather", "Highest Max Temp", w.get("max_temperature_c"), "°C", "model_estimated", w.get("source"), ""])
        writer.writerow(["Weather", "Total Precipitation", w.get("total_precipitation_mm"), "mm", "model_estimated", w.get("source"), ""])
        writer.writerow(["Weather", "Rainy Days Count", w.get("rainy_days"), "days", "model_estimated", w.get("source"), "Days > 0.1 mm"])

    if "crop_health" in mod:
        c = mod["crop_health"]
        writer.writerow(["Crop Health", "Mean NDVI", c.get("mean_ndvi"), "ratio (-1 to 1)", "calculated", c.get("source"), c.get("period")])
        writer.writerow(["Crop Health", "Mean NDRE", c.get("mean_ndre"), "ratio (-1 to 1)", "calculated", c.get("source"), "Chlorophyll sensitivity"])
        writer.writerow(["Crop Health", "Mean NDMI", c.get("mean_ndmi"), "ratio (-1 to 1)", "calculated", c.get("source"), "Canopy liquid water"])
        writer.writerow(["Crop Health", "Monsoon Cloud Gaps", "July 2023 & July 2024", "none", "calculated", c.get("source"), c.get("cloud_gap_notice")])

    if "soil_conditions" in mod:
        s = mod["soil_conditions"]
        writer.writerow(["Soil Conditions", "Texture Classification", s.get("texture_classification"), "none", "model_estimated", s.get("source"), "USDA triangle"])
        writer.writerow(["Soil Conditions", "Clay Fraction", s.get("clay_pct"), "%", "model_estimated", s.get("source"), ""])
        writer.writerow(["Soil Conditions", "Silt Fraction", s.get("silt_pct"), "%", "model_estimated", s.get("source"), ""])
        writer.writerow(["Soil Conditions", "Sand Fraction", s.get("sand_pct"), "%", "model_estimated", s.get("source"), ""])
        writer.writerow(["Soil Conditions", "Soil pH (H2O)", s.get("ph_h2o"), "pH", "model_estimated", s.get("source"), ""])

    if "pest_phenology" in mod:
        p = mod["pest_phenology"]
        writer.writerow(["Pest Phenology", "Degree-Days Set A", p.get("accumulated_degree_days_set_a"), "°C·day", "calculated", p.get("source"), "Base 13.4°C, Cutoff 35.5°C"])
        writer.writerow(["Pest Phenology", "Potential Gen Set A", p.get("potential_generations_set_a"), "generations", "calculated", p.get("source"), "503.62 DD/gen (Pathan et al.)"])
        writer.writerow(["Pest Phenology", "Degree-Days Set B", p.get("accumulated_degree_days_set_b"), "°C·day", "calculated", p.get("source"), "Base 13.9°C, Cutoff 32.8°C"])
        writer.writerow(["Pest Phenology", "Potential Gen Set B", p.get("potential_generations_set_b"), "generations", "calculated", p.get("source"), "492.00 DD/gen (Fand et al.)"])

    # 3. Active Alerts
    alerts = report.get("active_alerts", [])
    for a in alerts:
        writer.writerow([
            "Alerts",
            f"[{a.get('severity')}] {a.get('title')}",
            a.get("message"),
            "none",
            a.get("provenance"),
            a.get("source"),
            f"Category: {a.get('category')} | Status: {a.get('status')}",
        ])

    # 4. Citations & Legal Disclaimers
    for cit in report.get("citations", []):
        writer.writerow(["Citations", "Academic Citation", cit, "none", "published_literature", "Research Bibliography", ""])

    for disc in report.get("scientific_disclaimers", []):
        writer.writerow(["Disclaimers", "Scientific Integrity Notice", disc, "none", "policy", "AgroViz Platform", ""])

    return output.getvalue()
