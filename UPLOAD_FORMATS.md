# AgroViz — Data Ingestion & Upload Formats Specification

## 1. Overview of Supported Ingestion Modalities

AgroViz accepts external data streams to empower precision monitoring across user-created fields. Supported modalities include:
1. **Multispectral Geospatial Imagery** (Satellite scenes, drone orthomosaics).
2. **In-Situ Soil Sensor Logs** (Capacitive soil moisture, soil temperature probes).
3. **Local Weather Station Logs** (On-farm meteorological records).
4. **Pest Scouting & Trap Observations** (Pheromone trap catches, boll damage counts).

All uploads undergo strict programmatic validation before storage in `data/uploads/` and staging for analytical processing.

---

## 2. Multispectral Imagery Specifications

### 2.1 File Formats & Compression
- **Supported Formats**: Cloud-Optimized GeoTIFF (`.tif`, `.tiff`), Multi-band GeoTIFF, Drone Orthomosaic GeoTIFF.
- **Allowed Compression**: LZW, DEFLATE, PACKBITS, or uncompressed.
- **Color Depth**: 8-bit unsigned integer (`uint8`), 16-bit unsigned integer (`uint16`), or 32-bit floating point (`float32`).

### 2.2 Coordinate Reference System (CRS) & Metadata
- **Required CRS**: Valid projected or geographic coordinate reference system embedded in GeoTIFF metadata:
  - Geographic: `EPSG:4326` (WGS 84).
  - Web Mercator: `EPSG:3857`.
  - Projected UTM: UTM Zone 43N (`EPSG:32643` for Maharashtra/Akola) or corresponding local UTM zone.
- **Spatial Bounds**: Rasters must intersect the defined user field boundary polygon.
- **NoData Value**: Explicitly defined in raster tags (typically `0`, `-9999`, or `nan`).

### 2.3 Band Indexing & Spectral Ranges

For multi-band rasters, bands must either follow standard band ordering or specify metadata band names:

| Canonical Band | Center Wavelength | Typical Band Width | Sentinel-2 Equivalent | Drone Sensor Example |
|---|---|---|---|---|
| **Blue** | $\sim 490\text{ nm}$ | $65\text{ nm}$ | Band 2 | MicaSense Band 1 |
| **Green** | $\sim 560\text{ nm}$ | $35\text{ nm}$ | Band 3 | MicaSense Band 2 |
| **Red** | $\sim 665\text{ nm}$ | $30\text{ nm}$ | Band 4 | MicaSense Band 3 |
| **Red Edge** | $\sim 705\text{ nm}$ | $15\text{ nm}$ | Band 5 | MicaSense Band 5 |
| **NIR (Near-Infrared)** | $\sim 842\text{ nm}$ | $115\text{ nm}$ | Band 8 / 8A | MicaSense Band 4 |
| **SWIR (Short-Wave IR)** | $\sim 1610\text{ nm}$ | $90\text{ nm}$ | Band 11 | Hyperspectral / SWIR camera |

*Minimum Band Requirement*: Red and NIR are mandatory for NDVI calculation. Red Edge is required for NDRE. SWIR is required for NDMI.

---

## 3. In-Situ Soil Sensor CSV Schema

Used for ingesting capacitive FDR/TDR soil probe time series or soil lab analysis logs.

### 3.1 Column Specifications

| Column Name | Required | Data Type | Physical Range | Description & Unit |
|---|---|---|---|---|
| `date` | Yes | String (`YYYY-MM-DD`) | Calendar dates | Acquisition date |
| `sensor_id` | Yes | String | 1–32 characters | Unique identifier of probe |
| `depth_cm` | Yes | Float | $0.0\text{ to }200.0$ | Measurement depth below surface (cm) |
| `soil_moisture` | Yes | Float | $0.0\text{ to }1.0$ (or $0\text{--}100$) | Volumetric water content ($\text{m}^3/\text{m}^3$ or %) |
| `soil_temperature` | No | Float | $-10.0\text{ to }60.0$ | Soil temperature at depth (°C) |
| `electrical_conductivity`| No | Float | $0.0\text{ to }20.0$ | Bulk soil EC ($\text{dS}/\text{m}$) |

### 3.2 Sample Template (`soil_sensor_template.csv`)
```csv
date,sensor_id,depth_cm,soil_moisture,soil_temperature,electrical_conductivity
2024-07-01,SENSOR_PDKV_01,10.0,0.342,28.4,0.45
2024-07-01,SENSOR_PDKV_01,30.0,0.385,26.8,0.52
2024-07-01,SENSOR_PDKV_01,60.0,0.410,25.2,0.48
2024-07-02,SENSOR_PDKV_01,10.0,0.338,28.9,0.44
2024-07-02,SENSOR_PDKV_01,30.0,0.382,27.1,0.51
2024-07-02,SENSOR_PDKV_01,60.0,0.409,25.3,0.49
```

---

## 4. Local Weather Station CSV Schema

