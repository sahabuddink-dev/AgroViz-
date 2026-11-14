# AgroViz — Project Context (tool-agnostic, v5)

Read this file completely before doing anything. It works for any AI assistant or developer (Claude chat, Claude Code, Antigravity, etc.).
If this file and a chat message disagree, ask before proceeding. After every phase, append to the "Decisions log" (section 13).

## 1. What this project is

**AgroViz – AI-Based Crop Health and Pest Risk Monitoring System.** An academic MCA research prototype (SIH 2025 problem statement SIH25099): a local web app for crop-condition, weather and soil monitoring in Akola district, Maharashtra, India, with a Pink Bollworm (PBW) module that provides (a) a **weather-driven, literature-parameterised development (degree-day) indicator**, (b) **published context data** on PBW damage, and (c) an **unavailable state for observed pest data and validated risk prediction**.

Theme: *AI-powered monitoring of crop health, soil condition, and pest risks using multispectral/hyperspectral imaging and sensor data.*

Satellite vegetation indices alone **cannot confirm** PBW infestation. Crop-condition analysis and pest analysis stay separate everywhere (UI, API, text).

## 2. Non-negotiable rules

1. **Never fabricate** data, measurements, predictions, accuracy scores or imagery. Never show demo data as research data.
2. Every value in the API and UI carries a **provenance tag**: `measured` | `calculated` | `model_estimated` | `unavailable`, plus `source`, `units`, `period` and `notes` (section 8). Published survey values = `measured` (add a note "published by the authors"); values the authors derived or modelled = `calculated` / `model_estimated`.
3. Do not join datasets unless dates AND locations support a defensible match. **The published PBW data (2015-16 to 2022-23, annual) does not overlap the weather/satellite/soil data (from June 2023)**, so no weather–pest, satellite–pest or soil–pest link may be computed or implied (section 5.9).
4. No ML model on a handful of unrelated observations. Use transparent descriptive analysis and state what extra data would be needed.
5. Unconfirmed definitions are shown as unconfirmed (section 6). Never "fix" them from memory.
6. No scientific parameter is hardcoded from memory. Degree-day parameters come only from the cited sets in section 5.10, are user-selectable, and always display their citation.
7. Missing data → a clear "data unavailable" state explaining what is required. Never silently interpolate, fill or hide gaps.
8. Satellite values describe the **whole 10 km area**, not cotton. Never call them "cotton health".
9. No "low/medium/high" infestation or risk labels anywhere. The degree-day output is a *thermal development indicator*, never a risk score.
10. Work in phases. After each phase: say what was done, list files changed, give exact run commands, run the tests, then **stop and wait for the user's confirmation**.
11. If a file does not match what this document says (row counts, dates, columns), report the mismatch instead of working around it.

## 3. Tech stack (add nothing without justification)

- Frontend: React + Vite + JavaScript + CSS + Axios; Plotly (react-plotly.js); Leaflet / React-Leaflet.
- Backend: Python 3.10, FastAPI, Uvicorn, Pandas, NumPy, openpyxl, pytest; scikit-learn only if genuinely justified (not expected to be needed).
- Storage: CSV/Excel files only. No database, Docker or Next.js.
- Target: macOS (Apple silicon), separate Python venv in `backend/`. Defaults: backend http://localhost:8000, frontend http://localhost:5173, CORS enabled for the frontend origin.

UI: minimal, clean, professional research look. Green / neutral / white palette, few icons, no gradients, no decorative filler, responsive, readable charts, interactive maps, a persistent footer: "Research prototype. Satellite, model and literature-based values are indicators, not confirmation of pest infestation."
A mock-up image exists but its data is **simulated** ("68/100", "Risk: High", "Zone C3"). Use it only as a layout idea (filters panel, map, charts, status cards). Do not copy its numbers, risk levels or red alert panel.

## 4. File manifest and roles

Files live in `data/raw/` under these **canonical names** (copies may carry random suffixes such as `_0131ac` or `_1`; these are exact duplicates — rename to the canonical name, never load twice). Raw files are never edited.

