# AgroViz — Datasets & Analytical Models Specification

## 1. Inventory of Canonical Research Datasets

AgroViz incorporates nine canonical datasets in `data/raw/` representing the Vidarbha agricultural region (Akola district, Maharashtra, India). All raw files are immutable and verified via cryptographic SHA-256 hashes.

| # | Dataset Filename | Spatial Scope & Resolution | Temporal Range & Frequency | Observations | Primary Role & Provenance |
|---|---|---|---|---|---|
| 1 | `POWER_Point_Daily_20230601_20241231_020d71N_077d00E_LST.csv` | Point: 20.7069°N, 77.0022°E (~0.5° × 0.625° cell) | 2023-06-01 to 2024-12-31 (Daily) | 580 rows | Core Surface Meteorology (`model_estimated` reanalysis) |
| 2 | `AgroViz_Akola_Sentinel2_Indices.csv` | 10 km AOI buffer around 20.7069°N, 77.0022°E (20 m pixel) | 2023-06-05 to 2024-12-31 (Irregular / ~5-day) | 309 raw scenes (81 unique dates) | Core Crop Canopy Indices (`calculated` from satellite) |
| 3 | `AgroViz_Akola_ERA5_Three_Layer_Soil_Moisture.csv` | 10 km AOI buffer (9 grid cells, ~11 km cell) | 2023-06-01 to 2024-12-31 (Daily) | 580 rows | Core Root-Zone Soil Moisture (`model_estimated` reanalysis) |
| 4 | `AgroViz_Akola_SoilGrids_Properties.csv` | 10 km AOI buffer (250 m resolution, 4419 pixels) | Static snapshot | 1 row (30 depth-property slices) | Core Physical Soil Properties (`model_estimated` global ML map) |
| 5 | `Annexure_3_Supplementary_data_Linking_phenology_to_loss_R1.xlsx` | Stationwise (Akola AICRP + national centers) | Annual seasons (2015-16 to 2019-20 / 2022-23) | 7 sheets | Published Historical Survey Context (`published_literature`) |
| 6 | `Annexure_4_Supplementary_data_Multilocation_loss_R1.xlsx` | 63 locations in India (21 in Maharashtra, Paras in Akola) | Multi-year survey aggregate | 63 rows | Published Entomological Benchmarks (`published_literature`) |
| 7 | `Processed_AgroViz_Akola_Sentinel2_Indices.csv` | 10 km AOI buffer (Planetary Computer) | 2023-06-05 to 2024-12-31 | 63 dates | Validation & Cross-Check (`calculated`, offset-biased) |
| 8 | `akola_sentinel2_inventory.csv` | S2 L2A tile scene metadata | 2023-06-05 to 2024-12-31 | 329 scenes | Satellite Acquisition Metadata (`metadata`) |
| 9 | `AgroViz_Akola_ERA5_Soil_Moisture.csv` | 10 km AOI buffer (Layer 1 only) | 2023-06-01 to 2024-12-31 (Daily) | 580 rows | Single-Layer Soil Moisture Cross-Check (`model_estimated`) |

---

## 2. Dataset Detailed Schemas & Inherent Limitations

### 2.1 NASA POWER Surface Weather
- **Variables**: `T2M` (daily mean temperature, °C), `T2M_MAX` (daily maximum temperature, °C), `T2M_MIN` (daily minimum temperature, °C), `RH2M` (relative humidity at 2 meters, %), `PRECTOTCORR` (corrected daily precipitation, mm/day).
- **Physical Characteristics**: 580 consecutive days without missing dates, nulls, or fill values.
- **Inherent Limitation**: Derived from MERRA-2 global atmospheric reanalysis assimilated with satellite radiances. It represents an average over a $\sim 50\text{ km} \times 60\text{ km}$ grid box, not an in-situ micrometeorological weather station on a specific farm.

### 2.2 Sentinel-2 Harmonized Indices (GEE Export)
- **Variables**: `NDVI_mean`, `NDVI_count`, `NDMI_mean`, `NDMI_count`, `NDRE_mean`, `NDRE_count`, `cloud_percentage`, `date`, `scene_id`.
- **Formulas**:
  - $\text{NDVI} = (B8 - B4) / (B8 + B4)$ (Canopy greenness & biomass)
  - $\text{NDRE} = (B8A - B5) / (B8A + B5)$ (Chlorophyll & nitrogen content)
  - $\text{NDMI} = (B8A - B11) / (B8A + B11)$ (Canopy liquid water content)
