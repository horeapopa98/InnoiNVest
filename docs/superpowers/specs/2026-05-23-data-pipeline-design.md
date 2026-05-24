# InnoINVest — Regional Data Source-of-Truth: Design Spec

**Status:** Draft for review
**Date:** 2026-05-23
**Context:** Hackathon entry for ADR Nord-Vest "AI-Powered Regional Investment Intelligence" challenge.
**Reference document:** Florești investor brief (`Copy of INNO, Florești, 01 AUGUST (1).pdf`, 29 pages) — reverse-engineered into 15 data categories in `docs/data-categories.md`.

---

## 1. Problem Statement

ADR Nord-Vest analysts produce polished investor briefs for any commune, city, or county in North-West Romania an investor asks about (Florești, Huedin, Beiuș, Cluj-Napoca, etc.). Today, each brief requires the analyst to:

1. Open 10–20 different public data portals (INS Tempo, Eurostat, ANCPI, ANRE, ANOFM, ONRC, Numbeo, ministry sites, university sites, …).
2. Search each portal for a value pinned to a specific commune and year.
3. Copy-paste numbers into Word, manually note the source for each one, and reformat.
4. Repeat from scratch for every new location.

The cost is hours per brief, and the brittleness of "copy a number, forget where it came from" weakens the citations investors actually evaluate.

## 2. Goal

Build an internal tool that **collapses the data-collection step from hours to minutes** by giving ADR analysts a single, queryable source of truth covering every commune and county in NW Romania, with provenance preserved on every number.

The tool is **upstream** of the polished investor brief — it does not replace the brief, it feeds it.

### How this fits the challenge framing

The challenge title is "AI-Powered Regional Investment Intelligence." This v1 deliberately leads with **automation** (one-click data collection + provenance) rather than LLMs, because the deepest pain ADR identified is data collection — not generation. The architecture is, however, **AI-ready**: the structured Postgres source of truth is exactly the substrate an LLM layer needs to be useful (a chat copilot, narrative auto-drafting, or KPI search by natural language all become straightforward additions in v2 — see section 10).

### inno.ro integration path

The challenge brief states tools will be integrated on the inno.ro platform. This design supports integration in two ways without additional work: (1) the FastAPI backend exposes an OpenAPI-documented REST endpoint per location and per KPI, which inno.ro can consume directly; (2) the Postgres schema is portable — inno.ro can replicate the data or share a read-only connection. No coupling to our UI is required for integration.

```
Investor asks ADR about a location
        │
        ▼
Analyst opens InnoINVest, picks the location
        │
        ▼
Tool displays all relevant KPIs grouped by the 15 brief categories,
each with click-to-copy + source citation + freshness indicator
        │
        ▼
Analyst copy-pastes / exports numbers into their polished Word brief
        │
        ▼
Investor receives the polished brief (as today)
```

## 3. Users & Primary Scenario

- **Primary user:** ADR Nord-Vest analyst building an investor brief.
- **Skill profile:** non-developer; comfortable with Word, Excel, and existing data portals.
- **Scenario:** Analyst is asked to assess Huedin as a candidate location for an investor. Today this takes ~3 hours of portal-hunting. With InnoINVest: types "Huedin" → reviews the 15-category data report → clicks "Export to Word" → spends the remaining time on narrative and judgement, not data hunting.

## 4. Goals & Non-Goals

### In scope (v1)

- Pre-ingested Postgres "source of truth" covering all ~400 communes + 6 counties of NW Romania (Bihor, Bistrița-Năsăud, Cluj, Maramureș, Satu Mare, Sălaj).
- Two source clients: **Eurostat** (REST + JSON-stat) and **INS Tempo Online** (REST + XML).
- ~40 KPIs mapped to the 15 brief categories from the Florești reference brief.
- Web UI with: location picker (autocomplete), 15-category report view, flat-table tab, click-to-copy on every number, Word & CSV export, freshness indicator.
- Provenance per number: source code, dataset ID, source URL, fetch timestamp.
- Nightly ingestion + manual "refresh now" button.

### Explicitly out of scope (v1)

