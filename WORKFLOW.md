# AgroViz — End-to-End Workflow (setup → build → test → deliver)

Companion to `CLAUDE.md`. Follow the steps in order. Every command is for macOS Terminal.

---

## 0. What you are building (and the honest scope)

A local web app (React + FastAPI) that shows, from **real files only**:

| Module | Data | Status |
|---|---|---|
| Weather | NASA POWER, Jun 2023–Dec 2024 | Full |
| Crop health | Sentinel-2 NDVI/NDMI/NDRE (10 km area, no cropland mask) | Full, AOI-level |
| Soil | ERA5-Land moisture (3 depths) + SoilGrids properties | Full, model estimates |
| Pink Bollworm | Published Annexure context + cited degree-day indicator | Context + indicator |
| Observed pest data / validated risk | none available | Designed, locked, "data unavailable" |

Use this sentence in your report and viva: *"AgroViz provides a weather-driven Pink Bollworm development indicator parameterised from published literature, alongside published damage context; validated pest-risk prediction is designed but requires dated field observations, which were not available."*

---

## 1. Prerequisites (one time)

```bash
python3 --version     # you used 3.10 before; 3.10+ is fine
node -v               # need Node 18+ (20 LTS recommended)
git --version
```
If Node is missing: install from https://nodejs.org (LTS) or `brew install node`.
Tip: your prompt shows `(base)` (conda). Run `conda deactivate` before creating the project venv to avoid mixing environments.

## 2. Create the project folder

Use a **new** folder name. (Do not use `~/agroviz` — macOS treats it as the same as your existing `~/AgroViz`.)

```bash
mkdir -p ~/AgroViz_App/data/raw ~/AgroViz_App/data/uploads
cd ~/AgroViz_App
git init
```

Copy in the files (adjust the source paths to where they are on your Mac):

- `CLAUDE.md` and `WORKFLOW.md` (from this chat) → `~/AgroViz_App/`
- these nine data files → `~/AgroViz_App/data/raw/`, with the **canonical names** below. If your copies have suffixes like `_1` or `_0131ac`, rename them:

```
POWER_Point_Daily_20230601_20241231_020d71N_077d00E_LST.csv
AgroViz_Akola_Sentinel2_Indices.csv
AgroViz_Akola_ERA5_Three_Layer_Soil_Moisture.csv
AgroViz_Akola_SoilGrids_Properties.csv
AgroViz_Akola_ERA5_Soil_Moisture.csv
Processed_AgroViz_Akola_Sentinel2_Indices.csv
akola_sentinel2_inventory.csv
Annexure_3_Supplementary_data_Linking_phenology_to_loss_R1.xlsx
Annexure_4_Supplementary_data_Multilocation_loss_R1.xlsx
```

Example rename: `mv ~/Downloads/AgroViz_Akola_Sentinel2_Indices_0131ac.csv ~/AgroViz_App/data/raw/AgroViz_Akola_Sentinel2_Indices.csv`

Check: `ls ~/AgroViz_App/data/raw` shows exactly nine files.

```bash
cd ~/AgroViz_App
git add -A && git commit -m "Add project context and raw data"
```