- **Cleaning & Consolidation**:
  - Raw 309 scene rows reduce to 295 rows after removing 14 tile-overlap duplicates (keeping higher valid pixel count).
  - 3 rows with `NDVI_count` $< 5000$ are flagged as partial tiles.
  - Multi-tile daily observations are merged into 80 distinct daily dates using simple unweighted means across valid overlapping tiles (excluding partial tiles with <5,000 valid pixels).
- **Inherent Limitations**:
  - **No Cropland Mask**: Metrics represent the entire 10 km circular AOI (bare soil, grasslands, diverse crops, roads, urban areas), not isolated cotton parcels.
  - **Monsoon Cloud Gap**: Zero valid optical observations exist in July 2023 and July 2024 due to persistent cloud cover. The platform strictly presents this gap without interpolation.

### 2.3 ERA5-Land Volumetric Soil Moisture (3 Layers)
- **Variables**: `sm_layer1_mean` ($0\text{--}7\text{ cm}$), `sm_layer2_mean` ($7\text{--}28\text{ cm}$), `sm_layer3_mean` ($28\text{--}100\text{ cm}$) in $\text{m}^3/\text{m}^3$.
- **Physical Characteristics**: 580 continuous daily records. Shows seasonal wetting during June–September monsoon ($0.45\text{--}0.51\text{ m}^3/\text{m}^3$) and drying through hot pre-monsoon ($0.24\text{--}0.28\text{ m}^3/\text{m}^3$).
- **Inherent Limitation**: Gridded land-surface model simulation driven by atmospheric forcing, not an in-situ capacitive FDR/TDR soil probe.

### 2.4 ISRIC SoilGrids 2.0 (Physical Properties)
- **Variables**: Clay %, Silt %, Sand %, pH in $\text{H}_2\text{O}$, and Soil Organic Carbon ($\text{g}/\text{kg}$) across 6 standardized depth intervals ($0\text{--}5, 5\text{--}15, 15\text{--}30, 30\text{--}60, 60\text{--}100, 100\text{--}200\text{ cm}$).
- **Reshaping**: Transformed from wide 30-column format into long 30-row profile.
- **Classification**: Unweighted pixel means across the 4,419 AOI pixels (Clay $38.4\%$, Silt $36.0\%$, Sand $25.6\%$) averaged across the 6 depth intervals classify under the USDA soil texture triangle as **Clay**.
- **Inherent Limitation**: Static digital soil mapping product generated via machine learning on global point databases; does not reflect real-time nutrient flux or seasonal fertilizer application.

### 2.5 Historical Entomological Survey Context (Annexures 3 & 4)
- **Annexure 3 (Stationwise AICRP Data)**: Records seasonal Bt and Non-Bt cotton locule damage (%) at Akola across 5 seasons (2015-16 to 2019-20). The Bt seasonal mean is verified at $21.602\%$ (Non-Bt mean: $46.850\%$).
- **Annexure 4 (Multilocation Survey)**: Records 63 research centers across 9 Indian states. Contains one Akola district entry (**Paras**, 20.7167°N, 76.8150°E) reporting $4.428\%$ Pink Bollworm yield loss and $10.689\%$ Boll Rot loss.
- **Critical Limitation**: **Zero temporal overlap with 2023–2024 monitoring**. Surveys ended before the environmental monitoring series began (June 2023). These datasets serve strictly as published regional research context.

---

## 3. Models That Can Currently Be Implemented (Operational)

The existing codebase implements four verified, deterministic mathematical and scientific models:

