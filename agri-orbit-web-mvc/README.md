# AGRI-ORBIT

Static site (no build step) organized with the MVC pattern.

```
index.html              Main view (HTML structure)
css/style.css           Unified stylesheet
js/utils.js             Shared utilities
js/models/              Model: data, state and logic
  data.js               Regions, crops, rainfall regimes, scenarios
  state.js              Global state (S)
  engine.js             Agronomic model, ranking and Monte Carlo
  calendar.js           Water balance and monthly calendar
  nasa.js               Live NASA POWER / GIBS, local snapshot (snap/)
  globe.js              Countries, layers and globe geometry
  aiContext.js          AGRI-AI: structured farm context (reads S/LIVE only)
  aiClient.js           AGRI-AI: conversation and backend communication (no keys)
js/views/               Views: render* functions that paint the DOM
  dashboard.js  map.js  analysis.js  calendar.js  compare.js  live.js  globe.js  chrome.js  agriAI.js
js/controllers/         Controllers: events and orchestration
  controls.js           Control panel
  globe.js              Globe interaction and search
  app.js                recompute(), renderAll() and startup
  agriAI.js             AGRI-AI: open/close, sending questions
server/                 AGRI-AI backend (Node ≥ 18, no dependencies)
snap/                   NASA data and images downloaded for offline use
                        (hero_santacruz_hls*.webp: cover image, NASA HLS S30 via GIBS, 10 Jul 2025;
                         countries-50m.json: world-atlas/Natural Earth country boundaries for the offline globe)
js/vendor/d3.min.js     Local D3 v7.9.0 (the globe works without a CDN or internet)
tests/
  model.test.js         Node harness for the model (water metrics, case, export)
  render.smoke.js       Case render with a minimal DOM (both languages and priorities)
  agri-ai.test.js       AGRI-AI frontend + frontend → backend → provider integration
  agri-ai.server.test.js AGRI-AI backend: validation, security, rate limit, errors
```

The case view is in `js/views/case.js`. Scripts are loaded in order (models → views → controllers) from `index.html`.

## Run

```bash
python3 -m http.server 8080    # in this folder
# open http://localhost:8080
```

No build. Offline it uses the `snap/power.json` snapshot (real NASA POWER data, Nov 2026) and the `snap/*.webp` images. Model tests: `node tests/model.test.js` and `node tests/render.smoke.js`. AGRI-AI tests: `node tests/agri-ai.test.js` and `node tests/agri-ai.server.test.js`.

## AGRI-AI · farming assistant

Floating **AGRI-AI** button (bottom right). AGRI-ORBIT provides the data and runs the agronomic calculations; AGRI-AI interprets, explains and helps decide. With each question the browser sends the backend only the relevant sections of the current state (region, soil, irrigation, scenario, priorities, NASA POWER climate with its provenance, last 90 days, IMERG, risks, calendar, rotations and the Chiquimula case), built by `buildAIContext()` without modifying the state. If the backend is not configured or there is no internet, the chat says so and the rest of the app keeps working (including the offline snapshot); it never shows simulated answers.

```bash
cd server
cp .env.example .env        # set OPENAI_API_KEY (and optionally OPENAI_MODEL / OPENAI_BASE_URL)
node index.js               # http://localhost:8787 serves the web + /api/agri-ai
```

- Local development: if you open the site with Live Server or `http.server` (e.g. `127.0.0.1:5501`), the chat automatically uses the backend at `http://<host>:8787/api/agri-ai`, and the backend accepts `localhost`/`127.0.0.1` origins when it runs locally. If the backend is down or has no API key, the chat says so.
- Endpoints: `GET /api/agri-ai/health`, `POST /api/agri-ai/chat` (`{messages, context, lang, questionLang}` → `{reply}`).
- Provider: any API compatible with OpenAI Chat Completions (OpenAI, Groq, OpenRouter, Together, Ollama…) via `OPENAI_BASE_URL` and `OPENAI_MODEL`.
- The key lives only in the server's environment variables; public JavaScript contains no keys. The system prompt is in `server/lib/prompt.js`.
- Security: message validation (only `user`/`assistant` roles, 1,200 characters per question), sanitized and capped context (16 KB), max body 64 KB, per-IP rate limit (`RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS`), provider timeout, CORS allow-list (`ALLOWED_ORIGINS`), no code execution.
- Static site on another domain (e.g. GitHub Pages): deploy `server/` (Render, Railway, Fly…) with `SERVE_STATIC=0`, `TRUST_PROXY=1` and `ALLOWED_ORIGINS=https://your-site`, and point the frontend to it with `<meta name="agri-ai-endpoint" content="https://your-backend/api/agri-ai">` in `index.html` (or `window.AGRI_AI_ENDPOINT`). With `python3 -m http.server` and no backend, the chat shows "unavailable".