(If you later get extra files from the authors' Mendeley ZIP, put them in `data/raw/` too and tell the assistant.)

## 3. Open your AI assistant in the project folder

- **Claude Code:** `cd ~/AgroViz_App && claude` (it reads `CLAUDE.md` automatically, but still ask it to read it explicitly in the first prompt).
- **Antigravity or any other tool:** open the folder `~/AgroViz_App` and paste the prompts below; the first prompt tells it to read `CLAUDE.md`.

## 4. The phase loop (repeat for all 10 phases)

1. Paste the phase prompt (section 5).
2. The assistant builds, runs tests, and reports: what was done, files changed, commands, test results.
3. **You verify** with the checklist for that phase (section 6). Run the app yourself.
4. If it passes: `git add -A && git commit -m "Phase N complete"`, then reply **"Phase N confirmed, continue to Phase N+1"**.
5. If it fails: paste the exact error text or a screenshot and say "fix this before moving on".

Never let it start the next phase before you confirm.

## 5. Prompts

### 5.1 First prompt (Phase 1)

```
Read CLAUDE.md in this folder completely before doing anything, then read
WORKFLOW.md. Follow them strictly.

The raw data files are in data/raw/ and must never be edited. Check section 4
of CLAUDE.md: confirm all nine canonical files exist, and verify each file's
shape against what CLAUDE.md section 5 says (row counts, date ranges,
columns). Report any mismatch instead of working around it.

Do Phase 1 only: scaffold the FastAPI backend (backend/, with its own .venv,
requirements.txt, app/main.py, a GET /api/health endpoint, a data registry that
reads data/raw and reports each file's role from section 4) and the React + Vite
frontend (frontend/, Axios configured to http://localhost:8000, one page that
calls /api/health). Add pytest with a health test.

When finished: tell me what you did, list files changed, give exact commands to
run on my Mac (backend and frontend), show test results, then stop and wait for
my confirmation. Never fabricate data or results. Ask if anything is unclear.
```

### 5.2 Template for every later phase

```
Phase N-1 is confirmed. Re-read CLAUDE.md (especially the rules in section 2
and the module description in section 7), then do Phase N only: <PHASE GOAL>.
Use only the real files in data/raw/. Add the tests listed in CLAUDE.md
section 10 that belong to this phase. When finished: tell me what you did,
list files changed, give exact run commands, show test results, update the
Decisions log in CLAUDE.md, then stop and wait for my confirmation.
```

Replace `<PHASE GOAL>` with:

| N | `<PHASE GOAL>` |
|---|---|
| 2 | Data layer: loaders, the Sentinel-2 cleaning rules (5.2), SoilGrids reshaping, Annexure loaders with whitespace stripping, profiling (rows, dates, nulls, duplicates, gaps), and the data-quality tests. |
| 3 | Frontend shell with navigation for all modules, plus Dataset Management (list, preview, profile, upload with validation, Earth Engine vs Planetary Computer comparison, data-sources & citations section). |
| 4 | Weather module: endpoints and page with date filters, temperature, humidity, rainfall charts, monthly summaries, provenance/source notes. |
| 5 | Pink Bollworm module: the three parts in section 7C (degree-day indicator with cited sets A/B and a start-date picker; published Annexure context with map; observed-data-unavailable state with CSV template and upload validation). |
| 6 | Soil module: three-depth ERA5 moisture views, SoilGrids depth profile, empty field-sensor slot, model-estimate labels. |
| 7 | Crop Health module: cleaned AOI-level NDVI/NDMI/NDRE series, July gap highlighted, observation counts, notices about AOI-level values and no cropland mask. |
| 8 | Overview dashboard: dataset coverage, summaries, status cards, Leaflet map with the study AOI and published locations, limitations panel. |
| 9 | AI Analysis page: year-on-year descriptive screening, shared degree-day view, locked validated-risk section with its reasons and data requirements. |
| 10 | Full test run, README with setup instructions, UI polish, responsive check, and a list of known limitations. |

### 5.3 Phase Status Tracker

- [x] **Phase 1**: Project setup, health check, raw data manifest, backend & frontend scaffold (Completed).
- [x] **Phase 2**: Data layer — loaders, cleaning rules, reshaping, profiling, immutability verification, automated tests (Completed).
- [ ] **Phase 3**: Frontend shell with navigation for all modules + Dataset Management.
- [ ] **Phase 4**: Weather module.
- [ ] **Phase 5**: Pink Bollworm module.
- [ ] **Phase 6**: Soil module.
- [ ] **Phase 7**: Crop Health module.
- [ ] **Phase 8**: Overview dashboard with interactive Leaflet map.
- [ ] **Phase 9**: AI Analysis page (YoY screening, shared degree-day, locked risk).
- [ ] **Phase 10**: Testing, README, polish, responsive check, final delivery.

## 6. Verify each phase yourself

Run these in two Terminal tabs.

**Backend**
```bash
cd ~/AgroViz_App/backend
source .venv/bin/activate          # first time: python3 -m venv .venv && pip install -r requirements.txt
pytest -q                          # all tests should pass
uvicorn app.main:app --reload --port 8000
```
Open http://localhost:8000/docs to try endpoints.

**Frontend**
```bash
cd ~/AgroViz_App/frontend
npm install                        # first time only
npm run dev
```
Open http://localhost:5173.

| Phase | What you should see |
|---|---|
| 1 | `/api/health` returns OK; frontend page shows it; registry lists nine files with roles. |
| 2 | Tests pass: 580 weather rows; Sentinel 309 → de-duplicated count; no July in the cleaned series; ERA5 layer 1 matches the single-layer file; Annex 4 has one Akola row (Paras). |
| 3 | Navigation works for all modules; datasets list; preview and quality report load; a test CSV upload is validated and does not change any chart. |
| 4 | Date filter changes the charts; values match the CSV (spot-check three dates). |
| 5 | Degree-days change when you change the start date or parameter set; citation visible; "not an observation of pests" notice visible; no risk score anywhere; unavailable state with template download. |
| 6 | Three depths plotted; SoilGrids profile shows clay ≈ 38–43%; labels say "model estimate". |
| 7 | NDVI rises to ≈ 0.6 around Aug–Oct and shows a gap in July; no imagery or fake zones. |
| 8 | Map shows the 10 km AOI and published points; cards show real values or "unavailable". |
| 9 | Risk section is locked with reasons; no low/medium/high labels. |
| 10 | Full test suite passes; README steps work on a clean start. |

**Spot-check rule:** pick 3 numbers on screen and confirm them against the raw CSV in a spreadsheet. If one differs, stop and report it.

## 7. If you run out of tokens or switch account/tool

1. Commit: `git add -A && git commit -m "WIP: <short note>"`.
2. Make sure the Decisions log in `CLAUDE.md` says what is done and what is next (ask the assistant to update it if not).
3. In the new session paste:

```
Resume AgroViz. Read CLAUDE.md and WORKFLOW.md completely. Read the Decisions
log, run git log --oneline -10 and the test suite, then tell me which phase is
current, what is finished and what is unfinished. Do not start anything new
until I confirm.
```

## 8. Common problems

| Problem | Fix |
|---|---|
| `command not found: node` | Install Node (section 1), reopen Terminal. |
| `ModuleNotFoundError` in backend | Activate `.venv` and run `pip install -r requirements.txt`. |
| Frontend cannot reach backend / CORS error | Backend must run on port 8000 with CORS allowing http://localhost:5173. |
| Port already in use | Stop the old process (Ctrl+C) or ask the assistant to change the port in both places. |
| Plotly charts do not render | Ask the assistant to use `plotly.js-dist-min` with `react-plotly.js` (common Vite fix). |
| Excel load fails | `pip install openpyxl` inside the venv. |
| Numbers look different from the Earth Engine summary you saw earlier | That summary averaged raw rows including duplicates; the app uses cleaned per-date values (CLAUDE.md 5.2). |
| Assistant tries to add a database, Docker or another framework | Say: "Follow CLAUDE.md section 3; no additions." |
| Assistant shows a risk level or invents a value | Stop it: "Violates CLAUDE.md rules 1 and 9. Remove it." |

## 9. Parallel tasks (while the build runs)

- Open https://data.mendeley.com/datasets/2xp6xvct2x/1, click **Download All**, and check whether the ZIP holds more than the two Annexure files; upload anything new.
- Ask your supervisor: default degree-day parameter set (A or B) and the cotton start date to use.
- Email PDKV Akola or CICR Nagpur for dated Pink Bollworm field observations (trap counts / boll damage, date, location). If you receive any, they go through the upload slot.
- Read the original papers behind the degree-day parameters (CLAUDE.md 5.10) and find the original Indian study behind set A.

## 10. Final delivery checklist

- [ ] App starts from a clean terminal using only the README steps.
- [ ] All tests pass; screenshots of every module saved.
- [ ] Every chart shows source, period, units and provenance.
- [ ] No fabricated values, no risk labels, no simulated imagery.
- [ ] Limitations page states: AOI-level satellite values; no July optical data; model-estimate soil data; reanalysis weather; published pest data does not overlap the monitoring period; degree-day parameters are not validated for Akola.
- [ ] Citations included: Fand et al. (2025) Agricultural Systems 224:104246; Fand (2024) Mendeley Data DOI 10.17632/2xp6xvct2x.1; Scientific Reports 11:436 (2021); Beasley & Adams (1996); NASA POWER; Copernicus Sentinel-2; ERA5-Land; ISRIC SoilGrids.
- [ ] Git history committed; `CLAUDE.md` Decisions log up to date.

## 11. Suggested demo order (viva)

1. Overview and map → study area and data coverage.
2. Dataset Management → show real files, quality report, the Earth Engine vs Planetary Computer comparison (explain the offset issue honestly).
3. Weather → soil (three depths + SoilGrids) → crop health (explain the July cloud gap).
4. Pink Bollworm → degree-day indicator, published context, and the "data unavailable" state with what is needed.
5. AI Analysis → year-on-year screening and the locked risk section; end with "future work": dated pest observations, cotton field mask, field sensors, hyperspectral data.