- Auth / user accounts (internal tool on ADR's network)
- Real-time updates or collaborative editing
- Charts beyond simple sparklines (charts go in the analyst's *output*, not ours)
- Mobile design (desktop-only)
- LLM narrative generation (analyst still writes prose)
- Comparison across 3+ locations (stretch goal only)
- Maps / OSM integration (deferred to v2)
- Cross-EU comparison UI (data exists via Eurostat but not surfaced in UI v1)
- ANRE / Numbeo / ANCPI / Copernicus / listafirme.ro integration (v2)

## 5. Architecture

```
                  ┌──────────────────────────────────┐
                  │  Web UI (Next.js + Tailwind)     │
                  │  Picker → 15-category report     │
                  │  → click-to-copy / Export Word   │
                  └────────────┬─────────────────────┘
                               │ GET /report/{siruta_code}
                               ▼
                  ┌──────────────────────────────────┐
                  │  Backend API (FastAPI)           │
                  │  Read-only HTTP layer            │
                  └────────────┬─────────────────────┘
                               ▼
                  ┌──────────────────────────────────┐
                  │  Postgres 16                     │
                  │  location · kpi · kpi_value      │
                  │  · source · run_log              │
                  │  ~80,000 rows for NW Romania     │
                  └────────────┬─────────────────────┘
                               ▲ writes (upsert)
                               │
                  ┌────────────┴─────────────────────┐
                  │  Nightly ingestion workers       │
                  │  (Python + apscheduler /         │
                  │   GitHub Actions cron)           │
                  └─┬──────────────────────────────┬─┘
                    ▼                              ▼
        ┌──────────────────┐           ┌──────────────────┐
        │ Eurostat client  │           │ INS Tempo client │
        │ (JSON-stat REST) │           │ (REST + XML)     │
        └──────────────────┘           └──────────────────┘
```

**Key architectural decision: data is pre-ingested into Postgres, not fetched live per request.**
Reasons: (1) commune-level data does not change minute-by-minute — daily refresh is plenty; (2) live fetch would be slow and brittle if either API is degraded; (3) the DB *is* the source of truth deliverable — even without a UI, ADR could query it directly.

## 6. Data Model

```sql
-- Geographic hierarchy
location (
    siruta_code        TEXT PRIMARY KEY,   -- official Romanian territorial code
    name               TEXT NOT NULL,
    name_normalized    TEXT,                -- for accent-insensitive search
    type               TEXT NOT NULL,       -- 'commune' | 'city' | 'county' | 'region'
    parent_siruta      TEXT REFERENCES location(siruta_code),
    nuts_code          TEXT,                -- e.g., 'RO113' for Eurostat joins
    lat                NUMERIC,
    lon                NUMERIC,
    population_latest  INTEGER              -- cached for the picker
)

-- KPI catalog
kpi (
    kpi_code           TEXT PRIMARY KEY,   -- e.g., 'pop_total'
    name_en            TEXT NOT NULL,
    name_ro            TEXT NOT NULL,
    unit               TEXT NOT NULL,       -- '€', '%', 'persons', '€/m²'
    category           TEXT NOT NULL,       -- one of the 15 brief categories
    aggregation_level  TEXT NOT NULL,       -- 'commune' | 'county' | 'country'
    description        TEXT
)

-- Source registry
source (
    source_code        TEXT PRIMARY KEY,   -- 'eurostat', 'ins_tempo'
    name               TEXT,
    homepage_url       TEXT,
    license            TEXT,
    last_full_refresh  TIMESTAMPTZ
)

-- The actual numbers
kpi_value (
    id                 BIGSERIAL PRIMARY KEY,
    siruta_code        TEXT REFERENCES location(siruta_code),
    kpi_code           TEXT REFERENCES kpi(kpi_code),
    period             TEXT NOT NULL,       -- '2024', '2024-Q3', '2024-08'
    value              NUMERIC,             -- nullable when explicitly unavailable
    source_code        TEXT REFERENCES source(source_code),
    source_dataset_id  TEXT,                -- e.g., Eurostat 'nama_10r_3gdp'
    source_url         TEXT,                -- citable direct link
    fetched_at         TIMESTAMPTZ NOT NULL,
    raw_payload        JSONB,               -- original API cell for debugging
    UNIQUE (siruta_code, kpi_code, period)
)

-- Ingestion observability
run_log (
    id                 BIGSERIAL PRIMARY KEY,
    started_at         TIMESTAMPTZ NOT NULL,
    finished_at        TIMESTAMPTZ,
    source_code        TEXT,
    kpis_fetched       INTEGER,
    kpis_failed        INTEGER,
    error_summary      JSONB
)
```

### Why these choices

- **SIRUTA as primary key** — Romania's official territorial code; INS Tempo already keys on it, so joins are free.
- **Long format `(location × kpi × period)`** — easier to query and chart than wide; no NULL columns; trivially extensible.
- **Provenance is first-class** — every value carries `source_code`, `source_dataset_id`, `source_url`, `fetched_at`. The analyst always cites correctly; investors can verify in one click.
- **KPI catalog decoupled from sources** — if a KPI moves between Eurostat and INS Tempo, only the `source_code` per row changes; consuming code is unaffected.
- **`raw_payload` JSONB** — original API response retained for debugging, audit, and future reprocessing.

## 7. Ingestion Pipeline

### Source clients

Both clients implement a tiny abstract base so v2 sources (OSM, Numbeo, ANRE) drop in without touching existing code:

```python
class BaseClient(ABC):
    name: str

    @abstractmethod
    def fetch(
        self,
        kpi: KpiConfig,
        locations: list[Location],
    ) -> list[ValueRow]:
        ...
```

| | **Eurostat** | **INS Tempo Online** |
|---|---|---|
| Format | JSON-stat | XML |
| Auth | None | None |
| Geo granularity | NUTS3 (county) | LAU2 (commune) |
| Python library | `pyjstat` + `requests` (or `eurostat` PyPI) | `requests` + `lxml` |
| Query shape | dataset code + filter dims | matrix code + dimension codes (incl. SIRUTA) |
| Quirks | Stable, generous rate limits | Some matrices time out — needs retry; some endpoints return whole hierarchies |

### Declarative KPI mappings

The 40 KPIs live in `config/kpis.yaml`, decoupled from code:

```yaml
- kpi_code: pop_total
  category: Demographics
  unit: persons
  ins_tempo:
    matrix: POP107D
    dims: { sex: total, age: total }
    geo_level: lau2
  eurostat:                     # fallback / EU comparisons
    dataset: demo_r_pjangrp3
    filters: { sex: T, age: TOTAL }
    geo_level: nuts3

- kpi_code: gross_monthly_salary
  category: Labor
  unit: RON
  ins_tempo:
    matrix: FOM104E
    dims: { caen: total }
    geo_level: lau2
```

Adding a new KPI = adding a YAML entry. No Python changes for 80% of additions.

### Scheduling

- **Nightly cron**: full ingestion for all NW Romania (~400 communes × 40 KPIs ≈ 16k calls; well within either API's tolerance).
- **Manual "Refresh now"** button in UI for on-demand updates.
- Use `apscheduler` for local-only deployment; GitHub Actions cron if hosted.

### Idempotency & error handling

- Each fetch does `INSERT … ON CONFLICT (siruta_code, kpi_code, period) DO UPDATE` — every run is safely re-runnable.
- Per-KPI try/except — one failed dataset does not stop the rest of the run.
- Each run writes a `run_log` row with `kpis_fetched`, `kpis_failed`, and `error_summary` JSONB.
- UI shows "X / Y KPIs fresh as of ⟨date⟩" per location — staleness is never silent.

## 8. UI / UX Flow

Three screens. Read-only.

### Screen 1 — Landing / Picker

```
InnoINVest — Regional Data Source of Truth

🔍  Type a commune, city, or county…
    Hue…
    ▸ Huedin (commune, Cluj)         9,432 people
    ▸ Hunedoara (city, Hunedoara)   60,300 people

Recent: Florești · Cluj-Napoca · Beiuș
```

### Screen 2 — Report view (default: 15 categories)

```
Florești (commune, Cluj County)
[Categories ▼] [Flat table]   ⬇ Export Word  ⬇ Export CSV
Last refresh: 2026-05-22 03:14  ·  39/40 KPIs fresh ✓

── 4. Demographics ──────────────────────────────────────
   Total population (2025)        57,437 📋  src: INS POP107D
   Population aged 15–64 (2025)   38,000 📋  src: INS POP107D
   Growth 2023→2025               +13.0% 📋  computed

── 9. Labor Market ──────────────────────────────────────
   Avg gross monthly salary 2024  1,951 € 📋  src: INS FOM104E
   Unemployment rate, Cluj 2024    1.4 % 📋  src: INS SOM103D
   …

[▼ show 12 more categories]
```

### Screen 3 — Flat table tab

Same data, sortable + filterable: `Category | KPI | Value | Year | Source 📋`. Backed by TanStack Table.

### Four interactions that earn the tool's keep

1. **📋 Click-to-copy on every number** — clipboard receives the value AND inline citation, e.g. `"57,437 (INS Tempo POP107D, 2025)"`. Analyst pastes directly into Word with the citation already attached.
2. **⬇ Export to Word** generates a pre-formatted `.docx` with the 15-category structure. Analyst opens it, prunes what is not needed, and starts editing. **⬇ Export to CSV** for Excel users.
3. **Freshness badge** per number — green (< 30 days), yellow (< 1 year), red (> 1 year or missing). No silent staleness.
4. **Compare mode (stretch goal)** — pick 2–3 locations side by side; investors always ask "vs. Cluj-Napoca?" — this answers it in one click.

## 9. Stack & Deployment

| Layer | Choice | Why |
|---|---|---|
| DB | Postgres 16 (Supabase free or Docker) | Free, JSONB for `raw_payload`, easy hosting |
| Backend | FastAPI (Python 3.11) | Same language as ingestion; auto-generated OpenAPI |
| Ingestion | Plain Python + `apscheduler` (or GitHub Actions cron) | No Airflow/Prefect — overkill |
| Frontend | Next.js 15 (App Router) + Tailwind + shadcn/ui + TanStack Table | Server components, no client state lib needed |
| Python libs | `requests`, `pyjstat`, `lxml`, `pydantic`, `sqlalchemy` | Standard, no surprises |
| Repo layout | Monorepo: `/api`, `/ingest`, `/web`, `/db/migrations`, `/config/kpis.yaml`, `/docs` | One repo, three obvious deploy units |

### Deployment options

- **Hackathon demo:** `docker-compose up` — everything local in one command.
- **Slightly more durable:** Supabase (DB) + Vercel (Next.js) + Fly.io/Render (FastAPI + ingestion). Cost: $0 demo, ~$25/mo if ADR keeps running it.
- **Bonus:** `/ingest` runs as GitHub Action on cron schedule — zero infra to maintain.

## 10. v2 Roadmap (priority order)

**More coverage:**
1. **OSM/Overpass client** — adds Location & Transport categories (logistics distances, POIs near a commune).
2. **listafirme.ro client** — adds Business Ecosystem (top employers per commune with employee counts).
3. **Numbeo + EC Quality of Life** — Quality of Life category.
4. **Cross-EU mode** — compare any Romanian region to a foreign region using Eurostat-only KPIs.

**More UI:**
5. **Compare mode** — side-by-side commune comparison (investors always ask "vs Cluj-Napoca?").

**AI layer (where the "AI-powered" framing pays off):**
6. **Natural-language KPI search** — "what's the unemployment rate in Florești last year?" → resolves to the right KPI + location + period.
7. **Narrative auto-drafting** — given a chosen set of KPIs and a target audience (manufacturing investor, IT investor, etc.), generate a first-draft paragraph the analyst edits, with citations preserved.
8. **Commune-readiness scoring** — train a small model on past investor decisions to surface high-potential locations ADR analysts would not have considered.
9. **Chat copilot over the source of truth** — analyst asks "compare workforce profile of Huedin and Beiuș, focused on automotive" → tool synthesizes a structured answer from the DB.

## 11. Open Questions

- **SIRUTA dataset seed:** ANCPI / INS publish the official SIRUTA list; need to confirm format and a stable download URL during implementation.
- **INS Tempo rate limits:** no documented limit; if ingestion hits 503s we add backoff. Worst case, ingestion runs across multiple nights.
- **Word export library:** `python-docx` is the safe pick; needs verification that the generated 15-category template imports cleanly into Microsoft Word and not just LibreOffice.
- **Hosting decision (Supabase vs self-hosted Postgres):** doesn't block v1 but worth deciding before deploy.

## 12. Appendix — 15 Categories → v1 Source Coverage

Categories covered by v1 source pair (Eurostat + INS Tempo):

| # | Category | v1 coverage | v2 source(s) |
|---|---|---|---|
| 1 | Strategic Location | ❌ | OSM/Overpass |
| 2 | Macro-Economy | ✅ (Eurostat NUTS3 + INS county) | + ONRC for business creation |
| 3 | Quality of Life / Safety | ❌ | Numbeo, EC Urban Audit |
| 4 | Demographics | ✅ (INS commune-level) | + GHS-POP for catchment |
| 5 | Land & Real Estate | ❌ | ANCPI, Imobiliare.ro |
| 6 | Transport Infra | ❌ | CNAIR, OSM, SEAP |
| 7 | Utilities | ❌ | ANRE, Transelectrica, OpenInfraMap |
| 8 | Health Infra | ✅ (Eurostat + INS) | + Min. Sănătății |
| 9 | Labor Market | ✅ (INS commune + Eurostat) | + ANOFM vacancies |
| 10 | Education | ✅ (INS + Eurostat) | + edu.ro, OpenAlex |
| 11 | Business Ecosystem | ⚠️ partial (INS counts only) | listafirme.ro, Crunchbase |
| 12 | Innovation | ⚠️ partial (Eurostat R&D) | CORDIS, OpenAlex, EPO |
| 13 | Environment & Climate | ❌ | Copernicus, EEA, ANPM |
| 14 | Tax & State Aid | ❌ (mostly static national) | Consiliul Concurenței, MFP |
| 15 | Digital Infrastructure | ❌ | ANCOM, DESI |

**v1 fully covers 5 categories and partially covers 2** — sufficient for ~60% of the data points in the Florești reference brief and the most-cited categories (Demographics, Labor, Macro-Economy, Education, Health).