## The case: Dry Corridor of Chiquimula, Guatemala

“Try the Chiquimula case” loads the prototype's reference farm (14.80, −89.54): rain-fed, loam soil, first-season + second-season maize rotation (editable). It compares it with two alternatives under the same moderate-warming scenario:

1. **Maize + grain legumes** (maize, bean, maize, cowpea): fixes N and diversifies income; gives up some cover and depends on the bean price.
2. **Maize + green manure + sorghum** (maize, jack bean, sorghum, cowpea): maximum soil health and stability; gives up one commercial income cycle.

Each alternative documents assumptions, benefit, trade-off and the data still to be validated. The “Save water / Protect the soil” toggle only changes the score weights: the order may hold, but you can see how the gap between options changes.

## Sources actually used

| Use | Source | Detail |
|---|---|---|
| Numeric climate | **NASA POWER** (Agroclimatology API) | T2M, T2M_MAX, T2M_MIN, PRECTOTCORR, GWETROOT, ALLSKY_SFC_SW_DWN, WS2M · monthly climatology + daily series · ~0.5° grid |
| Sowing-window rainfall | **GPM IMERG via NASA POWER Daily** | `IMERG_PRECTOT` (mm/day) · UTC · ~0.1° · window total vs. the same climatological window; fill −999 = missing, not zero |
| Map and globe layers | **NASA GIBS** (WMS) | VIIRS, MODIS NDVI, SMAP L4, GPM IMERG, SRTM/ASTER GDEM, GRACE-FO · **visualization only**, does not feed the engine |
| Regional context | **GRACE/GRACE-FO** | Regional anomaly of *total* water storage (monthly mascon); reference, not a plot value |
| Soil and slope | Farmer input | Suggested context: MAGA/ICTA (Dry Corridor soils) and INSIVUMEH (stations) — national references, not yet numerically integrated |
| Snapshot | `snap/power.json` + `snap/*.webp` | Local replica of POWER and GIBS for the offline demo |

Provenance of every figure in the interface: **API** (live query), **Snap.** (snapshot), **Ref.** (regional reference), **Input** (farmer), **Model** (0–100 relative index or simulation), **GIBS** (visualization).

## Corrected metrics

“Irrigation needed” was replaced by three figures: **estimated deficit** (mm/cycle, before irrigation), **irrigation applied** (limited by available irrigation: 0 mm when rain-fed) and **remaining deficit**. Economy, soil, water, stability and forage are **0–100 relative indices**, not yield forecasts. “Stability” comes from 1,000 Monte Carlo climate simulations (the same draws for every compared rotation).

## Description for the jury

AGRI-ORBIT helps a smallholder in Guatemala's Dry Corridor decide what to plant next. It combines NASA POWER agroclimatology (rainfall, temperature, root-zone moisture GWETROOT, radiation) and GPM IMERG daily rainfall over the sowing window with farmer-entered soil data to compare crop rotations under a shared climate-change scenario. Scores are transparent, provenance-tagged relative indices — not yield forecasts — and every figure states its product, variable, unit, period, resolution and provenance class. The app is bilingual (Spanish-first for farmers, full English for judges), works offline from a real NASA data snapshot, and keeps the globe and GIBS satellite layers as visualization only.

## Demo script (~30 s)

EN voice-over (subtitles if recorded in Spanish):

1. (0–5 s) "A maize farmer in Chiquimula faces hotter, drier years. One click: *Try the Chiquimula case*." — click the hero CTA.
2. (5–15 s) "His maize–maize rotation vs. two alternatives, same scenario: estimated water deficit, bare-soil months, simulated stability — every figure shows its NASA source." — point at the comparison table and provenance chips.
3. (15–25 s) "Change his priority: *Save water* → *Protect the soil*. The order holds, but the scores move — the model only re-weights the same evidence." — toggle and show the score line.
4. (25–30 s) "Offline? The same figures come from a real NASA POWER snapshot. AGRI-ORBIT: decide what to plant next, with NASA's eyes on the field."

## Use of AI

The case view code, the metric corrections, the IMERG integration, the tests and this documentation were written with AI assistance (Devin, Cognition) and reviewed by the team. The figures shown come from the repository's model and the cited NASA APIs; the AI did not generate climate data. The AGRI-AI assistant (at runtime) only interprets the context the app sends it; it does not compute scores or replace the agronomic engine.

## Open limitations

- Relative model indices calibrated with regional references; they are not predicted yields and have not been validated in the field.
- IMERG in POWER arrives with a ~2–3 month lag: the sowing window shown is the most recent closed one.
- MAGA/ICTA and INSIVUMEH appear as national context; numeric comparison against stations is still pending.
- The POWER grid (~50 km) smooths microclimates; the water deficit is a simplified per-cycle estimate.
- The plot map is illustrative (not a real property).
