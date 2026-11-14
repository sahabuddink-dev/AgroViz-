import os
from typing import List
from ..config import DATA_RAW_DIR
from ..schemas import DatasetManifestItem, DataRegistrySummary

DATASET_MANIFEST_DEFINITIONS = [
    {
        "id": "weather_nasa_power",
        "canonical_filename": "POWER_Point_Daily_20230601_20241231_020d71N_077d00E_LST.csv",
        "role": "Core – weather",
        "role_category": "core",
        "provenance": "model_estimated",
        "source": "NASA POWER / MERRA-2 Reanalysis",
        "period": "2023-06-01 to 2024-12-31",
        "units": "°C (T2M, Tmax, Tmin), % (RH2M), mm/day (PRECTOTCORR)",
        "description": "Daily surface meteorology at 20.7069°N, 77.0022°E from MERRA-2 reanalysis (~0.5° × 0.625° grid).",
        "notes": [
            "Model/reanalysis-derived estimate, not a direct field weather station measurement.",
            "Covers 19 months (June 2023 to December 2024).",
            "No station climatology; year-on-year comparisons are limited to June–December."
        ],
    },
    {
        "id": "sentinel2_indices_gee",
        "canonical_filename": "AgroViz_Akola_Sentinel2_Indices.csv",
        "role": "Core – crop-condition indices (primary)",
        "role_category": "core",
        "provenance": "calculated",
        "source": "Copernicus Sentinel-2 / Google Earth Engine (Harmonized SR)",
        "period": "2023-06-05 to 2024-12-31",
        "units": "dimensionless ratio (-1 to +1)",
        "description": "Scene-level mean vegetation indices (NDVI, NDMI, NDRE) over 10 km radius AOI centered at 20.7069°N, 77.0022°E.",
        "notes": [
            "Represents aggregate 10 km AOI vegetation condition, not specific to cotton fields (no cropland mask applied).",
            "Monsoon gap: zero valid optical observations in July 2023 and July 2024 due to persistent cloud cover.",
            "Requires de-duplication of overlapping tiles and filtering of partial tiles (<5,000 pixels)."
        ],
    },
    {
        "id": "era5_soil_moisture_three_layer",
        "canonical_filename": "AgroViz_Akola_ERA5_Three_Layer_Soil_Moisture.csv",
        "role": "Core – soil moisture, 3 depths",
        "role_category": "core",
        "provenance": "model_estimated",
        "source": "ECMWF ERA5-Land",
        "period": "2023-06-01 to 2024-12-31",
        "units": "m³/m³ (presumed volumetric soil water)",
        "description": "Daily volumetric soil moisture across 3 layers: 0-7 cm (layer 1), 7-28 cm (layer 2), 28-100 cm (layer 3).",
        "notes": [
            "Gridded numerical model estimate (~11 km grid resolution), not a physical in-situ sensor measurement.",
            "Area average across 9 grid cells."
        ],
    },
    {
        "id": "soilgrids_properties",
        "canonical_filename": "AgroViz_Akola_SoilGrids_Properties.csv",
        "role": "Core – soil properties (static)",
        "role_category": "core",
        "provenance": "model_estimated",
        "source": "ISRIC SoilGrids 2.0",
        "period": "Static snapshot",
        "units": "% (clay, sand, silt), pH (presumed H2O), g/kg (SOC)",
        "description": "Static spatial soil physical and chemical properties at 6 depth intervals (0-5 to 100-200 cm).",
        "notes": [
            "Global machine-learning digital soil mapping product (250 m resolution), not an in-situ soil sample.",
            "Static snapshot with no temporal series."
        ],
    },
    {
        "id": "pbw_annexure_3_seasonal",
        "canonical_filename": "Annexure_3_Supplementary_data_Linking_phenology_to_loss_R1.xlsx",
        "role": "Context only – published PBW seasonal data",
        "role_category": "context",
        "provenance": "measured",
        "source": "Fand et al. (2025) Agricultural Systems / Mendeley Data",
        "period": "2015-16 to 2019-20 (annual seasons)",
        "units": "% (loculi damage, yield loss - inferred)",
        "description": "Published station-wise seasonal Pink Bollworm damage records (Bt vs non-Bt cotton) and loss regressions.",
        "notes": [
            "Published survey and regression context only; no temporal overlap with weather/satellite data (pre-dates June 2023).",
            "Regression and AI 2050 sheets contain author model projections, not direct observations.",
            "Akola 5-season mean Bt loculi damage is published as 21.602%."
        ],
    },
    {
        "id": "pbw_annexure_4_multilocation",
        "canonical_filename": "Annexure_4_Supplementary_data_Multilocation_loss_R1.xlsx",
        "role": "Context only – published PBW multilocation snapshot",
        "role_category": "context",
        "provenance": "measured",
        "source": "Fand et al. (2025) Agricultural Systems / Mendeley Data",
        "period": "Published survey snapshot (pre-2023)",
        "units": "% (yield loss PBW, yield loss boll rot)",
        "description": "Published multi-location survey of cotton yield loss due to Pink Bollworm and Boll Rot across 63 Indian locations.",
        "notes": [
            "Published regional context; no temporal overlap with 2023-2024 monitoring data.",
            "Contains exactly one Akola district location: Paras (PBW yield loss 4.428%, Boll Rot yield loss 10.689%)."
        ],
    },
    {
        "id": "sentinel2_indices_pc_validation",
        "canonical_filename": "Processed_AgroViz_Akola_Sentinel2_Indices.csv",
        "role": "Validation only – Planetary Computer run",
        "role_category": "validation",
        "provenance": "calculated",
        "source": "Microsoft Planetary Computer (Sentinel-2 L2A)",
        "period": "2023-06-05 to 2024-12-31",
        "units": "dimensionless ratio (-1 to +1)",
        "description": "Independent processing run of Sentinel-2 indices used solely for comparative validation.",
        "notes": [
            "Validation run only; not used for primary crop-health analytics due to uncorrected baseline offset bias."
        ],
    },
    {
        "id": "sentinel2_inventory",
        "canonical_filename": "akola_sentinel2_inventory.csv",
        "role": "Cross-check only – scene list",
        "role_category": "cross_check",
        "provenance": "measured",
        "source": "Copernicus Sentinel-2 Scene Catalog",
        "period": "2023-06-05 to 2024-12-31",
        "units": "none (metadata)",
        "description": "Inventory of available Sentinel-2 scenes covering the Akola AOI with scene IDs and cloud percentages.",
        "notes": [
            "Catalog metadata cross-check only."
        ],
    },
    {
        "id": "era5_soil_moisture_single_layer",
        "canonical_filename": "AgroViz_Akola_ERA5_Soil_Moisture.csv",
        "role": "Cross-check only – single layer validation",
        "role_category": "cross_check",
        "provenance": "model_estimated",
        "source": "ECMWF ERA5-Land",
        "period": "2023-06-01 to 2024-12-31",
        "units": "m³/m³ (presumed volumetric soil water)",
        "description": "Single-layer (0-7 cm) soil moisture dataset used for data integrity cross-checking.",
        "notes": [
            "Identical to layer 1 of the three-layer dataset (max diff 0.0); retained for cross-validation."
        ],
    },
]

def get_data_registry_summary() -> DataRegistrySummary:
    """Inspects data/raw directory and returns manifest items with existence and file size."""
    items: List[DatasetManifestItem] = []
    found_count = 0
    
    for definition in DATASET_MANIFEST_DEFINITIONS:
        file_path = DATA_RAW_DIR / definition["canonical_filename"]
        exists = file_path.is_file()
        size_bytes = file_path.stat().st_size if exists else None
        if exists:
            found_count += 1
            
        item = DatasetManifestItem(
            id=definition["id"],
            canonical_filename=definition["canonical_filename"],
            role=definition["role"],
            role_category=definition["role_category"],
            provenance=definition["provenance"],
            source=definition["source"],
            period=definition["period"],
            units=definition["units"],
            description=definition["description"],
            exists=exists,
            size_bytes=size_bytes,
            notes=definition["notes"],
        )
        items.append(item)
        
    return DataRegistrySummary(
        total_expected=len(DATASET_MANIFEST_DEFINITIONS),
        total_found=found_count,
        all_present=found_count == len(DATASET_MANIFEST_DEFINITIONS),
        datasets=items,
    )