| Canonical file | Role | Provenance |
|---|---|---|
| `POWER_Point_Daily_20230601_20241231_020d71N_077d00E_LST.csv` | **Core** – weather | measured (reanalysis) |
| `AgroViz_Akola_Sentinel2_Indices.csv` | **Core** – crop-condition indices (primary) | calculated from satellite |
| `AgroViz_Akola_ERA5_Three_Layer_Soil_Moisture.csv` | **Core** – soil moisture, 3 depths | model_estimated |
| `AgroViz_Akola_SoilGrids_Properties.csv` | **Core** – soil properties (static) | model_estimated |
| `Annexure_3_Supplementary_data_Linking_phenology_to_loss_R1.xlsx` | **Context only** – published PBW seasonal data | published (partly derived/modelled) |
| `Annexure_4_Supplementary_data_Multilocation_loss_R1.xlsx` | **Context only** – published PBW multilocation snapshot | published |
| `Processed_AgroViz_Akola_Sentinel2_Indices.csv` | **Validation only** – Planetary Computer run | calculated (offset-biased) |
| `akola_sentinel2_inventory.csv` | **Cross-check only** – scene list | metadata |
| `AgroViz_Akola_ERA5_Soil_Moisture.csv` | **Cross-check only** – layer 1 only; identical to layer 1 of the three-layer file | model_estimated |

Ignore: duplicate copies, screenshots, the mock-up PNG. Source of the Annexures: supplementary data of Fand et al. (2025) (section 6); the authors' Mendeley raw dataset may contain more files (section 11).

## 5. Dataset specifications (inspected 2026-11-14)

### 5.1 NASA POWER weather
- 580 daily rows, 2023-06-01 → 2024-12-31; no gaps, duplicates or -999 values.
- First 13 lines are a header block (`skiprows=13`). Date = YEAR + DOY.
- Columns: T2M, T2M_MAX, T2M_MIN (°C), RH2M (%), PRECTOTCORR (mm/day). Point 20.7069°N, 77.0022°E.
- MERRA-2 reanalysis, ~0.5° × 0.625° cell — **not a station measurement**. Only 19 months: no climatology. Year-on-year comparison only for Jun–Dec.

### 5.2 Sentinel-2 indices (Google Earth Engine export) — PRIMARY satellite source
- 309 rows, 81 unique dates, 2023-06-05 → 2024-12-31. One row per **scene/tile** (tiles T43QFC, QFD, QGC, QGD; tile = last 6 characters of `scene_id`), not per date.
- Columns: `NDVI_mean/_count`, `NDMI_mean/_count`, `NDRE_mean/_count`, `cloud_percentage`, `date`, `scene_id`, `system:index`, `.geo` (empty; ignore).
- Extraction: AOI = **10 km buffer around 20.7069°N, 77.0022°E, no cropland mask**; collection `COPERNICUS/S2_SR_HARMONIZED`; scene cloud < 60%; 20 m scale; SCL mask removes classes 0, 1, 3, 8, 9, 10, 11.
- Formulas: NDVI = (B8−B4)/(B8+B4); NDMI = (B8A−B11)/(B8A+B11); NDRE = (B8A−B5)/(B8A+B5). Document these in the UI.
- **Cleaning rules (implement and unit-test):**
  a. 14 rows duplicate an existing date+tile. Check whether duplicates are identical; if not, keep the row with the larger `NDVI_count` and log it. Expected ≈ 295 rows after de-duplication — verify and report.
  b. Rows with `NDVI_count` < 5000 (3 found) are flagged `partial_tile` and excluded from daily means (kept visible in the data table).
  c. Tiles overlap (per-date pixel totals exceed what a 10 km circle can hold), so combine tiles per date with a **simple mean**, not a pixel-weighted sum. Label as "approximate AOI-level value".
- Known gap: **no valid optical observations in July of either year** (monsoon cloud). Show the gap explicitly; never interpolate.
- Sanity (cleaned monthly means): NDVI ≈ 0.15 in June 2023 (bare soil), ≈ 0.63 in Sep 2023, ≈ 0.60 in Aug 2024, ≈ 0.41–0.42 by December.