```
+---------------------------------------------------------------------------------------+
|                       OPERATIONAL SCIENTIFIC & MATHEMATICAL ENGINES                    |
+----------------------------------+----------------------------------------------------+
| Model Name                       | Formulation / Implementation                       |
+----------------------------------+----------------------------------------------------+
| 1. Single-Sine Degree-Day Engine | Single-sine algorithm with horizontal cutoff:      |
|    (Thermal Phenology Model)     |   Tmax <= L  => DD = 0                             |
|                                  |   Tmin >= U  => DD = U - L                         |
|                                  |   Intermediate cases integrate daily sine curve.   |
|                                  |   - Set A: L=13.4°C, U=35.5°C, 503.62 DD/gen       |
|                                  |   - Set B: L=13.9°C, U=32.8°C, 492.00 DD/gen       |
| 2. Biophysical Spectral Indices  | Standardized band arithmetic:                      |
|    (Canopy Condition Engine)     |   NDVI = (NIR - Red) / (NIR + Red)                 |
|                                  |   NDRE = (NIR - RedEdge) / (NIR + RedEdge)         |
|                                  |   NDMI = (NIR - SWIR) / (NIR + SWIR)               |
| 3. USDA Soil Texture Classifier  | Point-in-polygon matching on USDA ternary diagram: |
|    (Pedological Texture Engine)  |   Inputs: Clay %, Silt %, Sand %                   |
|                                  |   Output: Clay / Silty Clay / Clay Loam            |
| 4. Deterministic Alert Rules     | Threshold-based rules:                             |
|    (Agronomic Rules Engine)      |   - Cited phenological generation thresholds       |
|                                  |   - Optical satellite cloud gap duration checks    |
|                                  |   - Soil moisture deficit rules (provisional,      |
|                                  |     disabled until calibrated with retention data) |
+----------------------------------+----------------------------------------------------+
```

---

## 4. Models Requiring Additional Training Data (Future Scope)

To deploy advanced supervised machine learning models, specific labelled training datasets are required that are currently **not present** in the repository:

### Model 1: Field-Level Cotton Crop Type Semantic Segmentation
- **Goal**: High-resolution pixel-level binary classification (Cotton vs. Other crops vs. Non-cropland).
- **Target Architecture**: U-Net or SegNet on multi-temporal Sentinel-2 / Sentinel-1 imagery.
- **Required Training Data**:
  - Ground-truth digitized farm field boundary shapefiles ($N \ge 1{,}000$ verified polygon plots) across Akola district.
  - Multi-season crop identification survey tags (Cotton, Soybean, Pigeonpea, Fallow).
- **Current Status**: **Unavailable**. Current data is an unmasked 10 km circular AOI.

### Model 2: Validated Spatial Pink Bollworm Risk Prediction Model
- **Goal**: Multivariate predictive model forecasting localized boll damage percentage or trap catch peaks 7–14 days in advance.
- **Target Architecture**: Spatio-temporal LSTM, XGBoost, or Graph Neural Network.
- **Required Training Data**:
  - Daily or weekly geo-referenced pheromone trap catch logs ($N \ge 50$ distinct field traps over 2+ complete Kharif seasons).
  - Destructive boll sampling records (green boll locule damage counts) matching the exact dates and coordinates of weather and satellite acquisitions (2023–2024).
- **Current Status**: **Unavailable**. The `/api/analysis/pbw-risk` endpoint is strictly locked with `status: "unavailable"`.

### Model 3: Drone-Based Individual Plant Stress & Canopy Classification
- **Goal**: Sub-decimeter classification of crop vigor, weed infestation, and chlorosis zones.
- **Target Architecture**: Convolutional Neural Network (YOLOv8 / Mask R-CNN).
- **Required Training Data**:
  - High-resolution drone orthomosaics ($<5\text{ cm/pixel}$) with bounding-box annotations of weed patches, stunted plants, and chlorotic leaves.
- **Current Status**: **Awaiting User Uploads**. The ingestion interface accepts drone GeoTIFFs, but model inference requires uploaded annotated imagery.

---

## 5. Machine Learning Validation Strategy

When future labelled datasets are acquired to train supervised models, the following validation protocols must be followed:

1. **Spatial-Temporal Cross-Validation**:
   - Random $k$-fold cross-validation is **prohibited** on spatial-temporal data due to spatial autocorrelation.
   - Spatial Block Cross-Validation (holding out entire geographic clusters) and Temporal Holdout (training on Season $N-1$, testing on Season $N$) must be used.
2. **Evaluation Metrics**:
   - **Regression (Pest damage %, Soil moisture %)**: Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and Nash-Sutcliffe Efficiency (NSE).
   - **Classification (Crop type, Stress levels)**: Precision, Recall, F1-Score, and Intersection over Union (IoU), with explicit reporting on minority classes.
3. **Model Interpretability**:
   - Feature attributions (SHAP / Integrated Gradients) must be computed to ensure predictions align with agronomic principles (e.g., verifying that extreme degree-day accumulation drives pest emergence).
