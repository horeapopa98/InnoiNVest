# InnoINVest

Regional data source-of-truth for NW Romania. Built for the ADR Nord-Vest
"AI-Powered Regional Investment Intelligence" challenge.

ADR analysts type a commune, city, or county name → see all KPIs grouped by
the 15 brief categories → click-to-copy with citations, or export CSV / Word.

## Demo (one command)

```
docker compose up --build
```

Then open: <http://localhost:3000>

Try typing **Floresti** in the picker.

> Note: on first start, the `seed` container pulls live data from Eurostat
> (always works) and INS Tempo (occasionally returns HTTP 500 — known
> upstream issue; the runner is fault-tolerant and continues with whatever
> data is available).

## Components

- `src/innoinvest/api/` — FastAPI HTTP layer
- `src/innoinvest/ingest/` — Eurostat + INS Tempo clients + runner
- `src/innoinvest/export/` — CSV + Word writers
- `config/kpis.yaml` — declarative KPI catalog (add KPIs without code changes)
- `data/siruta_nw_romania.csv` — **demo seed** (16 rows: 6 counties + 9 cities/communes including Florești) with placeholder SIRUTA codes the test fixtures depend on
- `data/siruta_nw_romania_full.csv` — **canonical full seed** (452 rows: 6 counties + 43 cities + 403 communes) using real INS SIRUTA codes from data.gov.ro 2025. To use this in production: point `innoinvest seed` at it AND update the test fixtures that hard-code SIRUTA codes (e.g. `4324` → `57706` for Florești)
- `web/` — Next.js frontend

## Dev setup (without Docker for backend/frontend)

```
docker compose up -d db                # Postgres only
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
innoinvest seed                        # load SIRUTA
innoinvest ingest                      # pull data from Eurostat + INS Tempo
innoinvest serve --port 8000           # API
cd web && nvm use 22 && npm install && npm run dev   # frontend
```

Tests:

```
pytest                 # unit + DB tests (skips live by default)
pytest -m live         # opt-in: hits real Eurostat + INS Tempo
```

## Design & Plan

- `docs/superpowers/specs/2026-05-23-data-pipeline-design.md`
- `docs/superpowers/plans/2026-05-23-innoinvest-v1.md`