### 5.3 ERA5-Land soil moisture, three layers
- 580 daily rows, 2023-06-01 → 2024-12-31, no gaps/nulls; dates match the weather file exactly.
- Columns: `date`, `sm_layer1_mean/_count` (0–7 cm), `sm_layer2_mean/_count` (7–28 cm), `sm_layer3_mean/_count` (28–100 cm). `_count` = 9 grid cells (~11 km each) every day.
- Units: volumetric soil water, presumed m³/m³. Ranges: layer 1 0.244–0.503; layer 2 0.278–0.501; layer 3 0.285–0.516.
- `sm_layer1_mean` equals `soil_moisture_mean` in the single-layer file on all 580 days (max difference 0) — add as a test.
- Behaviour: dry season (Jan–May) ≈ 0.25–0.30; monsoon (Jul–Sep) ≈ 0.43–0.48; deeper layers respond more slowly (layer 3 still wet in October). Correlation layer1–layer2 ≈ 0.96, layer1–layer3 ≈ 0.71.
- **Gridded model estimate, not a field sensor.** Much coarser than the satellite data. Keep a separate, empty "field sensor" slot in the Soil page.

### 5.4 SoilGrids soil properties (static)
- One row (`system:index`=0), source `ISRIC_SoilGrids_2.0`, study area `Akola_10km`, 10 km radius, 250 m resolution, 4419 pixels per property (4404 for SOC). Centre 20.7069°N, 77.0022°E.
- Column pattern: `{property}_{depth}_{unit}_{mean|count}`. Properties: `clay_*_pct`, `sand_*_pct`, `silt_*_pct`, `ph_*`, `soc_*_gkg`. Depths: 0–5, 5–15, 15–30, 30–60, 60–100, 100–200 cm. Ignore `.geo`.
- Area means: clay ≈ 38–43%, sand ≈ 24–26%, silt ≈ 33–36% (sum ≈ 100%); pH ≈ 7.3–7.6; SOC ≈ 9.9 g/kg at 0–5 cm falling to ≈ 2.8 g/kg at 100–200 cm.
- Reshape to a long table (property, depth, mean, count). Show as a depth profile.
- **Modelled global product, one static snapshot, no time series; not a field measurement.** pH presumed water pH. A USDA texture class may be computed from the means and labelled `calculated` ("area-mean based; indicative only").

### 5.5 Planetary Computer run — validation only
- 63 rows (one scene per date), same period. Correlation with the Earth Engine series ≈ 0.99 for NDVI/NDMI/NDRE on 63 shared dates, but values are systematically lower (NDVI mean 0.240 vs 0.386).
- Likely cause (**unproven**): the 1000 DN processing-baseline offset was not subtracted in that script.
- 5 rows have < 50% valid coverage. Show in Datasets as "independent run, offset not corrected" with the comparison table. **Never use it for crop-health charts.**

### 5.6 Scene inventory
- 329 scenes, 74 dates, cloud cover up to 39%. List only, no index values. Cross-check only.

### 5.7 Pink Bollworm — Annexure 3 (context only)
- 7 sheets: `AICRP-Stationwise data`, `AI_Loculi`, `Ai_Yield loss` (regression outputs, n=15), `BT_Loculi damage_AI`, `graded losses for locations`, `Statewise yield losses`, `rough` (scratch).
- Mostly the authors' **derived/model outputs** (regressions, "AI 2050" projections, economic losses). Never present them as observations. Do not display the `rough` sheet.
- Akola, `AICRP-Stationwise data`: one value per season 2015-16 … 2019-20. NBt: 12.88, 6.74, 69.95, 20.3, 16.67. Bt: 1.5, 5.61, 41.42, 23.95, 35.53; their mean = 21.602 (header says "Upto 2020-21" but 2020-21 is blank). Extra Akola cells (3.555 labelled 2021-2023; 33.63 in a column headed 2021-22) are ambiguous — **verify in the workbook; if unclear, show as "unverified" or omit.**
- Akola, `BT_Loculi damage_AI`: lat 20.70, lon 77.04; "Observed loculi damage (%)" = 21.602; "Yield loss" = 5.061. Yield loss ≈ 0.234 × loculi damage for every location and a "graded losses" table maps one to the other → **calculated, not independently measured**.

### 5.8 Pink Bollworm — Annexure 4 (context only)
- One sheet, 63 locations, 9 states (Maharashtra 21). Columns: Country, Zone, State, District, Location, Latitude, Longitude, `Yield loss (%)_PBW`, `Yield loss (%)_BR`; two empty trailing columns; trailing spaces in some text values; 1 missing District. Strip whitespace on load.
- Akola district: one row, **Paras** (20.7167°N, 76.81503°E): PBW yield loss 4.428%, boll-rot yield loss 10.689%.
- Annexure 3 and 4 Akola figures come from different sources/methods. Show side by side with caveats; **never average them**; never equate boll-rot loss with PBW loss.

