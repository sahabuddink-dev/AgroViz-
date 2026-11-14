# AgroViz — Precision Agriculture Development Workflow

This document defines the operating rules, verification checklists, and phase-by-phase execution protocol for developing AgroViz into an **AI-Powered Precision Agriculture Platform**.

---

## 1. Operating Rules for Development

1. **One Phase at a Time**: Work strictly on the designated phase. Do not begin subsequent phases until the current phase is fully tested, committed, pushed, and approved by the user.
2. **Preserve Research Assets**: Never delete, rename, or modify canonical raw files in `data/raw/`. Preserve existing data loaders, cleaning routines, profilers, and calculation engines.
3. **No Fabrication**: Never invent fake demonstration scores, synthetic risk zones, or ungrounded machine-learning predictions. If a required dataset is unavailable, present an explicit `status: "unavailable"` state detailing what is required.
4. **Enforce Provenance**: Every metric in APIs and UI must carry an explicit provenance tag (`measured`, `calculated`, `model_estimated`, `published_literature`, `user_provided`, `unavailable`).
5. **Dual Workflow Support**: Ensure all features integrate cleanly into both operational workflows:
   - **Workflow A**: Preloaded Akola Cotton Research Demonstration.
   - **Workflow B**: User-Created Field Workflow with uploaded imagery and sensor observations.
6. **Continuous Verification**: After every code change, execute the automated backend test suite (`pytest`) and verify the frontend build (`npm run build`).

---

## 2. 10-Phase Implementation Roadmap & Status Tracker

- [x] **Phase 1**: Project Scaffold, Health Endpoint, Canonical Data Registry & Hash Verification *(Completed)*.
- [x] **Phase 2**: Data Layer: Loaders, Cleaning Rules, Profiler, Immutability Tests *(Completed)*.
- [x] **Phase 3**: Frontend Application Shell, API Client, Dataset Registry & Profiling UI *(Completed)*.
- [x] **Phase 4**: Weather Monitoring Module (Daily series, monthly summaries, SVG charts) *(Completed)*.
- [x] **Phase 5**: Pink Bollworm Module (Degree-day calculator, historical context, CSV template/upload) *(Completed)*.
- [ ] **Phase 6**: Soil Conditions Module (ERA5 3-layer moisture, SoilGrids profile, in-situ sensor upload slot).
- [ ] **Phase 7**: Crop Health & Multispectral Raster Engine (Sentinel-2 index series, GeoTIFF validation, band math).
- [ ] **Phase 8**: Spatial Field Management & 3-Column Interactive GIS Workspace (Leaflet map, field creation, layer overlays).
- [ ] **Phase 9**: AI Analysis, Evidence-Based Alert Engine & Field Health Reporting (Agronomic rules, YoY screening, locked risk, report export).
- [ ] **Phase 10**: Comprehensive Verification, Full Test Suite, UI Polish & Final Delivery.

---

## 3. Step-by-Step Prompt Templates

### 3.1 Prompt for Phase N
```text
Phase N-1 is confirmed and pushed to GitHub. Re-read CLAUDE.md, WORKFLOW.md, and IMPLEMENTATION_PLAN.md completely.

Implement Phase N only: <PHASE GOAL>.

Requirements:
1. Follow the exact scope documented in IMPLEMENTATION_PLAN.md.
2. Reuse existing backend services, routers, schemas, and frontend components.
3. Enforce strict data provenance and scientific rules from CLAUDE.md.
4. Add unit and integration tests covering the new functionality.
5. Verify 100% SHA-256 immutability of raw datasets in data/raw/.
6. Run the full pytest suite and verify the frontend production build.
7. Update the Decisions Log in CLAUDE.md and the Phase Status Tracker in WORKFLOW.md.
8. Commit and push cleanly to origin/main.

Stop after Phase N and wait for my review and confirmation.
```

---

## 4. Verification Checklists for Each Phase

### Phase 6 (Soil Conditions Module) Checklist
- [ ] `GET /api/soil/moisture` returns 580 daily records across 3 depths with correlation metrics.
- [ ] `GET /api/soil/properties` returns SoilGrids 30-row profile with clay/sand/silt/pH/SOC values and USDA texture classification.
- [ ] `POST /api/soil/sensor-upload` validates schema against `soil_sensor_template.csv` and stores in `data/uploads/`.
- [ ] Frontend displays 3-depth moisture chart with soil moisture deficit threshold lines.
- [ ] Vertical depth profile chart renders physical property distributions.
- [ ] In-situ field sensor upload slot provides sample template download and validation feedback.
- [ ] Tests verify data loading, depth ranges, and CSV upload validation.

### Phase 7 (Crop Health & Multispectral Engine) Checklist
- [ ] `GET /api/crop/indices` serves cleaned daily Sentinel-2 NDVI, NDRE, NDMI series.
- [ ] July 2023 and July 2024 monsoon cloud gaps are explicitly marked in time-series charts (never interpolated).
- [ ] `POST /api/imagery/upload` validates GeoTIFF CRS, spatial dimensions, and band tags.
- [ ] Multispectral raster processing calculates zonal index statistics without errors.
- [ ] UI provides clear disclosures that Sentinel-2 indices represent the entire 10 km AOI, not an isolated cotton parcel.

### Phase 8 (Spatial Field Management & 3-Column GIS Workspace) Checklist
- [ ] Top navigation seamlessly switches between `Dashboard`, `My Fields`, `Alerts`, and `Reports`.
- [ ] 3-column workspace is functional: Left (field config & uploads), Center (Leaflet GIS map & charts), Right (condition cards & alerts).
- [ ] Field switcher allows toggling between Built-in Akola Research Field and User-Created Fields.
- [ ] Leaflet map renders field boundaries, satellite base layer, raster overlays, and observation markers.

### Phase 9 (AI Analysis & Evidence-Based Alert Engine) Checklist
- [ ] Deterministic agronomic rules evaluate topsoil moisture deficits, thermal milestones, and cloud gaps.
- [ ] Alerts feed categorizes notices by severity (`Info`, `Warning`, `Critical`) with actionable rationale.
- [ ] `/api/analysis/pbw-risk` remains strictly locked with `status: "unavailable"` and explicit data requirements.
- [ ] Field health summary report exports to structured JSON/CSV.

### Phase 10 (Final Verification & Delivery) Checklist
- [ ] All automated backend tests pass ($>40$ tests).
- [ ] Frontend builds cleanly with zero errors or warnings.
- [ ] All 9 canonical raw datasets in `data/raw/` match baseline SHA-256 hashes.
- [ ] Working tree is clean and synchronized with `origin/main`.
- [ ] Documentation (`CLAUDE.md`, `README.md`, `WORKFLOW.md`, `PROJECT_VISION.md`, `SYSTEM_ARCHITECTURE.md`, `DATASETS_AND_MODELS.md`, `UPLOAD_FORMATS.md`, `IMPLEMENTATION_PLAN.md`) is completely consistent.

---

## 5. Standard Run & Startup Commands

### Terminal 1: Backend
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

### Test Suite Execution
```bash
backend/.venv/bin/pytest backend/tests/ -v
```

### Production Build Execution
```bash
npm --prefix frontend run build
```