Used for ingesting on-farm micro-climate station data (e.g., Davis Vantage, Campbell Scientific).

### 4.1 Column Specifications

| Column Name | Required | Data Type | Physical Range | Description & Unit |
|---|---|---|---|---|
| `date` | Yes | String (`YYYY-MM-DD`) | Calendar dates | Observation date |
| `station_id` | Yes | String | 1–32 characters | Station identifier |
| `t_mean` | Yes | Float | $-20.0\text{ to }60.0$ | Daily mean temperature (°C) |
| `t_max` | Yes | Float | $-20.0\text{ to }60.0$ | Daily maximum temperature (°C) |
| `t_min` | Yes | Float | $-20.0\text{ to }60.0$ | Daily minimum temperature (°C) |
| `rh_mean` | Yes | Float | $0.0\text{ to }100.0$ | Daily mean relative humidity (%) |
| `rainfall_mm` | Yes | Float | $\ge 0.0$ | Daily total precipitation (mm) |
| `solar_radiation` | No | Float | $\ge 0.0$ | Solar insolation ($\text{MJ}/\text{m}^2/\text{day}$) |

### 4.2 Sample Template (`weather_station_template.csv`)
```csv
date,station_id,t_mean,t_max,t_min,rh_mean,rainfall_mm,solar_radiation
2024-07-01,STATION_AKOLA_FARM1,30.2,35.4,25.8,78.2,12.4,18.5
2024-07-02,STATION_AKOLA_FARM1,29.8,34.2,25.1,82.5,24.0,14.2
2024-07-03,STATION_AKOLA_FARM1,28.5,32.0,24.6,86.0,38.5,11.8
```

---

## 5. Field Scouting & Pest Observation CSV Schema

Standardized template for uploading field-verified pest observations (trap catches, boll damage counts).

### 5.1 Column Specifications

| Column Name | Required | Data Type | Allowed Values / Format | Description |
|---|---|---|---|---|
| `date` | Yes | String | `YYYY-MM-DD` | Date of scouting observation |
| `latitude` | Yes | Float | $-90.0\text{ to }90.0$ | WGS84 Latitude of trap/plot |
| `longitude` | Yes | Float | $-180.0\text{ to }180.0$ | WGS84 Longitude of trap/plot |
| `location_name` | Yes | String | Free text | Farm / plot name |
| `observation_type` | Yes | String | `trap_count`, `boll_damage_pct`, `larval_count` | Metric type |
| `value` | Yes | Float | $\ge 0.0$ | Numerical observation value |
| `unit` | Yes | String | `moths/trap/night`, `%`, `larvae/20_bolls` | Unit of measure |
| `crop_stage` | No | String | `squaring`, `flowering`, `boll_development` | Phenological stage |
| `source` | Yes | String | Free text | Observer / institution |
| `method` | Yes | String | Free text | Sampling methodology |

### 5.2 Sample Template (`pbw_scouting_template.csv`)
```csv
date,latitude,longitude,location_name,observation_type,value,unit,crop_stage,source,method
2024-08-15,20.7085,77.0045,Plot_7A,trap_count,8.0,moths/trap/night,flowering,FieldScout_PKV,Pheromone_Delta_Trap
2024-08-15,20.7085,77.0045,Plot_7A,boll_damage_pct,12.5,%,flowering,FieldScout_PKV,Destructive_Boll_Sample_20
2024-08-22,20.7085,77.0045,Plot_7A,trap_count,14.0,moths/trap/night,boll_development,FieldScout_PKV,Pheromone_Delta_Trap
2024-08-22,20.7085,77.0045,Plot_7A,boll_damage_pct,18.0,%,boll_development,FieldScout_PKV,Destructive_Boll_Sample_20
```

---

## 6. Programmatic Validation Rules & Error Codes

The FastAPI ingestion gateway returns structured error objects with HTTP 422 if an upload fails validation:

```json
{
  "provenance": "unavailable",
  "status": "error",
  "error_code": "ERR_SCHEMA_MISMATCH",
  "detail": "Missing mandatory columns: ['t_max', 't_min']",
  "received_headers": ["date", "station_id", "temp_c", "rain_mm"],
  "required_headers": ["date", "station_id", "t_mean", "t_max", "t_min", "rh_mean", "rainfall_mm"]
}
```

### Standard Validation Error Codes:
- `ERR_INVALID_FILE_TYPE`: File extension or MIME type not supported.
- `ERR_SCHEMA_MISMATCH`: Required headers missing or misspelled.
- `ERR_INVALID_DATE_FORMAT`: Dates cannot be parsed under ISO 8601 (`YYYY-MM-DD`).
- `ERR_OUT_OF_BOUNDS_VALUE`: Physical values exceed realistic bounds (e.g., $T_{\text{min}} > T_{\text{max}}$).
- `ERR_CRS_UNRESOLVED`: GeoTIFF lacks valid CRS or spatial transform.
- `ERR_EMPTY_FILE`: Uploaded file contains 0 bytes or empty rows.