### 5.9 Critical limitation
Published pest data = annual seasons 2015-16 → 2022-23, no dates. Weather/satellite/soil start June 2023. **Zero temporal overlap.** The Annexure data is context, not validation data, and no pest-risk model can be validated with the current files.

### 5.10 PBW degree-day parameters (cited; verify against the original papers before the final report)
The module computes a **thermal development indicator** from daily Tmax/Tmin: how much heat the pest's life cycle could have accumulated — not whether pests are present.

| Set | Lower / upper threshold | Heat per generation | Source |
|---|---|---|---|
| **A (default, Indian cotton states)** | 13.4 °C / 35.5 °C | 503.62 DD | Scientific Reports 11:436 (2021), "Degree day-based model predicts pink bollworm phenology across geographical locations", DOI 10.1038/s41598-020-80184-6, which reports these values from the authors' earlier study (identify and cite that original study) |
| **B (alternative, California field study)** | 13.9 °C / 32.8 °C | 492 DD (single sine, horizontal cutoff) | Beasley & Adams (1996), J. Econ. Entomol. 89:881-890, DOI 10.1093/jee/89.4.881; also listed by UC IPM |

Method: **single sine with horizontal cutoff**. Accumulate from a **user-chosen start date** (e.g. sowing or first square; the UI may suggest one but must mark it as an assumption — the data does not say when Akola cotton was sown). Report accumulated DD, potential generations (accumulated DD ÷ DD per generation), monthly DD, and show sets A and B side by side. Provenance `model_estimated`. Mandatory notices: "Thermal development potential, not an observation of pests"; "Parameters are literature values from other regions and are not validated against Akola field data"; "NASA POWER is reanalysis, not a station".
Order-of-magnitude check (simple method, set A, 15 Jun–31 Dec): ≈ 2,350–2,390 DD in both 2023 and 2024, ≈ 4.7 potential generations. The implementation must use single sine and its own tests.

## 6. Label rules for definitions

Source of Annexures: Fand et al. (2025), "Field estimates of current and predicted cotton yield loss due to pink bollworm and boll rot in India", *Agricultural Systems* 224, 104246, DOI 10.1016/j.agsy.2024.104246. Authors' raw data: Fand, B. (2024), Mendeley Data V1, DOI 10.17632/2xp6xvct2x.1, CC BY 4.0 (page: https://data.mendeley.com/datasets/2xp6xvct2x/1; description lists raw damage data, PBW phenology at various temperatures, multilocation survey data). Cite both in the app's About/Data sources page and in the report.

| Term | Status | Display |
|---|---|---|
| BR | Confirmed: boll rot (paper abstract) | "Boll rot" |
| Loculi damage (%) | Confirmed % in `BT_Loculi damage_AI` header | "%" |
| Seasonal Akola loculi values | Unit inferred (five-season Bt mean equals the labelled 21.602) | "% (inferred)" |
| Annexure 3 "Yield loss" | Unit not labelled; Annexure 4 and state-wise sheet use (%) | "% (inferred)" |
| NBt | Not defined in the file (presumed non-Bt) | "NBt (presumed non-Bt, unconfirmed)" |
| Soil moisture | Presumed m³/m³ | "m³/m³ (presumed)" |
| SoilGrids pH | Presumed water pH | "pH (presumed H₂O)" |
| NDMI | Canopy-moisture index, **not** soil moisture | Always under Crop Health |
| Sentinel-2 values | AOI-level, no cropland mask | "AOI-level vegetation condition" |
| ERA5-Land / SoilGrids | Model estimates | "model estimate", never "measured" |

## 7. Modules and what each shows

- **A Overview** – title, study location, dataset coverage table, weather and soil summary, crop-monitoring status, pest-data status ("published context only; no dated observations"), data availability and limitations, Leaflet map (centre point 20.7069°N, 77.0022°E with the 10 km AOI; Annexure 3 Akola point; Paras point). Status cards show real values or "unavailable" — never a risk level.
- **B Weather** – daily T2M, Tmax/Tmin, RH2M, rainfall; date filter; monthly summaries; trends. Show source (MERRA-2 reanalysis) and period.
- **C Pink Bollworm** – three clearly separated parts:
  1. *Weather-driven development indicator* (section 5.10): start-date picker, parameter-set selector with citation, accumulated degree-day curve, potential generations, monthly DD, sets A/B compared, mandatory notices.
  2. *Published context data* (Annexures, section 5.7–5.8): Akola Bt vs NBt seasonal loculi damage 2015-16…2019-20; Akola/Paras vs other Maharashtra locations; map; source, season, units on every chart; derived values marked; boll rot and PBW kept separate; a notice that this data pre-dates and does not overlap the weather/satellite/soil period.
  3. *Observed pest data: unavailable* – "No dated pest observations are loaded." List what is required (`date, latitude, longitude, location_name, observation_type (trap_count | boll_damage_pct | other), value, unit, crop_stage, source, method`, covering a season that overlaps the weather/satellite period); downloadable CSV template; upload slot with schema validation. A valid upload shows its table and a plain time series — still **no validated risk score and no automatic linkage to weather/satellite**.
- **D Crop Health** – AOI-level NDVI/NDMI/NDRE time series (cleaned Earth Engine data), observation count, July gap highlighted, cloud/valid-pixel information, tile-overlap and no-cropland-mask notice. No satellite imagery is shown (none was exported).
- **E Soil** – (1) soil moisture, three depths, daily and monthly views, "ERA5-Land model estimate"; (2) SoilGrids depth profile (clay/sand/silt/pH/SOC) and area means, "static modelled estimate"; (3) empty "field sensor data" slot with upload instructions.
- **F AI Analysis** – descriptive only:
  - *Crop-condition screening*: year-on-year difference for dates present in both years (roughly Aug–Dec), labelled descriptive screening. No "stress" or "disease" labels.
  - *Weather and degree-days*: the section 5.10 computation (one shared implementation with module C).
  - *Validated PBW risk estimation*: **locked**, reason: "no dated pest observations overlapping the weather/satellite period". List the data required. Never relabel the degree-day indicator as a risk score.
- **G Dataset Management** – list datasets with source, coverage, role (section 4), provenance; preview rows/columns; data-quality report (rows, dates, nulls, duplicates, gaps, flags); upload CSV/Excel with validation. Uploads go to `data/uploads/`, are profiled, and **do not feed any module until mapped**. Include the Earth Engine vs Planetary Computer comparison. A "Data sources & citations" section lists every source in section 6.

## 8. API contract (every response)

```json
{ "provenance": "measured|calculated|model_estimated|unavailable",
  "source": "...", "units": "...", "period": "...", "notes": ["..."],
  "data": ... }
```

Suggested endpoints: `GET /api/health`, `/api/readiness` (per module: ready / partial / unavailable + what is missing), `/api/datasets`, `/api/datasets/{id}/preview`, `/api/datasets/{id}/profile`, `POST /api/datasets/upload`, `/api/weather?start=&end=`, `/api/weather/summary`, `/api/pbw/context` (Annexure data), `/api/pbw/status` (observed-data unavailable + requirements), `/api/pbw/template`, `POST /api/pbw/upload`, `/api/crop/indices`, `/api/soil/moisture`, `/api/soil/properties`, `/api/analysis/yoy`, `/api/analysis/degree-days?param_set=A|B&start=` (citation in `notes`), `/api/analysis/pbw-risk` (validated risk: always `unavailable`, with reasons).
Validate responses with Pydantic models; handle missing files gracefully (no 500s for a missing optional dataset).

## 9. Suggested structure

```
agroviz/
├── CLAUDE.md   WORKFLOW.md   README.md
├── backend/app/ (main.py, config.py, schemas.py, routers/, services/, readiness.py)
├── backend/tests/            requirements.txt
├── data/raw/   data/uploads/   data/registry.json
└── frontend/src/ (api/, components/, pages/, styles/)
```

## 10. Phases (stop and wait for confirmation after each)

1. Scaffold + health check + data registry (manifest and canonical-name check).
2. Data layer: loaders, cleaning, profiling, tests on the real files.
3. Frontend shell + Dataset Management.
4. Weather module.
5. Pink Bollworm module (context data, degree-day indicator, unavailable state + template/upload).
6. Soil module (moisture + SoilGrids).
7. Crop Health module.
8. Overview dashboard (with map).
9. AI Analysis (YoY screening; degree-days shared with module 5; locked risk).
10. Testing, README, polish, screenshots.

**Minimum tests (pytest):** weather 580 rows, dates 2023-06-01..2024-12-31, no gaps; Sentinel raw 309 rows → de-duplicated count reported → daily series date count reported; July 2023/2024 absent from the cleaned Sentinel daily series; ERA5 three-layer 580 rows, all counts 9, layer 1 == single-layer file; SoilGrids 5 properties × 6 depths; Annex 4 has 63 rows and exactly one Akola row (Paras, PBW 4.428, BR 10.689); Annex 3 Akola loculi 21.602; the PBW-risk endpoint returns `unavailable`; degree-day unit tests (mean temperature at or below the lower threshold gives 0; Tmax above the upper threshold is capped; Tmin>Tmax input is rejected; accumulation is monotonic; results differ between sets A and B); every degree-day response includes its citation and the "not an observation of pests" notice; the pest template CSV has the required columns; an invalid pest upload is rejected with a clear message; no endpoint returns data for a dataset that is not on disk.

## 11. Open items

- Check the authors' Mendeley ZIP for additional files (raw damage data; PBW phenology at various temperatures; any dated observations). If present, inspect before anything else — it may supply dated observations or support the degree-day parameters.
- Verify the section 5.10 parameters against the original papers and find the original Indian study behind set A; ask the supervisor which set is the default and what start date to use.
- Ambiguous Annexure 3 Akola cells (2021-22 / 2021-23).
- Dated PBW field observations (trap counts / boll damage with date and coordinates) — needed to validate the indicator and for any risk modelling. Possible sources: PDKV Akola, CICR Nagpur, state pest-surveillance advisories (availability unconfirmed).
- Cotton field mask or boundaries; field sensor data; optional hyperspectral (EnMAP/PRISMA coverage of Akola is limited). Sentinel-2 is the implemented source.
- Optionally re-run the Planetary Computer script with the 1000 DN offset handled (`s2:processing_baseline` ≥ 4.0).

## 12. Session protocol (for switching tools, accounts or after a limit)

At the start of every session: read this file, read the Decisions log, run `git log --oneline -10` and the test suite, then state which phase is current and what is unfinished. Before ending a session: commit, update the Decisions log with what was done and what is next. Never start a new phase without the user's confirmation.

## 13. Decisions log

- 2026-11-14: Plan approved. Datasets collected and inspected (section 5). Earth Engine file chosen as primary satellite source; Planetary Computer run kept as validation only. Three-layer ERA5 and SoilGrids files received.
- 2026-11-14: The problem statement requires pest-risk monitoring. Decision: pest component = cited degree-day development indicator + published Annexure context (restored after a brief removal; context only, no overlap with other data) + unavailable state for observed data and validated risk.
- 2026-11-14: v5 written. Phase 1 not started.
- 2026-11-14: Phase 1 completed. Recorded SHA-256 hashes of all 9 original datasets; structured data/raw/ and data/uploads/; normalized Annexure filenames to canonical format; initialized Git repository; set up Python 3.10 venv with approved dependencies; implemented FastAPI health and data registry endpoints with strict API contract; scaffolded React + Vite frontend with Axios; passed all Phase 1 pytest tests. NASA POWER classified as model_estimated (reanalysis).
- 2026-11-14: Phase 2 completed. Implemented loaders for all canonical datasets; applied Sentinel-2 tile de-duplication (309 -> 295 rows), partial tile flagging (<5,000 pixels), daily simple mean aggregation (80 valid dates, monsoon July gap confirmed); implemented SoilGrids wide-to-long reshaping (30 rows) and USDA texture classification (Clay); parsed Annexure 4 with whitespace stripping (63 locations, 21 in Maharashtra, Paras Akola row verified); parsed Annexure 3 stationwise damage (Akola 5-season mean 21.602%, rough sheet excluded); implemented Planetary Computer comparative validation; implemented dataset profiler and preview/profile API endpoints; saved cleaned artifacts to data/processed/; verified 100% SHA-256 immutability of raw datasets; all 13 automated tests passed.
- 2026-11-14: Phase 3 completed. Synchronized GitHub remote (https://github.com/sahabuddink-dev/AgroViz-.git) preserving Phase 1 & 2 history; implemented frontend research application shell with Sidebar navigation for all modules, live backend health monitoring header, and persistent research disclaimer footer; built complete interactive Dataset Management module with category filtering, search, dataset inspection modal (real record previews, quality checklists, null analysis, Planetary Computer validation callout), literature citations and upload staging slot; frontend production build verified; all 13 automated backend tests passing.
