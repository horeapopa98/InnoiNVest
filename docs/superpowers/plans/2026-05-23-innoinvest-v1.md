# InnoINVest v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the NW-Romania regional data source-of-truth: type a commune name → see ~5 KPIs grouped by the 15 brief categories, with click-to-copy + CSV/Word export, backed by Postgres pre-ingested from Eurostat + INS Tempo.

**Architecture:** Single Python backend package (`src/innoinvest/`) exposes a FastAPI HTTP layer and an ingestion runner (CLI). Postgres holds the source-of-truth tables. Next.js frontend in `frontend/` consumes the API. `docker-compose up` runs the whole demo.

**Tech Stack:** Postgres 16, Python 3.11 (FastAPI, SQLAlchemy 2.x, pydantic-settings, requests, pyjstat, lxml, typer, pyyaml, apscheduler, python-docx), Node 20 (Next.js 15 App Router, Tailwind, shadcn/ui, TanStack Table). Tests: pytest, responses (HTTP mocking).

**Reference spec:** `docs/superpowers/specs/2026-05-23-data-pipeline-design.md`

---

## File Structure (locks in decomposition)

```
.
├── pyproject.toml                              # single "innoinvest" Python package
├── docker-compose.yml                          # postgres + api + web + ingest cron
├── .env.example                                # DB URL, etc.
├── src/innoinvest/
│   ├── __init__.py
│   ├── settings.py                             # pydantic-settings (env loading)
│   ├── db.py                                   # SQLAlchemy engine + session
│   ├── models.py                               # SQLAlchemy ORM models
│   ├── api/
│   │   ├── __init__.py
│   │   ├── main.py                             # FastAPI app + CORS
│   │   ├── deps.py                             # get_db dependency
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── locations.py                    # GET /locations?q=, /locations/{siruta}
│   │       └── reports.py                      # GET /report/{siruta}
│   ├── ingest/
│   │   ├── __init__.py
│   │   ├── base.py                             # BaseClient ABC, ValueRow dataclass
│   │   ├── kpi_loader.py                       # parse config/kpis.yaml
│   │   ├── eurostat.py                         # Eurostat client (JSON-stat)
│   │   ├── ins_tempo.py                        # INS Tempo client (REST + XML)
│   │   ├── locations.py                        # seed SIRUTA CSV → location table
│   │   └── runner.py                           # orchestrate fetch + upsert + run_log
│   ├── export/
│   │   ├── __init__.py
│   │   ├── csv.py                              # CSV exporter
│   │   └── docx.py                             # Word table exporter
│   └── cli.py                                  # typer: innoinvest {seed,ingest,serve}
├── tests/
│   ├── conftest.py                             # shared fixtures (tmp DB)
│   ├── ingest/
│   │   ├── test_kpi_loader.py
│   │   ├── test_eurostat.py                    # responses-mocked
│   │   ├── test_ins_tempo.py                   # responses-mocked
│   │   └── test_runner.py
│   ├── api/
│   │   ├── test_locations.py
│   │   └── test_reports.py
│   └── export/
│       ├── test_csv.py
│       └── test_docx.py
├── db/
│   └── migrations/
│       └── 001_init.sql                        # location, kpi, source, kpi_value, run_log
├── config/
│   └── kpis.yaml                               # declarative KPI catalog
├── data/
│   └── siruta_nw_romania.csv                   # checked-in seed of ~400 SIRUTA codes
└── frontend/
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.ts
    ├── postcss.config.js
    ├── tsconfig.json
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx                        # picker
        │   └── report/[siruta]/page.tsx        # report view
        ├── lib/
        │   ├── api.ts
        │   └── format.ts
        └── components/
            ├── LocationPicker.tsx
            ├── ReportView.tsx
            ├── CategorySection.tsx
            ├── KpiRow.tsx
            ├── FlatTable.tsx
            └── ExportButtons.tsx
```

### Naming consistency (used throughout the plan)

| Concept | Identifier |
|---|---|
| Geographic ID | `siruta_code` (TEXT) |
| KPI ID | `kpi_code` (TEXT) |
| Time bucket | `period` (TEXT, e.g. `'2024'`) |
| Value type | `Decimal` (Python) ↔ `NUMERIC` (Postgres) |
| ValueRow fields | `siruta_code, kpi_code, period, value, source_code, source_dataset_id, source_url, raw_payload` |
| KPI config | `KpiConfig(kpi_code, category, unit, ins_tempo: dict | None, eurostat: dict | None)` |
| Client method | `fetch(kpi: KpiConfig, locations: list[Location]) -> list[ValueRow]` |

---

## Phase 0 — Bootstrap

### Task 0.1: Initialize Python project + Postgres via Docker

**Files:**
- Create: `pyproject.toml`
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `src/innoinvest/__init__.py`
- Create: `src/innoinvest/settings.py`
- Create: `tests/__init__.py`
- Create: `tests/conftest.py`

- [ ] **Step 1: Create `pyproject.toml`**

```toml
[project]
name = "innoinvest"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.32",
    "sqlalchemy>=2.0",
    "psycopg[binary]>=3.2",
    "pydantic>=2.9",
    "pydantic-settings>=2.5",
    "requests>=2.32",
    "pyjstat>=2.4",
    "lxml>=5.3",
    "PyYAML>=6.0",
    "apscheduler>=3.10",
    "python-docx>=1.1",
    "typer>=0.13",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3",
    "pytest-asyncio>=0.24",
    "responses>=0.25",
    "httpx>=0.27",
]

[project.scripts]
innoinvest = "innoinvest.cli:app"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/innoinvest"]

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
```

- [ ] **Step 2: Create `docker-compose.yml` (Postgres only for now)**

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: innoinvest
      POSTGRES_USER: innoinvest
      POSTGRES_PASSWORD: innoinvest
    ports:
      - "5433:5432"
    volumes:
      - db_data:/var/lib/postgresql/data
      - ./db/migrations:/docker-entrypoint-initdb.d:ro

volumes:
  db_data:
```

- [ ] **Step 3: Create `.env.example`**

```
DATABASE_URL=postgresql+psycopg://innoinvest:innoinvest@localhost:5433/innoinvest
INS_TEMPO_BASE_URL=http://statistici.insse.ro:8077/tempo-ins
EUROSTAT_BASE_URL=https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data
```

- [ ] **Step 4: Create `src/innoinvest/__init__.py`** (empty file with version)

```python
__version__ = "0.1.0"
```

- [ ] **Step 5: Create `src/innoinvest/settings.py`**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://innoinvest:innoinvest@localhost:5433/innoinvest"
    ins_tempo_base_url: str = "http://statistici.insse.ro:8077/tempo-ins"
    eurostat_base_url: str = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data"


settings = Settings()
```

- [ ] **Step 6: Create `tests/__init__.py`** (empty file)

- [ ] **Step 7: Create `tests/conftest.py` (placeholder for now)**

```python
"""Shared pytest fixtures for the innoinvest test suite."""
```

- [ ] **Step 8: Install the package and verify imports**

Run:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
python -c "from innoinvest.settings import settings; print(settings.database_url)"
```

Expected output:
```
postgresql+psycopg://innoinvest:innoinvest@localhost:5433/innoinvest
```

- [ ] **Step 9: Start Postgres and verify it's reachable**

Run:
```bash
docker compose up -d db
sleep 5
docker compose exec -T db psql -U innoinvest -d innoinvest -c "SELECT 1;"
```

Expected output: a `(1 row)` result.

- [ ] **Step 10: Commit**

```bash
git add pyproject.toml docker-compose.yml .env.example src/innoinvest/__init__.py src/innoinvest/settings.py tests/__init__.py tests/conftest.py
git commit -m "chore: bootstrap python project + postgres docker compose"
```

---

### Task 0.2: Initialize Next.js project

**Files:**
- Create: `frontend/` (entire Next.js scaffold)

- [ ] **Step 1: Generate the Next.js project with `src/` layout**

Run:
```bash
npx --yes create-next-app@15 web \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-npm \
  --no-turbopack
```

This creates `frontend/src/app/` (App Router) with the `@/*` import alias pointing at `frontend/src/*` — exactly the layout the rest of the plan assumes.

- [ ] **Step 2: Install additional UI dependencies**

Run:
```bash
cd web
npm install @tanstack/react-table lucide-react clsx
npm install -D @types/node
cd ..
```

- [ ] **Step 3: Add shadcn/ui setup**

Run:
```bash
cd web
npx --yes shadcn@latest init -d
npx --yes shadcn@latest add button input badge card table tabs
cd ..
```

(`-d` accepts defaults: New York style, Slate base color, CSS variables.)

- [ ] **Step 4: Verify the dev server starts**

Run:
```bash
cd web && npm run dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
kill %1
cd ..
```

Expected: `200`.

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "chore: scaffold nextjs frontend with tailwind, shadcn, tanstack table"
```

---

## Phase 1 — DB Schema & Locations

### Task 1.1: SQLAlchemy models + initial migration

**Files:**
- Create: `db/migrations/001_init.sql`
- Create: `src/innoinvest/db.py`
- Create: `src/innoinvest/models.py`
- Test: `tests/test_models_smoke.py`

- [ ] **Step 1: Write the initial migration**

Create `db/migrations/001_init.sql`:

```sql
CREATE TABLE IF NOT EXISTS source (
    source_code        TEXT PRIMARY KEY,
    name               TEXT NOT NULL,
    homepage_url       TEXT,
    license            TEXT,
    last_full_refresh  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS location (
    siruta_code        TEXT PRIMARY KEY,
    name               TEXT NOT NULL,
    name_normalized    TEXT NOT NULL,
    type               TEXT NOT NULL CHECK (type IN ('commune','city','county','region','country')),
    parent_siruta      TEXT REFERENCES location(siruta_code),
    nuts_code          TEXT,
    lat                NUMERIC,
    lon                NUMERIC,
    population_latest  INTEGER
);

CREATE INDEX IF NOT EXISTS ix_location_name_normalized ON location (name_normalized);
CREATE INDEX IF NOT EXISTS ix_location_parent          ON location (parent_siruta);
CREATE INDEX IF NOT EXISTS ix_location_nuts            ON location (nuts_code);

CREATE TABLE IF NOT EXISTS kpi (
    kpi_code           TEXT PRIMARY KEY,
    name_en            TEXT NOT NULL,
    name_ro            TEXT NOT NULL,
    unit               TEXT NOT NULL,
    category           TEXT NOT NULL,
    aggregation_level  TEXT NOT NULL CHECK (aggregation_level IN ('commune','county','country')),
    description        TEXT
);

CREATE TABLE IF NOT EXISTS kpi_value (
    id                 BIGSERIAL PRIMARY KEY,
    siruta_code        TEXT NOT NULL REFERENCES location(siruta_code),
    kpi_code           TEXT NOT NULL REFERENCES kpi(kpi_code),
    period             TEXT NOT NULL,
    value              NUMERIC,
    source_code        TEXT NOT NULL REFERENCES source(source_code),
    source_dataset_id  TEXT,
    source_url         TEXT,
    fetched_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_payload        JSONB,
    UNIQUE (siruta_code, kpi_code, period)
);

CREATE INDEX IF NOT EXISTS ix_kpi_value_siruta_kpi ON kpi_value (siruta_code, kpi_code);

CREATE TABLE IF NOT EXISTS run_log (
    id                 BIGSERIAL PRIMARY KEY,
    started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at        TIMESTAMPTZ,
    source_code        TEXT REFERENCES source(source_code),
    kpis_fetched       INTEGER NOT NULL DEFAULT 0,
    kpis_failed        INTEGER NOT NULL DEFAULT 0,
    error_summary      JSONB
);
```

- [ ] **Step 2: Create `src/innoinvest/db.py`**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from .settings import settings

engine = create_engine(settings.database_url, future=True, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


def get_session() -> Session:
    return SessionLocal()
```

- [ ] **Step 3: Create `src/innoinvest/models.py`**

```python
from __future__ import annotations
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    BigInteger, ForeignKey, Integer, Numeric, String, TIMESTAMP, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Source(Base):
    __tablename__ = "source"
    source_code: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    homepage_url: Mapped[str | None] = mapped_column(String)
    license: Mapped[str | None] = mapped_column(String)
    last_full_refresh: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))


class Location(Base):
    __tablename__ = "location"
    siruta_code: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    name_normalized: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    parent_siruta: Mapped[str | None] = mapped_column(
        String, ForeignKey("location.siruta_code")
    )
    nuts_code: Mapped[str | None] = mapped_column(String)
    lat: Mapped[Decimal | None] = mapped_column(Numeric)
    lon: Mapped[Decimal | None] = mapped_column(Numeric)
    population_latest: Mapped[int | None] = mapped_column(Integer)


class Kpi(Base):
    __tablename__ = "kpi"
    kpi_code: Mapped[str] = mapped_column(String, primary_key=True)
    name_en: Mapped[str] = mapped_column(String, nullable=False)
    name_ro: Mapped[str] = mapped_column(String, nullable=False)
    unit: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)
    aggregation_level: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String)


class KpiValue(Base):
    __tablename__ = "kpi_value"
    __table_args__ = (UniqueConstraint("siruta_code", "kpi_code", "period"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    siruta_code: Mapped[str] = mapped_column(String, ForeignKey("location.siruta_code"))
    kpi_code: Mapped[str] = mapped_column(String, ForeignKey("kpi.kpi_code"))
    period: Mapped[str] = mapped_column(String, nullable=False)
    value: Mapped[Decimal | None] = mapped_column(Numeric)
    source_code: Mapped[str] = mapped_column(String, ForeignKey("source.source_code"))
    source_dataset_id: Mapped[str | None] = mapped_column(String)
    source_url: Mapped[str | None] = mapped_column(String)
    fetched_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True))
    raw_payload: Mapped[Any | None] = mapped_column(JSONB)


class RunLog(Base):
    __tablename__ = "run_log"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    started_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    source_code: Mapped[str | None] = mapped_column(String, ForeignKey("source.source_code"))
    kpis_fetched: Mapped[int] = mapped_column(Integer, default=0)
    kpis_failed: Mapped[int] = mapped_column(Integer, default=0)
    error_summary: Mapped[Any | None] = mapped_column(JSONB)
```

- [ ] **Step 4: Write a smoke test that confirms tables exist after migration**

Create `tests/test_models_smoke.py`:

```python
from sqlalchemy import inspect

from innoinvest.db import engine


def test_all_tables_exist():
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    assert tables >= {"source", "location", "kpi", "kpi_value", "run_log"}, (
        f"missing tables; have: {tables}"
    )
```

- [ ] **Step 5: Apply migration to the running Postgres**

Run:
```bash
docker compose down -v
docker compose up -d db
sleep 5
```

Postgres applies `db/migrations/001_init.sql` automatically on first init because we mounted `/docker-entrypoint-initdb.d`. Verify:

```bash
docker compose exec -T db psql -U innoinvest -d innoinvest -c "\dt"
```

Expected: five tables listed (`source`, `location`, `kpi`, `kpi_value`, `run_log`).

- [ ] **Step 6: Run the smoke test**

Run:
```bash
pytest tests/test_models_smoke.py -v
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add db/migrations/001_init.sql src/innoinvest/db.py src/innoinvest/models.py tests/test_models_smoke.py
git commit -m "feat(db): initial schema + sqlalchemy models for source-of-truth"
```

---

### Task 1.2: Seed SIRUTA codes for NW Romania

**Files:**
- Create: `data/siruta_nw_romania.csv`
- Create: `src/innoinvest/ingest/__init__.py`
- Create: `src/innoinvest/ingest/locations.py`
- Test: `tests/ingest/test_locations_seed.py`

- [ ] **Step 1: Create the SIRUTA seed CSV**

`data/siruta_nw_romania.csv` is the canonical commune list for the 6 NW counties. For the hackathon, seed it from INS's published SIRUTA list (`https://www.recensamantromania.ro/wp-content/uploads/2022/06/SIRUTA_RPL2021.xlsx`) — convert the relevant rows to CSV and check in. The expected columns are:

```
siruta_code,name,type,parent_siruta,nuts_code
RO11,North-West,region,,RO11
1026,Bihor,county,RO11,RO111
2719,Bistrita-Nasaud,county,RO11,RO112
4017,Cluj,county,RO11,RO113
4324,Floresti,commune,4017,RO113
... (one row per commune across all 6 counties)
```

Until the real CSV is generated, create a **starter file with the 6 counties + ~10 representative communes** so the rest of the plan can be developed and tested. Add a TODO comment at the top:

```csv
# TODO: replace with full SIRUTA seed from INS (recensamantromania.ro). Starter only.
siruta_code,name,type,parent_siruta,nuts_code
RO,Romania,country,,RO
RO11,North-West,region,RO,RO11
1026,Bihor,county,RO11,RO111
2719,Bistrita-Nasaud,county,RO11,RO112
4017,Cluj,county,RO11,RO113
11724,Maramures,county,RO11,RO114
14492,Satu Mare,county,RO11,RO115
17387,Salaj,county,RO11,RO116
4324,Floresti,commune,4017,RO113
4030,Cluj-Napoca,city,4017,RO113
4253,Huedin,commune,4017,RO113
1029,Oradea,city,1026,RO111
1031,Beius,commune,1026,RO111
11770,Baia Mare,city,11724,RO114
14495,Satu Mare,city,14492,RO115
17390,Zalau,city,17387,RO116
2722,Bistrita,city,2719,RO112
```

(Full seed is generated in Task 8.2 once the plumbing is proven.)

- [ ] **Step 2: Create `src/innoinvest/ingest/__init__.py`** (empty)

- [ ] **Step 3: Write the failing test for the seed loader**

Create `tests/ingest/__init__.py` (empty) and `tests/ingest/test_locations_seed.py`:

```python
import csv
from pathlib import Path

import pytest
from sqlalchemy.orm import Session

from innoinvest.db import SessionLocal, engine
from innoinvest.models import Base, Location
from innoinvest.ingest.locations import seed_locations


@pytest.fixture
def db():
    """Reset the location table for each test."""
    Base.metadata.drop_all(engine, tables=[Location.__table__])
    Base.metadata.create_all(engine, tables=[Location.__table__])
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()


def test_seed_locations_loads_all_rows(db: Session, tmp_path: Path):
    csv_path = tmp_path / "siruta.csv"
    csv_path.write_text(
        "siruta_code,name,type,parent_siruta,nuts_code\n"
        "RO,Romania,country,,RO\n"
        "4017,Cluj,county,,RO113\n"
        "4324,Floresti,commune,4017,RO113\n"
    )
    inserted = seed_locations(db, csv_path)

    assert inserted == 3
    floresti = db.get(Location, "4324")
    assert floresti is not None
    assert floresti.name == "Floresti"
    assert floresti.name_normalized == "floresti"
    assert floresti.type == "commune"
    assert floresti.parent_siruta == "4017"
    assert floresti.nuts_code == "RO113"


def test_seed_locations_skips_comment_lines(db: Session, tmp_path: Path):
    csv_path = tmp_path / "siruta.csv"
    csv_path.write_text(
        "# this is a comment\n"
        "siruta_code,name,type,parent_siruta,nuts_code\n"
        "RO,Romania,country,,RO\n"
    )
    assert seed_locations(db, csv_path) == 1


def test_seed_locations_is_idempotent(db: Session, tmp_path: Path):
    csv_path = tmp_path / "siruta.csv"
    csv_path.write_text(
        "siruta_code,name,type,parent_siruta,nuts_code\n"
        "RO,Romania,country,,RO\n"
    )
    seed_locations(db, csv_path)
    inserted_second = seed_locations(db, csv_path)
    assert inserted_second == 0
    assert db.query(Location).count() == 1
```

- [ ] **Step 4: Run the test to confirm it fails**

Run:
```bash
pytest tests/ingest/test_locations_seed.py -v
```

Expected: FAIL with `ImportError: cannot import name 'seed_locations'`.

- [ ] **Step 5: Implement the seeder**

Create `src/innoinvest/ingest/locations.py`:

```python
"""Seed the `location` table from a SIRUTA CSV file."""
from __future__ import annotations

import csv
import unicodedata
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Location


def normalize(name: str) -> str:
    """Lowercase + strip Romanian diacritics for search."""
    stripped = unicodedata.normalize("NFKD", name)
    no_marks = "".join(ch for ch in stripped if not unicodedata.combining(ch))
    return no_marks.lower().strip()


def seed_locations(session: Session, csv_path: Path) -> int:
    """Insert any new locations from `csv_path`. Returns count of newly inserted rows."""
    existing = {row[0] for row in session.execute(select(Location.siruta_code)).all()}
    inserted = 0

    with open(csv_path, newline="", encoding="utf-8") as fh:
        # Skip lines that start with '#' (comment convention).
        rows = [line for line in fh if not line.startswith("#")]

    reader = csv.DictReader(rows)
    for row in reader:
        code = row["siruta_code"].strip()
        if not code or code in existing:
            continue
        loc = Location(
            siruta_code=code,
            name=row["name"].strip(),
            name_normalized=normalize(row["name"]),
            type=row["type"].strip(),
            parent_siruta=(row.get("parent_siruta") or None) or None,
            nuts_code=(row.get("nuts_code") or None) or None,
        )
        session.add(loc)
        inserted += 1

    session.commit()
    return inserted
```

- [ ] **Step 6: Run the tests to confirm they pass**

Run:
```bash
pytest tests/ingest/test_locations_seed.py -v
```

Expected: 3 PASS.

- [ ] **Step 7: Seed the dev DB**

Add the seeder to the CLI (we'll formalize the CLI in Task 6.3 — for now run inline):

```bash
python -c "
from pathlib import Path
from innoinvest.db import SessionLocal
from innoinvest.ingest.locations import seed_locations
s = SessionLocal()
n = seed_locations(s, Path('data/siruta_nw_romania.csv'))
print(f'inserted {n} locations')
"
```

Expected: `inserted 16 locations` (matches the starter CSV).

- [ ] **Step 8: Commit**

```bash
git add data/siruta_nw_romania.csv src/innoinvest/ingest/__init__.py src/innoinvest/ingest/locations.py tests/ingest/__init__.py tests/ingest/test_locations_seed.py
git commit -m "feat(ingest): seed loader for siruta locations with diacritic-free search"
```

---

## Phase 2 — Ingestion Foundation

### Task 2.1: KpiConfig dataclass + YAML loader

**Files:**
- Create: `config/kpis.yaml`
- Create: `src/innoinvest/ingest/base.py`
- Create: `src/innoinvest/ingest/kpi_loader.py`
- Test: `tests/ingest/test_kpi_loader.py`

- [ ] **Step 1: Write the starter KPI catalog**

Create `config/kpis.yaml`:

```yaml
# 5 KPIs for v1 demo, mapped to brief categories.
# Add more by appending entries; the runner picks them up automatically.

- kpi_code: pop_total
  name_en: Total population
  name_ro: Populația totală
  unit: persons
  category: Demographics
  aggregation_level: commune
  description: Total resident population, all ages, both sexes.
  ins_tempo:
    matrix: POP107D
    dims: { SEX: "Total", AGE: "Total", URBAN_RURAL: "Total" }
    geo_level: lau2

- kpi_code: gross_monthly_salary
  name_en: Average gross monthly nominal earnings
  name_ro: Câștigul salarial mediu nominal brut lunar
  unit: RON
  category: Labor Market
  aggregation_level: county
  description: Average gross nominal earnings, monthly, all sectors.
  ins_tempo:
    matrix: FOM104D
    dims: { CAEN: "Total" }
    geo_level: nuts3

- kpi_code: unemployment_rate
  name_en: Registered unemployment rate
  name_ro: Rata șomajului înregistrat
  unit: percent
  category: Labor Market
  aggregation_level: county
  description: Registered unemployed as a share of the active population.
  ins_tempo:
    matrix: SOM101A
    dims: { SEX: "Total" }
    geo_level: nuts3

- kpi_code: gdp_per_capita
  name_en: Regional GDP per capita
  name_ro: PIB pe locuitor, regional
  unit: EUR
  category: Macro-Economy
  aggregation_level: county
  description: Gross domestic product per inhabitant, NUTS3 level, current prices in EUR.
  eurostat:
    dataset: nama_10r_3gdp
    filters: { unit: "EUR_HAB" }
    geo_level: nuts3

- kpi_code: active_population
  name_en: Working-age population (15-64)
  name_ro: Populația activă (15-64 ani)
  unit: persons
  category: Demographics
  aggregation_level: commune
  description: Resident population aged 15 to 64.
  ins_tempo:
    matrix: POP107D
    dims: { SEX: "Total", AGE: "15-64", URBAN_RURAL: "Total" }
    geo_level: lau2
```

- [ ] **Step 2: Define `KpiConfig` and `ValueRow` in `base.py`**

Create `src/innoinvest/ingest/base.py`:

```python
"""Abstract base for source-specific ingestion clients."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Iterable

from ..models import Location


@dataclass(frozen=True)
class KpiConfig:
    """One row from config/kpis.yaml, normalized."""
    kpi_code: str
    name_en: str
    name_ro: str
    unit: str
    category: str
    aggregation_level: str  # 'commune' | 'county' | 'country'
    description: str
    ins_tempo: dict[str, Any] | None = None
    eurostat: dict[str, Any] | None = None


@dataclass
class ValueRow:
    """A single fetched data point ready for `kpi_value` upsert."""
    siruta_code: str
    kpi_code: str
    period: str
    value: Decimal | None
    source_code: str
    source_dataset_id: str | None = None
    source_url: str | None = None
    raw_payload: dict[str, Any] | None = field(default=None)


class BaseClient(ABC):
    """Source-specific ingestion client."""
    name: str  # class attribute set by subclass

    @abstractmethod
    def fetch(self, kpi: KpiConfig, locations: Iterable[Location]) -> list[ValueRow]:
        """Return one `ValueRow` per (location, period) the source has data for."""
```

- [ ] **Step 3: Write the failing test for the YAML loader**

Create `tests/ingest/test_kpi_loader.py`:

```python
from pathlib import Path

from innoinvest.ingest.base import KpiConfig
from innoinvest.ingest.kpi_loader import load_kpis


def test_load_kpis_parses_all_entries():
    kpis = load_kpis(Path("config/kpis.yaml"))
    assert len(kpis) >= 5
    codes = [k.kpi_code for k in kpis]
    assert "pop_total" in codes
    assert "gdp_per_capita" in codes


def test_load_kpis_returns_kpiconfig_with_source_blocks():
    kpis = {k.kpi_code: k for k in load_kpis(Path("config/kpis.yaml"))}

    pop = kpis["pop_total"]
    assert isinstance(pop, KpiConfig)
    assert pop.aggregation_level == "commune"
    assert pop.ins_tempo is not None
    assert pop.ins_tempo["matrix"] == "POP107D"
    assert pop.eurostat is None

    gdp = kpis["gdp_per_capita"]
    assert gdp.eurostat is not None
    assert gdp.eurostat["dataset"] == "nama_10r_3gdp"
    assert gdp.ins_tempo is None


def test_load_kpis_rejects_invalid_aggregation_level(tmp_path: Path):
    bad = tmp_path / "bad.yaml"
    bad.write_text(
        "- kpi_code: x\n  name_en: x\n  name_ro: x\n  unit: x\n"
        "  category: x\n  aggregation_level: planet\n  description: x\n"
    )
    import pytest
    with pytest.raises(ValueError, match="aggregation_level"):
        load_kpis(bad)
```

- [ ] **Step 4: Run the test to confirm it fails**

Run:
```bash
pytest tests/ingest/test_kpi_loader.py -v
```

Expected: FAIL with `ImportError: cannot import name 'load_kpis'`.

- [ ] **Step 5: Implement the loader**

Create `src/innoinvest/ingest/kpi_loader.py`:

```python
"""Parse the declarative KPI catalog from YAML into `KpiConfig` objects."""
from __future__ import annotations

from pathlib import Path

import yaml

from .base import KpiConfig

_VALID_AGG_LEVELS = {"commune", "county", "country"}


def load_kpis(path: Path) -> list[KpiConfig]:
    with open(path, encoding="utf-8") as fh:
        raw = yaml.safe_load(fh)

    if not isinstance(raw, list):
        raise ValueError(f"{path}: top-level must be a list of KPI entries")

    kpis: list[KpiConfig] = []
    for i, entry in enumerate(raw):
        if entry.get("aggregation_level") not in _VALID_AGG_LEVELS:
            raise ValueError(
                f"{path}[{i}]: aggregation_level must be one of {_VALID_AGG_LEVELS}, "
                f"got {entry.get('aggregation_level')!r}"
            )
        kpis.append(
            KpiConfig(
                kpi_code=entry["kpi_code"],
                name_en=entry["name_en"],
                name_ro=entry["name_ro"],
                unit=entry["unit"],
                category=entry["category"],
                aggregation_level=entry["aggregation_level"],
                description=entry.get("description", ""),
                ins_tempo=entry.get("ins_tempo"),
                eurostat=entry.get("eurostat"),
            )
        )
    return kpis
```

- [ ] **Step 6: Run the tests to confirm they pass**

Run:
```bash
pytest tests/ingest/test_kpi_loader.py -v
```

Expected: 3 PASS.

- [ ] **Step 7: Commit**

```bash
git add config/kpis.yaml src/innoinvest/ingest/base.py src/innoinvest/ingest/kpi_loader.py tests/ingest/test_kpi_loader.py
git commit -m "feat(ingest): kpi config dataclasses + yaml loader (5 starter kpis)"
```

---

## Phase 3 — INS Tempo Client

### Task 3.1: INS Tempo client fetches a single KPI

**Files:**
- Create: `src/innoinvest/ingest/ins_tempo.py`
- Test: `tests/ingest/test_ins_tempo.py`
- Test fixture: `tests/ingest/fixtures/ins_tempo_POP107D.json`

- [ ] **Step 1: Capture a real INS Tempo response as a fixture**

INS Tempo's "matrix" REST returns JSON when `Accept: application/json` is sent. The simplest meta endpoint to use is `GET /tempo-ins/matrix/{matrix_code}` for metadata and `POST /tempo-ins/matrix/{matrix_code}` with a dimension selection body for the values.

We don't want our unit tests calling the real network. Capture one real response once and check it in.

Run (this is a one-off curl to grab a real fixture; tests then mock it):
```bash
mkdir -p tests/ingest/fixtures
curl -s -X POST \
  -H 'Content-Type: application/json' \
  -d '{"matrixName":"POP107D","matrixDetails":{"SEX":"Total","AGE":"Total","URBAN_RURAL":"Total"}}' \
  'http://statistici.insse.ro:8077/tempo-ins/matrix/POP107D' \
  > tests/ingest/fixtures/ins_tempo_POP107D.json
head -c 400 tests/ingest/fixtures/ins_tempo_POP107D.json
```

If the real API is reachable, you'll see JSON with `matrixName`, `dimensions`, and `dataPoints` arrays. If it's NOT reachable from your network, hand-craft a minimal valid fixture:

```json
{
  "matrixName": "POP107D",
  "dimensions": [
    {"name": "Localitate", "options": [{"code": "4324", "label": "FLORESTI"}]},
    {"name": "Ani", "options": [{"code": "2024", "label": "Anul 2024"}, {"code": "2025", "label": "Anul 2025"}]}
  ],
  "dataPoints": [
    {"Localitate": "4324", "Ani": "2024", "value": 56279},
    {"Localitate": "4324", "Ani": "2025", "value": 57437}
  ]
}
```

(Either form works; the parser below treats the structure abstractly.)

- [ ] **Step 2: Write the failing test for the INS Tempo client**

Create `tests/ingest/test_ins_tempo.py`:

```python
import json
from decimal import Decimal
from pathlib import Path

import responses

from innoinvest.ingest.base import KpiConfig
from innoinvest.ingest.ins_tempo import InsTempoClient
from innoinvest.models import Location

FIXTURE = Path(__file__).parent / "fixtures" / "ins_tempo_POP107D.json"


def make_kpi() -> KpiConfig:
    return KpiConfig(
        kpi_code="pop_total",
        name_en="Total population",
        name_ro="Populatia totala",
        unit="persons",
        category="Demographics",
        aggregation_level="commune",
        description="",
        ins_tempo={
            "matrix": "POP107D",
            "dims": {"SEX": "Total", "AGE": "Total", "URBAN_RURAL": "Total"},
            "geo_level": "lau2",
        },
    )


def make_locations() -> list[Location]:
    return [
        Location(
            siruta_code="4324", name="Floresti", name_normalized="floresti",
            type="commune", parent_siruta="4017", nuts_code="RO113",
        ),
    ]


@responses.activate
def test_fetch_returns_one_value_row_per_year():
    fixture_body = FIXTURE.read_text()
    responses.add(
        responses.POST,
        "http://statistici.insse.ro:8077/tempo-ins/matrix/POP107D",
        body=fixture_body,
        content_type="application/json",
        status=200,
    )

    client = InsTempoClient(base_url="http://statistici.insse.ro:8077/tempo-ins")
    rows = client.fetch(make_kpi(), make_locations())

    assert all(r.siruta_code == "4324" for r in rows)
    assert all(r.kpi_code == "pop_total" for r in rows)
    assert all(r.source_code == "ins_tempo" for r in rows)
    assert all(r.source_dataset_id == "POP107D" for r in rows)
    assert all(r.source_url and r.source_url.endswith("POP107D") for r in rows)
    # Each row has a numeric value and a 4-digit year period:
    for r in rows:
        assert isinstance(r.value, Decimal)
        assert len(r.period) == 4 and r.period.isdigit()


@responses.activate
def test_fetch_filters_to_requested_locations_only():
    """If the response contains other SIRUTA codes, we ignore them."""
    body = {
        "matrixName": "POP107D",
        "dimensions": [
            {"name": "Localitate", "options": [
                {"code": "4324", "label": "FLORESTI"},
                {"code": "9999", "label": "OTHER"},
            ]},
            {"name": "Ani", "options": [{"code": "2025", "label": "Anul 2025"}]},
        ],
        "dataPoints": [
            {"Localitate": "4324", "Ani": "2025", "value": 57437},
            {"Localitate": "9999", "Ani": "2025", "value": 1},
        ],
    }
    responses.add(
        responses.POST,
        "http://statistici.insse.ro:8077/tempo-ins/matrix/POP107D",
        body=json.dumps(body),
        content_type="application/json",
        status=200,
    )
    client = InsTempoClient(base_url="http://statistici.insse.ro:8077/tempo-ins")
    rows = client.fetch(make_kpi(), make_locations())

    assert [r.siruta_code for r in rows] == ["4324"]
    assert rows[0].value == Decimal("57437")
    assert rows[0].period == "2025"


@responses.activate
def test_fetch_raises_for_non_200():
    responses.add(
        responses.POST,
        "http://statistici.insse.ro:8077/tempo-ins/matrix/POP107D",
        status=503,
    )
    client = InsTempoClient(base_url="http://statistici.insse.ro:8077/tempo-ins")
    import pytest
    with pytest.raises(RuntimeError, match="503"):
        client.fetch(make_kpi(), make_locations())
```

- [ ] **Step 3: Run the tests to confirm they fail**

Run:
```bash
pytest tests/ingest/test_ins_tempo.py -v
```

Expected: FAIL — `ImportError: cannot import name 'InsTempoClient'`.

- [ ] **Step 4: Implement the INS Tempo client**

Create `src/innoinvest/ingest/ins_tempo.py`:

```python
"""INS Tempo Online client.

Tempo's REST endpoint accepts a matrix code and a dimension filter, and returns
JSON with `dimensions` (one per axis) and `dataPoints` (one per cell).

This client only knows how to fetch one KPI at a time; the runner is in charge
of looping over KPIs.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Any, Iterable

import requests

from ..models import Location
from .base import BaseClient, KpiConfig, ValueRow


class InsTempoClient(BaseClient):
    name = "ins_tempo"

    def __init__(self, base_url: str, *, timeout: int = 30):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    # --- public ----------------------------------------------------------

    def fetch(self, kpi: KpiConfig, locations: Iterable[Location]) -> list[ValueRow]:
        if not kpi.ins_tempo:
            return []
        matrix = kpi.ins_tempo["matrix"]
        dims = kpi.ins_tempo.get("dims", {})
        url = f"{self.base_url}/matrix/{matrix}"

        payload = {"matrixName": matrix, "matrixDetails": dims}
        resp = requests.post(url, json=payload, timeout=self.timeout)
        if resp.status_code != 200:
            raise RuntimeError(f"INS Tempo {matrix}: HTTP {resp.status_code}")
        data: dict[str, Any] = resp.json()

        wanted_siruta = {loc.siruta_code for loc in locations}
        rows: list[ValueRow] = []
        for cell in data.get("dataPoints", []):
            siruta = cell.get("Localitate") or cell.get("Judet")
            year = cell.get("Ani") or cell.get("An")
            if siruta not in wanted_siruta or year is None:
                continue
            value = cell.get("value")
            rows.append(
                ValueRow(
                    siruta_code=siruta,
                    kpi_code=kpi.kpi_code,
                    period=str(year),
                    value=Decimal(str(value)) if value is not None else None,
                    source_code=self.name,
                    source_dataset_id=matrix,
                    source_url=url,
                    raw_payload=cell,
                )
            )
        return rows
```

- [ ] **Step 5: Run the tests to confirm they pass**

Run:
```bash
pytest tests/ingest/test_ins_tempo.py -v
```

Expected: 3 PASS.

- [ ] **Step 6: Commit**

```bash
git add src/innoinvest/ingest/ins_tempo.py tests/ingest/test_ins_tempo.py tests/ingest/fixtures/
git commit -m "feat(ingest): ins tempo client fetches and parses one kpi"
```

---

### Task 3.2: INS Tempo live smoke test (marked, opt-in)

**Files:**
- Modify: `tests/ingest/test_ins_tempo.py` (append)
- Modify: `pyproject.toml` (register marker)

- [ ] **Step 1: Add a `live` pytest marker to `pyproject.toml`**

Open `pyproject.toml` and ensure `[tool.pytest.ini_options]` contains:

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
markers = [
    "live: hits real external HTTP APIs; opt-in with -m live",
]
```

- [ ] **Step 2: Append a live smoke test to `tests/ingest/test_ins_tempo.py`**

```python
import pytest

from innoinvest.ingest.ins_tempo import InsTempoClient
from innoinvest.settings import settings


@pytest.mark.live
def test_live_floresti_population():
    client = InsTempoClient(base_url=settings.ins_tempo_base_url)
    rows = client.fetch(make_kpi(), make_locations())
    assert any(r.siruta_code == "4324" and r.value and r.value > 50000 for r in rows), (
        "expected Floresti population > 50,000 in at least one year"
    )
```

- [ ] **Step 3: Run only the live smoke test**

Run:
```bash
pytest tests/ingest/test_ins_tempo.py -m live -v
```

Expected: PASS — confirming the real INS Tempo endpoint behaves as our mocks assume. If FAIL, the matrix code or payload shape needs adjustment in `config/kpis.yaml` or `InsTempoClient`.

- [ ] **Step 4: Commit**

```bash
git add tests/ingest/test_ins_tempo.py pyproject.toml
git commit -m "test(ingest): live smoke test for ins tempo (opt-in)"
```

---

## Phase 4 — Eurostat Client

### Task 4.1: Eurostat client fetches a single KPI

**Files:**
- Create: `src/innoinvest/ingest/eurostat.py`
- Test: `tests/ingest/test_eurostat.py`
- Test fixture: `tests/ingest/fixtures/eurostat_nama_10r_3gdp.json`

- [ ] **Step 1: Capture a Eurostat fixture**

Eurostat's API: `GET https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{dataset}?{filter}` returns JSON-stat 2.0.

Run:
```bash
curl -s 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10r_3gdp?unit=EUR_HAB&geo=RO113&time=2022&format=JSON' \
  > tests/ingest/fixtures/eurostat_nama_10r_3gdp.json
head -c 400 tests/ingest/fixtures/eurostat_nama_10r_3gdp.json
```

If unreachable, hand-craft a minimal JSON-stat valid for `pyjstat`:

```json
{
  "version": "2.0",
  "class": "dataset",
  "label": "GDP per inhabitant",
  "source": "Eurostat",
  "updated": "2025-12-01",
  "id": ["geo", "time", "unit"],
  "size": [1, 1, 1],
  "dimension": {
    "geo": {"label": "geo", "category": {"index": {"RO113": 0}, "label": {"RO113": "Cluj"}}},
    "time": {"label": "time", "category": {"index": {"2022": 0}, "label": {"2022": "2022"}}},
    "unit": {"label": "unit", "category": {"index": {"EUR_HAB": 0}, "label": {"EUR_HAB": "Euro per inhabitant"}}}
  },
  "value": {"0": 17840}
}
```

- [ ] **Step 2: Write the failing test for the Eurostat client**

Create `tests/ingest/test_eurostat.py`:

```python
from decimal import Decimal
from pathlib import Path

import responses

from innoinvest.ingest.base import KpiConfig
from innoinvest.ingest.eurostat import EurostatClient
from innoinvest.models import Location

FIXTURE = Path(__file__).parent / "fixtures" / "eurostat_nama_10r_3gdp.json"


def make_kpi() -> KpiConfig:
    return KpiConfig(
        kpi_code="gdp_per_capita",
        name_en="GDP per capita",
        name_ro="PIB pe locuitor",
        unit="EUR",
        category="Macro-Economy",
        aggregation_level="county",
        description="",
        eurostat={
            "dataset": "nama_10r_3gdp",
            "filters": {"unit": "EUR_HAB"},
            "geo_level": "nuts3",
        },
    )


def make_locations() -> list[Location]:
    return [
        Location(
            siruta_code="4017", name="Cluj", name_normalized="cluj",
            type="county", parent_siruta="RO11", nuts_code="RO113",
        ),
    ]


@responses.activate
def test_fetch_returns_value_row_per_period():
    body = FIXTURE.read_text()
    responses.add(
        responses.GET,
        "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10r_3gdp",
        body=body, content_type="application/json", status=200,
    )

    client = EurostatClient(
        base_url="https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data"
    )
    rows = client.fetch(make_kpi(), make_locations())

    assert len(rows) >= 1
    assert all(r.source_code == "eurostat" for r in rows)
    assert all(r.source_dataset_id == "nama_10r_3gdp" for r in rows)
    assert all(r.siruta_code == "4017" for r in rows)  # mapped from nuts_code
    assert all(isinstance(r.value, Decimal) for r in rows)
    assert all(len(r.period) == 4 and r.period.isdigit() for r in rows)
```

- [ ] **Step 3: Run the test to confirm it fails**

Run:
```bash
pytest tests/ingest/test_eurostat.py -v
```

Expected: FAIL — `ImportError`.

- [ ] **Step 4: Implement the Eurostat client**

Create `src/innoinvest/ingest/eurostat.py`:

```python
"""Eurostat dissemination API client (JSON-stat 2.0)."""
from __future__ import annotations

from decimal import Decimal
from typing import Iterable

import requests
from pyjstat import pyjstat

from ..models import Location
from .base import BaseClient, KpiConfig, ValueRow


class EurostatClient(BaseClient):
    name = "eurostat"

    def __init__(self, base_url: str, *, timeout: int = 30):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def fetch(self, kpi: KpiConfig, locations: Iterable[Location]) -> list[ValueRow]:
        if not kpi.eurostat:
            return []
        dataset = kpi.eurostat["dataset"]
        filters = dict(kpi.eurostat.get("filters", {}))
        nuts_to_siruta = {
            loc.nuts_code: loc.siruta_code for loc in locations if loc.nuts_code
        }
        if not nuts_to_siruta:
            return []

        params: list[tuple[str, str]] = list(filters.items())
        for nuts in nuts_to_siruta:
            params.append(("geo", nuts))
        params.append(("format", "JSON"))

        url = f"{self.base_url}/{dataset}"
        resp = requests.get(url, params=params, timeout=self.timeout)
        if resp.status_code != 200:
            raise RuntimeError(f"Eurostat {dataset}: HTTP {resp.status_code}")

        ds = pyjstat.Dataset.read(resp.text)
        df = ds.write("dataframe")  # columns: dimensions + "value"

        rows: list[ValueRow] = []
        for record in df.to_dict(orient="records"):
            geo = record.get("geo")
            time = record.get("time")
            value = record.get("value")
            siruta = nuts_to_siruta.get(geo)
            if siruta is None or time is None:
                continue
            rows.append(
                ValueRow(
                    siruta_code=siruta,
                    kpi_code=kpi.kpi_code,
                    period=str(time),
                    value=Decimal(str(value)) if value is not None else None,
                    source_code=self.name,
                    source_dataset_id=dataset,
                    source_url=resp.url,
                    raw_payload=record,
                )
            )
        return rows
```

- [ ] **Step 5: Run the tests to confirm they pass**

Run:
```bash
pytest tests/ingest/test_eurostat.py -v
```

Expected: PASS.

- [ ] **Step 6: Add a live smoke test (same pattern as Task 3.2)**

Append to `tests/ingest/test_eurostat.py`:

```python
import pytest

from innoinvest.settings import settings


@pytest.mark.live
def test_live_cluj_gdp_per_capita():
    client = EurostatClient(base_url=settings.eurostat_base_url)
    rows = client.fetch(make_kpi(), make_locations())
    assert any(r.value and r.value > 5000 for r in rows), (
        "expected positive GDP per capita for Cluj"
    )
```

- [ ] **Step 7: Run the live smoke test**

Run:
```bash
pytest tests/ingest/test_eurostat.py -m live -v
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/innoinvest/ingest/eurostat.py tests/ingest/test_eurostat.py tests/ingest/fixtures/eurostat_nama_10r_3gdp.json
git commit -m "feat(ingest): eurostat client (json-stat) + live smoke test"
```

---

## Phase 5 — Ingestion Runner

### Task 5.1: Runner orchestrates fetch + upsert + run_log

**Files:**
- Create: `src/innoinvest/ingest/runner.py`
- Test: `tests/ingest/test_runner.py`

- [ ] **Step 1: Write the failing test for the runner**

Create `tests/ingest/test_runner.py`:

```python
from datetime import datetime
from decimal import Decimal
from typing import Iterable
from unittest.mock import MagicMock

import pytest
from sqlalchemy.orm import Session

from innoinvest.db import SessionLocal, engine
from innoinvest.models import Base, Location, Source, Kpi, KpiValue, RunLog
from innoinvest.ingest.base import BaseClient, KpiConfig, ValueRow
from innoinvest.ingest.runner import IngestionRunner


@pytest.fixture
def db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    s = SessionLocal()
    s.add(Source(source_code="ins_tempo", name="INS Tempo"))
    s.add(Source(source_code="eurostat", name="Eurostat"))
    s.add(Location(
        siruta_code="4324", name="Floresti", name_normalized="floresti",
        type="commune", parent_siruta="4017", nuts_code="RO113",
    ))
    s.commit()
    try:
        yield s
    finally:
        s.close()


def make_kpi(code: str = "pop_total", agg: str = "commune") -> KpiConfig:
    return KpiConfig(
        kpi_code=code, name_en=code, name_ro=code, unit="persons",
        category="Demographics", aggregation_level=agg, description="",
        ins_tempo={"matrix": "POP107D", "dims": {}, "geo_level": "lau2"},
    )


class StubClient(BaseClient):
    name = "ins_tempo"

    def __init__(self, rows: list[ValueRow] | Exception):
        self._rows = rows

    def fetch(self, kpi, locations):
        if isinstance(self._rows, Exception):
            raise self._rows
        return self._rows


def test_runner_upserts_value_rows_and_writes_kpi_and_run_log(db: Session):
    rows = [
        ValueRow(
            siruta_code="4324", kpi_code="pop_total", period="2025",
            value=Decimal("57437"), source_code="ins_tempo",
            source_dataset_id="POP107D", source_url="http://example/POP107D",
            raw_payload={"x": 1},
        ),
    ]
    runner = IngestionRunner(
        session_factory=lambda: SessionLocal(),
        clients={"ins_tempo": StubClient(rows)},
        kpis=[make_kpi()],
    )
    runner.run()

    values = db.query(KpiValue).all()
    assert len(values) == 1
    assert values[0].value == Decimal("57437")
    assert values[0].fetched_at is not None
    # Kpi row was created/upserted from the catalog:
    assert db.query(Kpi).filter_by(kpi_code="pop_total").one()
    # Run log was written:
    log = db.query(RunLog).one()
    assert log.kpis_fetched == 1
    assert log.kpis_failed == 0
    assert log.finished_at is not None


def test_runner_is_idempotent(db: Session):
    rows = [
        ValueRow(
            siruta_code="4324", kpi_code="pop_total", period="2025",
            value=Decimal("57437"), source_code="ins_tempo",
            source_dataset_id="POP107D", source_url="x",
        ),
    ]
    runner = IngestionRunner(
        session_factory=lambda: SessionLocal(),
        clients={"ins_tempo": StubClient(rows)},
        kpis=[make_kpi()],
    )
    runner.run()
    runner.run()
    assert db.query(KpiValue).count() == 1


def test_runner_continues_on_per_kpi_failure(db: Session):
    good_kpi = make_kpi("pop_total")
    bad_kpi = make_kpi("active_population")
    good_rows = [
        ValueRow(
            siruta_code="4324", kpi_code="pop_total", period="2025",
            value=Decimal("57437"), source_code="ins_tempo",
            source_dataset_id="POP107D", source_url="x",
        ),
    ]
    # Two stub clients keyed by KPI code: first good, second blows up.
    class DispatchClient(BaseClient):
        name = "ins_tempo"

        def fetch(self, kpi, locations):
            if kpi.kpi_code == "pop_total":
                return good_rows
            raise RuntimeError("synthetic failure")

    runner = IngestionRunner(
        session_factory=lambda: SessionLocal(),
        clients={"ins_tempo": DispatchClient()},
        kpis=[good_kpi, bad_kpi],
    )
    runner.run()

    assert db.query(KpiValue).count() == 1
    log = db.query(RunLog).one()
    assert log.kpis_fetched == 1
    assert log.kpis_failed == 1
    assert log.error_summary and "active_population" in str(log.error_summary)
```

- [ ] **Step 2: Run the test to confirm it fails**

Run:
```bash
pytest tests/ingest/test_runner.py -v
```

Expected: FAIL — `ImportError: cannot import name 'IngestionRunner'`.

- [ ] **Step 3: Implement the runner**

Create `src/innoinvest/ingest/runner.py`:

```python
"""Orchestrates: load KPIs → for each KPI, pick the right client → fetch → upsert.

Always writes a `run_log` row, even on partial failure.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Callable, Mapping

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from ..models import Kpi, KpiValue, Location, RunLog
from .base import BaseClient, KpiConfig

log = logging.getLogger(__name__)


class IngestionRunner:
    def __init__(
        self,
        session_factory: Callable[[], Session],
        clients: Mapping[str, BaseClient],
        kpis: list[KpiConfig],
    ):
        self._session_factory = session_factory
        self._clients = clients
        self._kpis = kpis

    # --- public ----------------------------------------------------------

    def run(self) -> None:
        session = self._session_factory()
        run = RunLog(started_at=datetime.now(timezone.utc), kpis_fetched=0, kpis_failed=0)
        session.add(run)
        session.commit()

        try:
            self._upsert_kpi_catalog(session)
            errors: list[dict] = []

            locations = session.query(Location).all()
            for kpi in self._kpis:
                applicable = self._locations_for_kpi(kpi, locations)
                client_name = "ins_tempo" if kpi.ins_tempo else "eurostat" if kpi.eurostat else None
                if client_name is None or client_name not in self._clients:
                    errors.append({"kpi": kpi.kpi_code, "reason": "no client configured"})
                    run.kpis_failed += 1
                    continue
                client = self._clients[client_name]
                try:
                    rows = client.fetch(kpi, applicable)
                except Exception as exc:  # noqa: BLE001 - we want to log + continue
                    log.exception("kpi %s failed via %s", kpi.kpi_code, client_name)
                    errors.append({"kpi": kpi.kpi_code, "reason": str(exc)})
                    run.kpis_failed += 1
                    continue

                self._upsert_values(session, rows)
                run.kpis_fetched += 1
                session.commit()

            run.finished_at = datetime.now(timezone.utc)
            run.error_summary = {"errors": errors} if errors else None
            session.commit()
        finally:
            session.close()

    # --- internals -------------------------------------------------------

    def _locations_for_kpi(self, kpi: KpiConfig, locations: list[Location]) -> list[Location]:
        match kpi.aggregation_level:
            case "commune":
                return [l for l in locations if l.type in ("commune", "city")]
            case "county":
                return [l for l in locations if l.type == "county"]
            case "country":
                return [l for l in locations if l.type == "country"]
            case _:
                return []

    def _upsert_kpi_catalog(self, session: Session) -> None:
        for kpi in self._kpis:
            stmt = pg_insert(Kpi).values(
                kpi_code=kpi.kpi_code,
                name_en=kpi.name_en,
                name_ro=kpi.name_ro,
                unit=kpi.unit,
                category=kpi.category,
                aggregation_level=kpi.aggregation_level,
                description=kpi.description,
            ).on_conflict_do_update(
                index_elements=["kpi_code"],
                set_={
                    "name_en": kpi.name_en,
                    "name_ro": kpi.name_ro,
                    "unit": kpi.unit,
                    "category": kpi.category,
                    "aggregation_level": kpi.aggregation_level,
                    "description": kpi.description,
                },
            )
            session.execute(stmt)
        session.commit()

    def _upsert_values(self, session: Session, rows) -> None:
        for r in rows:
            stmt = pg_insert(KpiValue).values(
                siruta_code=r.siruta_code,
                kpi_code=r.kpi_code,
                period=r.period,
                value=r.value,
                source_code=r.source_code,
                source_dataset_id=r.source_dataset_id,
                source_url=r.source_url,
                fetched_at=datetime.now(timezone.utc),
                raw_payload=r.raw_payload,
            ).on_conflict_do_update(
                index_elements=["siruta_code", "kpi_code", "period"],
                set_={
                    "value": r.value,
                    "source_code": r.source_code,
                    "source_dataset_id": r.source_dataset_id,
                    "source_url": r.source_url,
                    "fetched_at": datetime.now(timezone.utc),
                    "raw_payload": r.raw_payload,
                },
            )
            session.execute(stmt)
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run:
```bash
pytest tests/ingest/test_runner.py -v
```

Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/innoinvest/ingest/runner.py tests/ingest/test_runner.py
git commit -m "feat(ingest): runner orchestrates fetch+upsert with per-kpi error isolation and run_log"
```

---

## Phase 6 — Backend API

### Task 6.1: GET /locations search endpoint

**Files:**
- Create: `src/innoinvest/api/__init__.py`
- Create: `src/innoinvest/api/deps.py`
- Create: `src/innoinvest/api/main.py`
- Create: `src/innoinvest/api/routes/__init__.py`
- Create: `src/innoinvest/api/routes/locations.py`
- Test: `tests/api/__init__.py`
- Test: `tests/api/conftest.py`
- Test: `tests/api/test_locations.py`

- [ ] **Step 1: Write the failing test**

Create `tests/api/__init__.py` (empty) and `tests/api/conftest.py`:

```python
import pytest
from fastapi.testclient import TestClient

from innoinvest.api.main import create_app
from innoinvest.db import SessionLocal, engine
from innoinvest.models import Base, Location


@pytest.fixture
def client():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    s = SessionLocal()
    for loc in [
        Location(siruta_code="4324", name="Floresti", name_normalized="floresti",
                 type="commune", parent_siruta="4017", nuts_code="RO113"),
        Location(siruta_code="4253", name="Huedin", name_normalized="huedin",
                 type="commune", parent_siruta="4017", nuts_code="RO113"),
        Location(siruta_code="4030", name="Cluj-Napoca", name_normalized="cluj-napoca",
                 type="city", parent_siruta="4017", nuts_code="RO113"),
    ]:
        s.add(loc)
    s.commit()
    s.close()
    return TestClient(create_app())
```

Create `tests/api/test_locations.py`:

```python
def test_search_returns_matching_locations(client):
    r = client.get("/locations", params={"q": "flor"})
    assert r.status_code == 200
    body = r.json()
    assert any(item["siruta_code"] == "4324" for item in body)


def test_search_is_diacritic_insensitive(client):
    r = client.get("/locations", params={"q": "FLOR"})
    assert r.status_code == 200
    assert any(item["name"] == "Floresti" for item in r.json())


def test_get_one_location(client):
    r = client.get("/locations/4324")
    assert r.status_code == 200
    assert r.json()["name"] == "Floresti"


def test_get_unknown_location_returns_404(client):
    r = client.get("/locations/99999")
    assert r.status_code == 404
```

- [ ] **Step 2: Run the test to confirm it fails**

Run:
```bash
pytest tests/api/test_locations.py -v
```

Expected: FAIL — `ImportError`.

- [ ] **Step 3: Implement the API**

Create `src/innoinvest/api/__init__.py` (empty), `src/innoinvest/api/routes/__init__.py` (empty).

Create `src/innoinvest/api/deps.py`:

```python
from typing import Iterator
from sqlalchemy.orm import Session

from ..db import SessionLocal


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

Create `src/innoinvest/api/routes/locations.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..deps import get_db
from ...ingest.locations import normalize
from ...models import Location

router = APIRouter()


@router.get("/locations")
def search_locations(q: str = "", db: Session = Depends(get_db)):
    norm = normalize(q)
    if not norm:
        return []
    rows = (
        db.query(Location)
        .filter(Location.name_normalized.like(f"{norm}%"))
        .order_by(Location.name)
        .limit(20)
        .all()
    )
    return [_serialize(loc) for loc in rows]


@router.get("/locations/{siruta_code}")
def get_location(siruta_code: str, db: Session = Depends(get_db)):
    loc = db.get(Location, siruta_code)
    if loc is None:
        raise HTTPException(status_code=404, detail=f"location {siruta_code} not found")
    return _serialize(loc)


def _serialize(loc: Location) -> dict:
    return {
        "siruta_code": loc.siruta_code,
        "name": loc.name,
        "type": loc.type,
        "parent_siruta": loc.parent_siruta,
        "nuts_code": loc.nuts_code,
        "population_latest": loc.population_latest,
    }
```

Create `src/innoinvest/api/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes.locations import router as locations_router


def create_app() -> FastAPI:
    app = FastAPI(title="InnoINVest API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_methods=["GET"],
        allow_headers=["*"],
    )
    app.include_router(locations_router)
    return app


app = create_app()
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run:
```bash
pytest tests/api/test_locations.py -v
```

Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/innoinvest/api/ tests/api/__init__.py tests/api/conftest.py tests/api/test_locations.py
git commit -m "feat(api): GET /locations (search + by-id) with diacritic-insensitive search"
```

---

### Task 6.2: GET /report/{siruta} endpoint

**Files:**
- Create: `src/innoinvest/api/routes/reports.py`
- Modify: `src/innoinvest/api/main.py`
- Test: `tests/api/test_reports.py`

- [ ] **Step 1: Write the failing test**

Create `tests/api/test_reports.py`:

```python
from datetime import datetime, timezone
from decimal import Decimal

import pytest

from innoinvest.db import SessionLocal, engine
from innoinvest.models import Base, Location, Source, Kpi, KpiValue


@pytest.fixture
def populated_client(client):
    """Extend the fixture from conftest.py with KPI catalog + values for Floresti."""
    s = SessionLocal()
    s.add(Source(source_code="ins_tempo", name="INS Tempo"))
    s.add(Kpi(
        kpi_code="pop_total", name_en="Total population", name_ro="Populatia totala",
        unit="persons", category="Demographics", aggregation_level="commune",
    ))
    s.add(Kpi(
        kpi_code="gross_monthly_salary", name_en="Avg gross monthly earnings",
        name_ro="Salariul mediu brut", unit="RON", category="Labor Market",
        aggregation_level="county",
    ))
    s.add(KpiValue(
        siruta_code="4324", kpi_code="pop_total", period="2025",
        value=Decimal("57437"), source_code="ins_tempo",
        source_dataset_id="POP107D", source_url="http://example/POP107D",
        fetched_at=datetime.now(timezone.utc),
    ))
    s.add(KpiValue(
        siruta_code="4324", kpi_code="pop_total", period="2024",
        value=Decimal("56279"), source_code="ins_tempo",
        source_dataset_id="POP107D", source_url="http://example/POP107D",
        fetched_at=datetime.now(timezone.utc),
    ))
    s.commit()
    s.close()
    return client


def test_report_returns_location_and_grouped_kpis(populated_client):
    r = populated_client.get("/report/4324")
    assert r.status_code == 200
    body = r.json()
    assert body["location"]["name"] == "Floresti"

    cats = {c["category"]: c for c in body["categories"]}
    assert "Demographics" in cats
    demos = cats["Demographics"]["kpis"]
    assert any(k["kpi_code"] == "pop_total" for k in demos)

    pop = next(k for k in demos if k["kpi_code"] == "pop_total")
    # Latest period first, with source provenance per value:
    assert pop["latest"]["period"] == "2025"
    assert pop["latest"]["value"] == "57437"
    assert pop["latest"]["source_code"] == "ins_tempo"
    assert pop["latest"]["source_dataset_id"] == "POP107D"
    assert pop["latest"]["source_url"].endswith("POP107D")
    # History contains earlier periods:
    assert any(h["period"] == "2024" for h in pop["history"])


def test_report_returns_flat_table(populated_client):
    r = populated_client.get("/report/4324", params={"format": "flat"})
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body["rows"], list)
    assert any(row["kpi_code"] == "pop_total" and row["period"] == "2025" for row in body["rows"])


def test_report_for_unknown_location_returns_404(populated_client):
    r = populated_client.get("/report/99999")
    assert r.status_code == 404
```

- [ ] **Step 2: Run the test to confirm it fails**

Run:
```bash
pytest tests/api/test_reports.py -v
```

Expected: FAIL — `404 Not Found` (endpoint doesn't exist).

- [ ] **Step 3: Implement the reports route**

Create `src/innoinvest/api/routes/reports.py`:

```python
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..deps import get_db
from ...models import Kpi, KpiValue, Location

router = APIRouter()


@router.get("/report/{siruta_code}")
def get_report(
    siruta_code: str,
    format: str = Query("grouped", regex="^(grouped|flat)$"),
    db: Session = Depends(get_db),
):
    loc = db.get(Location, siruta_code)
    if loc is None:
        raise HTTPException(status_code=404, detail=f"location {siruta_code} not found")

    # County-level KPIs are joined via parent_siruta when the location is a commune/city.
    candidate_siruta = [siruta_code]
    if loc.parent_siruta and loc.type in ("commune", "city"):
        candidate_siruta.append(loc.parent_siruta)

    rows = (
        db.query(KpiValue, Kpi)
        .join(Kpi, KpiValue.kpi_code == Kpi.kpi_code)
        .filter(KpiValue.siruta_code.in_(candidate_siruta))
        .order_by(Kpi.category, Kpi.name_en, KpiValue.period.desc())
        .all()
    )

    serialized_rows = [_serialize_row(v, k, loc) for v, k in rows]

    if format == "flat":
        return {"location": _serialize_loc(loc), "rows": serialized_rows}

    # Grouped: category -> kpi_code -> {latest, history}
    by_kpi: dict[str, list[dict]] = defaultdict(list)
    kpi_meta: dict[str, dict] = {}
    for v, k in rows:
        by_kpi[k.kpi_code].append(_serialize_value(v))
        if k.kpi_code not in kpi_meta:
            kpi_meta[k.kpi_code] = {
                "kpi_code": k.kpi_code,
                "name_en": k.name_en,
                "name_ro": k.name_ro,
                "unit": k.unit,
                "category": k.category,
                "aggregation_level": k.aggregation_level,
            }

    grouped: dict[str, list[dict]] = defaultdict(list)
    for kpi_code, values in by_kpi.items():
        meta = kpi_meta[kpi_code]
        grouped[meta["category"]].append({
            **meta,
            "latest": values[0],
            "history": values[1:],
        })

    return {
        "location": _serialize_loc(loc),
        "categories": [
            {"category": cat, "kpis": kpis} for cat, kpis in grouped.items()
        ],
    }


def _serialize_loc(loc: Location) -> dict:
    return {
        "siruta_code": loc.siruta_code,
        "name": loc.name,
        "type": loc.type,
        "parent_siruta": loc.parent_siruta,
        "nuts_code": loc.nuts_code,
    }


def _serialize_value(v: KpiValue) -> dict:
    return {
        "period": v.period,
        "value": str(v.value) if v.value is not None else None,
        "source_code": v.source_code,
        "source_dataset_id": v.source_dataset_id,
        "source_url": v.source_url,
        "fetched_at": v.fetched_at.isoformat() if v.fetched_at else None,
    }


def _serialize_row(v: KpiValue, k: Kpi, loc: Location) -> dict:
    return {
        "kpi_code": v.kpi_code,
        "kpi_name_en": k.name_en,
        "category": k.category,
        "unit": k.unit,
        "period": v.period,
        "value": str(v.value) if v.value is not None else None,
        "source_code": v.source_code,
        "source_dataset_id": v.source_dataset_id,
        "source_url": v.source_url,
        "aggregation_level": k.aggregation_level,
        "for_siruta": v.siruta_code,
    }
```

- [ ] **Step 4: Wire the route into the app**

Edit `src/innoinvest/api/main.py` to import and include the reports router:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes.locations import router as locations_router
from .routes.reports import router as reports_router


def create_app() -> FastAPI:
    app = FastAPI(title="InnoINVest API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_methods=["GET"],
        allow_headers=["*"],
    )
    app.include_router(locations_router)
    app.include_router(reports_router)
    return app


app = create_app()
```

- [ ] **Step 5: Run the tests to confirm they pass**

Run:
```bash
pytest tests/api/test_reports.py -v
```

Expected: 3 PASS.

- [ ] **Step 6: Start the API and curl it**

Run:
```bash
uvicorn innoinvest.api.main:app --reload --port 8000 &
sleep 3
curl -s http://localhost:8000/report/4324 | head -c 500
kill %1
```

Expected: JSON with `location.name == "Floresti"` and a `categories` array (empty until ingestion is run against the real DB).

- [ ] **Step 7: Commit**

```bash
git add src/innoinvest/api/routes/reports.py src/innoinvest/api/main.py tests/api/test_reports.py
git commit -m "feat(api): GET /report/{siruta} grouped + flat with provenance"
```

---

### Task 6.3: Typer CLI (`innoinvest seed`, `innoinvest ingest`, `innoinvest serve`)

**Files:**
- Create: `src/innoinvest/cli.py`
- Test: `tests/test_cli_smoke.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_cli_smoke.py`:

```python
from typer.testing import CliRunner

from innoinvest.cli import app

runner = CliRunner()


def test_cli_help_lists_subcommands():
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    for cmd in ["seed", "ingest", "serve"]:
        assert cmd in result.stdout
```

- [ ] **Step 2: Run the test to confirm it fails**

Run:
```bash
pytest tests/test_cli_smoke.py -v
```

Expected: FAIL — `ImportError`.

- [ ] **Step 3: Implement the CLI**

Create `src/innoinvest/cli.py`:

```python
"""Typer CLI: innoinvest seed | ingest | serve."""
from __future__ import annotations

from pathlib import Path

import typer
import uvicorn

from .db import SessionLocal
from .ingest.eurostat import EurostatClient
from .ingest.ins_tempo import InsTempoClient
from .ingest.kpi_loader import load_kpis
from .ingest.locations import seed_locations
from .ingest.runner import IngestionRunner
from .settings import settings

app = typer.Typer(help="InnoINVest backend CLI")


@app.command()
def seed(
    csv_path: Path = typer.Option(Path("data/siruta_nw_romania.csv"), "--csv"),
) -> None:
    """Seed the location table from a SIRUTA CSV."""
    with SessionLocal() as s:
        n = seed_locations(s, csv_path)
        typer.echo(f"inserted {n} locations")


@app.command()
def ingest(
    config_path: Path = typer.Option(Path("config/kpis.yaml"), "--config"),
) -> None:
    """Fetch every configured KPI and upsert into kpi_value."""
    kpis = load_kpis(config_path)
    clients = {
        "ins_tempo": InsTempoClient(base_url=settings.ins_tempo_base_url),
        "eurostat": EurostatClient(base_url=settings.eurostat_base_url),
    }
    runner = IngestionRunner(
        session_factory=lambda: SessionLocal(),
        clients=clients,
        kpis=kpis,
    )
    runner.run()
    typer.echo("ingest complete")


@app.command()
def serve(host: str = "0.0.0.0", port: int = 8000) -> None:
    """Start the FastAPI server."""
    uvicorn.run("innoinvest.api.main:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    app()
```

- [ ] **Step 4: Run the test to confirm it passes**

Run:
```bash
pytest tests/test_cli_smoke.py -v
```

Expected: PASS.

- [ ] **Step 5: End-to-end smoke against the real DB and APIs**

Run:
```bash
docker compose down -v && docker compose up -d db && sleep 5
innoinvest seed
innoinvest ingest
innoinvest serve --port 8000 &
sleep 3
curl -s http://localhost:8000/report/4324 | python -m json.tool | head -40
kill %1
```

Expected: The JSON shows real values for at least `pop_total` for Floresti (population near ~57,000 for the most recent year). If empty, check the `run_log` table for failure reasons.

- [ ] **Step 6: Commit**

```bash
git add src/innoinvest/cli.py tests/test_cli_smoke.py
git commit -m "feat(cli): typer entry points for seed, ingest, serve"
```

---

## Phase 7 — Frontend

### Task 7.1: API client + landing page with location picker

**Files:**
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/format.ts`
- Create: `frontend/src/components/LocationPicker.tsx`
- Modify: `frontend/src/app/page.tsx`
- Create: `frontend/.env.local`

- [ ] **Step 1: Add the API base URL env var**

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

- [ ] **Step 2: Implement the API client**

Create `frontend/src/lib/api.ts`:

```typescript
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export type LocationSummary = {
  siruta_code: string;
  name: string;
  type: "commune" | "city" | "county" | "region" | "country";
  parent_siruta: string | null;
  nuts_code: string | null;
  population_latest: number | null;
};

export type KpiValueDto = {
  period: string;
  value: string | null;
  source_code: string;
  source_dataset_id: string | null;
  source_url: string | null;
  fetched_at: string | null;
};

export type KpiDto = {
  kpi_code: string;
  name_en: string;
  name_ro: string;
  unit: string;
  category: string;
  aggregation_level: "commune" | "county" | "country";
  latest: KpiValueDto;
  history: KpiValueDto[];
};

export type GroupedReport = {
  location: LocationSummary;
  categories: { category: string; kpis: KpiDto[] }[];
};

export type FlatRow = {
  kpi_code: string;
  kpi_name_en: string;
  category: string;
  unit: string;
  period: string;
  value: string | null;
  source_code: string;
  source_dataset_id: string | null;
  source_url: string | null;
  aggregation_level: string;
  for_siruta: string;
};

export type FlatReport = { location: LocationSummary; rows: FlatRow[] };

export async function searchLocations(q: string): Promise<LocationSummary[]> {
  const r = await fetch(`${BASE}/locations?q=${encodeURIComponent(q)}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`search failed: ${r.status}`);
  return r.json();
}

export async function getGroupedReport(siruta: string): Promise<GroupedReport> {
  const r = await fetch(`${BASE}/report/${siruta}?format=grouped`, { cache: "no-store" });
  if (!r.ok) throw new Error(`report failed: ${r.status}`);
  return r.json();
}

export async function getFlatReport(siruta: string): Promise<FlatReport> {
  const r = await fetch(`${BASE}/report/${siruta}?format=flat`, { cache: "no-store" });
  if (!r.ok) throw new Error(`report failed: ${r.status}`);
  return r.json();
}
```

- [ ] **Step 3: Implement number formatting helpers**

Create `frontend/src/lib/format.ts`:

```typescript
export function formatValue(raw: string | null, unit: string): string {
  if (raw === null) return "—";
  const n = Number(raw);
  if (Number.isNaN(n)) return raw;
  const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
  switch (unit) {
    case "EUR": return `${fmt.format(n)} €`;
    case "RON": return `${fmt.format(n)} RON`;
    case "percent": return `${fmt.format(n)} %`;
    case "persons": return fmt.format(n);
    default: return `${fmt.format(n)} ${unit}`;
  }
}

export function citation(unit: string, value: string | null, period: string,
                         sourceCode: string, datasetId: string | null): string {
  const v = formatValue(value, unit);
  const src = datasetId ? `${sourceCode.toUpperCase()} ${datasetId}` : sourceCode.toUpperCase();
  return `${v} (${src}, ${period})`;
}

export function freshnessLabel(fetchedAtIso: string | null): "fresh" | "ok" | "stale" {
  if (!fetchedAtIso) return "stale";
  const ageDays = (Date.now() - new Date(fetchedAtIso).getTime()) / 86_400_000;
  if (ageDays < 30) return "fresh";
  if (ageDays < 365) return "ok";
  return "stale";
}
```

- [ ] **Step 4: Implement the LocationPicker component**

Create `frontend/src/components/LocationPicker.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { searchLocations, type LocationSummary } from "@/lib/api";

export function LocationPicker() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<LocationSummary[]>([]);

  useEffect(() => {
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try { setResults(await searchLocations(q)); }
      catch { setResults([]); }
    }, 150);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="w-full max-w-xl space-y-2">
      <Input
        placeholder="Type a commune, city, or county…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />
      <ul className="divide-y rounded border bg-white shadow-sm">
        {results.map((r) => (
          <li key={r.siruta_code}>
            <button
              onClick={() => router.push(`/report/${r.siruta_code}`)}
              className="flex w-full justify-between p-3 text-left hover:bg-slate-50"
            >
              <span>
                <span className="font-medium">{r.name}</span>
                <span className="ml-2 text-sm text-slate-500">({r.type})</span>
              </span>
              <span className="text-xs text-slate-400">SIRUTA {r.siruta_code}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: Replace the default landing page**

Overwrite `frontend/src/app/page.tsx`:

```tsx
import { LocationPicker } from "@/components/LocationPicker";

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">InnoINVest</h1>
        <p className="text-slate-600">
          Regional data source-of-truth for NW Romania.
        </p>
      </header>
      <LocationPicker />
    </main>
  );
}
```

- [ ] **Step 6: Manual verification**

Run:
```bash
# API
innoinvest serve --port 8000 &
# Frontend
(cd web && npm run dev) &
sleep 5
open http://localhost:3000
```

In the browser: type "Flor" and verify Floresti appears. Click it: the URL changes to `/report/4324` (page is a 404 for now — Task 7.2).

Kill background processes:
```bash
kill %1 %2
```

- [ ] **Step 7: Commit**

```bash
git add frontend/.env.local frontend/src/lib/ frontend/src/components/LocationPicker.tsx frontend/src/app/page.tsx
git commit -m "feat(web): location picker + api client + format helpers"
```

---

### Task 7.2: Report page — 15-category view + flat table

**Files:**
- Create: `frontend/src/components/KpiRow.tsx`
- Create: `frontend/src/components/CategorySection.tsx`
- Create: `frontend/src/components/FlatTable.tsx`
- Create: `frontend/src/components/ReportView.tsx`
- Create: `frontend/src/components/ExportButtons.tsx`
- Create: `frontend/src/app/report/[siruta]/page.tsx`

- [ ] **Step 1: KpiRow with click-to-copy + freshness badge**

Create `frontend/src/components/KpiRow.tsx`:

```tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import type { KpiDto } from "@/lib/api";
import { citation, formatValue, freshnessLabel } from "@/lib/format";

export function KpiRow({ kpi }: { kpi: KpiDto }) {
  const fresh = freshnessLabel(kpi.latest.fetched_at);
  const badgeColor =
    fresh === "fresh" ? "bg-green-600" :
    fresh === "ok"    ? "bg-yellow-500" : "bg-red-500";

  const copy = async () => {
    await navigator.clipboard.writeText(
      citation(kpi.unit, kpi.latest.value, kpi.latest.period,
               kpi.latest.source_code, kpi.latest.source_dataset_id)
    );
  };

  return (
    <div className="flex items-center justify-between border-b py-2">
      <div>
        <div className="font-medium">{kpi.name_en}</div>
        <div className="text-xs text-slate-500">
          {kpi.latest.source_code.toUpperCase()}
          {kpi.latest.source_dataset_id ? ` · ${kpi.latest.source_dataset_id}` : ""}
          {" · "}{kpi.latest.period}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono tabular-nums">{formatValue(kpi.latest.value, kpi.unit)}</span>
        <Badge className={`${badgeColor} text-white`}>{fresh}</Badge>
        <Button size="icon" variant="ghost" onClick={copy} title="Copy with citation">
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: CategorySection**

Create `frontend/src/components/CategorySection.tsx`:

```tsx
import { KpiRow } from "./KpiRow";
import type { KpiDto } from "@/lib/api";

export function CategorySection({ category, kpis }: { category: string; kpis: KpiDto[] }) {
  return (
    <section className="space-y-1">
      <h2 className="border-b pb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {category}
      </h2>
      {kpis.map((k) => <KpiRow key={k.kpi_code} kpi={k} />)}
    </section>
  );
}
```

- [ ] **Step 3: FlatTable with TanStack Table**

Create `frontend/src/components/FlatTable.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import type { FlatRow } from "@/lib/api";
import { citation, formatValue } from "@/lib/format";

export function FlatTable({ rows }: { rows: FlatRow[] }) {
  const columns = useMemo<ColumnDef<FlatRow>[]>(() => [
    { accessorKey: "category", header: "Category" },
    { accessorKey: "kpi_name_en", header: "KPI" },
    {
      accessorKey: "value",
      header: "Value",
      cell: ({ row }) => formatValue(row.original.value, row.original.unit),
    },
    { accessorKey: "period", header: "Year" },
    {
      accessorKey: "source_code",
      header: "Source",
      cell: ({ row }) =>
        `${row.original.source_code.toUpperCase()}${
          row.original.source_dataset_id ? ` ${row.original.source_dataset_id}` : ""
        }`,
    },
    {
      id: "copy",
      header: "",
      cell: ({ row }) => (
        <Button size="icon" variant="ghost" onClick={() =>
          navigator.clipboard.writeText(citation(
            row.original.unit, row.original.value, row.original.period,
            row.original.source_code, row.original.source_dataset_id
          ))
        }>
          <Copy className="h-4 w-4" />
        </Button>
      ),
    },
  ], []);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <table className="w-full text-sm">
      <thead>
        {table.getHeaderGroups().map((hg) => (
          <tr key={hg.id} className="border-b text-left">
            {hg.headers.map((h) => (
              <th key={h.id} className="py-2 pr-4">
                {flexRender(h.column.columnDef.header, h.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((r) => (
          <tr key={r.id} className="border-b">
            {r.getVisibleCells().map((c) => (
              <td key={c.id} className="py-2 pr-4">
                {flexRender(c.column.columnDef.cell, c.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: ExportButtons (CSV + Word) — calls the API export endpoints**

Create `frontend/src/components/ExportButtons.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export function ExportButtons({ siruta }: { siruta: string }) {
  return (
    <div className="flex gap-2">
      <a href={`${BASE}/report/${siruta}/export.csv`} download>
        <Button variant="outline" size="sm">
          <Download className="mr-1 h-4 w-4" /> Export CSV
        </Button>
      </a>
      <a href={`${BASE}/report/${siruta}/export.docx`} download>
        <Button variant="outline" size="sm">
          <Download className="mr-1 h-4 w-4" /> Export Word
        </Button>
      </a>
    </div>
  );
}
```

- [ ] **Step 5: ReportView with Tabs**

Create `frontend/src/components/ReportView.tsx`:

```tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategorySection } from "./CategorySection";
import { FlatTable } from "./FlatTable";
import { ExportButtons } from "./ExportButtons";
import type { GroupedReport, FlatReport } from "@/lib/api";

export function ReportView({ grouped, flat }: { grouped: GroupedReport; flat: FlatReport }) {
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{grouped.location.name}</h1>
          <p className="text-sm text-slate-500">
            {grouped.location.type} · SIRUTA {grouped.location.siruta_code}
          </p>
        </div>
        <ExportButtons siruta={grouped.location.siruta_code} />
      </header>

      <Tabs defaultValue="grouped">
        <TabsList>
          <TabsTrigger value="grouped">Categories</TabsTrigger>
          <TabsTrigger value="flat">Flat table</TabsTrigger>
        </TabsList>
        <TabsContent value="grouped" className="space-y-6">
          {grouped.categories.map((c) => (
            <CategorySection key={c.category} category={c.category} kpis={c.kpis} />
          ))}
        </TabsContent>
        <TabsContent value="flat">
          <FlatTable rows={flat.rows} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 6: Report page (server component → fetches both formats in parallel)**

Create `frontend/src/app/report/[siruta]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getFlatReport, getGroupedReport } from "@/lib/api";
import { ReportView } from "@/components/ReportView";

type Props = { params: Promise<{ siruta: string }> };

export default async function ReportPage({ params }: Props) {
  const { siruta } = await params;
  try {
    const [grouped, flat] = await Promise.all([
      getGroupedReport(siruta),
      getFlatReport(siruta),
    ]);
    return (
      <main className="mx-auto max-w-4xl p-8">
        <ReportView grouped={grouped} flat={flat} />
      </main>
    );
  } catch {
    notFound();
  }
}
```

- [ ] **Step 7: Manual verification (export endpoints will 404 — handled in 7.3)**

Run:
```bash
innoinvest serve --port 8000 &
(cd web && npm run dev) &
sleep 5
open http://localhost:3000/report/4324
```

Confirm: the page renders Floresti's KPIs grouped by category, the copy buttons work (paste somewhere — citation should appear), the Flat tab shows the same data in a sortable table. Export buttons error → fixed in 7.3.

Kill: `kill %1 %2`.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/ frontend/src/app/report/
git commit -m "feat(web): report view with 15-category + flat tabs, copy-with-citation"
```

---

### Task 7.3: CSV + Word export endpoints

**Files:**
- Create: `src/innoinvest/export/__init__.py`
- Create: `src/innoinvest/export/csv.py`
- Create: `src/innoinvest/export/docx.py`
- Modify: `src/innoinvest/api/routes/reports.py`
- Test: `tests/export/__init__.py`
- Test: `tests/export/test_csv.py`
- Test: `tests/export/test_docx.py`

- [ ] **Step 1: Write the failing CSV exporter test**

Create `tests/export/__init__.py` (empty) and `tests/export/test_csv.py`:

```python
from io import StringIO

from innoinvest.export.csv import write_csv


def test_write_csv_emits_one_row_per_kpi_value():
    out = StringIO()
    write_csv(out, [
        {"category": "Demographics", "kpi_code": "pop_total", "kpi_name_en": "Total population",
         "unit": "persons", "period": "2025", "value": "57437",
         "source_code": "ins_tempo", "source_dataset_id": "POP107D",
         "source_url": "http://x/POP107D"},
        {"category": "Labor Market", "kpi_code": "gross_monthly_salary",
         "kpi_name_en": "Avg gross monthly earnings", "unit": "RON",
         "period": "2024", "value": "5800", "source_code": "ins_tempo",
         "source_dataset_id": "FOM104D", "source_url": "http://x/FOM104D"},
    ])
    body = out.getvalue()
    lines = body.strip().splitlines()
    assert lines[0].split(",")[0] == "category"
    assert "Floresti" not in body  # no location on this row; that's added by caller via filename
    assert "pop_total" in body
    assert "57437" in body
    assert "ins_tempo,POP107D" in body
```

- [ ] **Step 2: Run to confirm it fails**

```bash
pytest tests/export/test_csv.py -v
```

Expected: FAIL — `ImportError`.

- [ ] **Step 3: Implement the CSV exporter**

Create `src/innoinvest/export/__init__.py` (empty) and `src/innoinvest/export/csv.py`:

```python
import csv
from typing import IO, Iterable

FIELDS = [
    "category", "kpi_code", "kpi_name_en", "unit",
    "period", "value", "source_code", "source_dataset_id", "source_url",
]


def write_csv(out: IO[str], rows: Iterable[dict]) -> None:
    writer = csv.DictWriter(out, fieldnames=FIELDS, extrasaction="ignore")
    writer.writeheader()
    for r in rows:
        writer.writerow(r)
```

- [ ] **Step 4: Run to confirm it passes**

```bash
pytest tests/export/test_csv.py -v
```

Expected: PASS.

- [ ] **Step 5: Write the failing Word exporter test**

Create `tests/export/test_docx.py`:

```python
from pathlib import Path

from docx import Document

from innoinvest.export.docx import write_docx


def test_write_docx_produces_grouped_tables(tmp_path: Path):
    out = tmp_path / "out.docx"
    write_docx(out, location_name="Floresti", grouped_categories=[
        {"category": "Demographics", "kpis": [
            {"kpi_name_en": "Total population", "unit": "persons",
             "latest": {"period": "2025", "value": "57437",
                        "source_code": "ins_tempo", "source_dataset_id": "POP107D"}},
        ]},
    ])

    assert out.exists() and out.stat().st_size > 0
    doc = Document(str(out))
    text = "\n".join(p.text for p in doc.paragraphs)
    assert "Floresti" in text
    assert "Demographics" in text
    # The KPI row is in a table:
    table_text = "\n".join(c.text for t in doc.tables for r in t.rows for c in r.cells)
    assert "Total population" in table_text
    assert "57437" in table_text
    assert "POP107D" in table_text
```

- [ ] **Step 6: Run to confirm it fails**

```bash
pytest tests/export/test_docx.py -v
```

Expected: FAIL — `ImportError`.

- [ ] **Step 7: Implement the Word exporter**

Create `src/innoinvest/export/docx.py`:

```python
"""Render a grouped report into a .docx with one table per category."""
from __future__ import annotations

from pathlib import Path
from typing import Iterable

from docx import Document
from docx.shared import Pt


def write_docx(
    path: Path,
    *,
    location_name: str,
    grouped_categories: Iterable[dict],
) -> None:
    doc = Document()
    title = doc.add_heading(f"{location_name} — InnoINVest data report", level=1)
    title.style.font.size = Pt(18)

    for cat in grouped_categories:
        doc.add_heading(cat["category"], level=2)
        table = doc.add_table(rows=1, cols=4)
        table.style = "Light Grid"
        header = table.rows[0].cells
        header[0].text = "KPI"
        header[1].text = "Value"
        header[2].text = "Year"
        header[3].text = "Source"
        for kpi in cat["kpis"]:
            row = table.add_row().cells
            unit = kpi["unit"]
            latest = kpi["latest"]
            row[0].text = kpi["kpi_name_en"]
            row[1].text = _format_value(latest["value"], unit)
            row[2].text = latest["period"]
            row[3].text = _format_source(latest)
        doc.add_paragraph()

    doc.save(str(path))


def _format_value(value: str | None, unit: str) -> str:
    if value is None:
        return "—"
    suffix = {"EUR": " €", "RON": " RON", "percent": " %", "persons": ""}.get(unit, f" {unit}")
    return f"{value}{suffix}"


def _format_source(latest: dict) -> str:
    src = latest["source_code"].upper()
    if latest.get("source_dataset_id"):
        return f"{src} {latest['source_dataset_id']}"
    return src
```

- [ ] **Step 8: Run to confirm it passes**

```bash
pytest tests/export/test_docx.py -v
```

Expected: PASS.

- [ ] **Step 9: Wire export endpoints into the reports route**

Append to `src/innoinvest/api/routes/reports.py`:

```python
from io import StringIO
from tempfile import NamedTemporaryFile

from fastapi.responses import FileResponse, StreamingResponse

from ...export.csv import write_csv as write_csv_file
from ...export.docx import write_docx


@router.get("/report/{siruta_code}/export.csv")
def export_csv(siruta_code: str, db: Session = Depends(get_db)):
    body = get_report(siruta_code, format="flat", db=db)  # reuse logic
    out = StringIO()
    write_csv_file(out, body["rows"])
    out.seek(0)
    return StreamingResponse(
        iter([out.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="innoinvest-{siruta_code}.csv"'},
    )


@router.get("/report/{siruta_code}/export.docx")
def export_docx(siruta_code: str, db: Session = Depends(get_db)):
    body = get_report(siruta_code, format="grouped", db=db)
    with NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
        write_docx(
            tmp.name,
            location_name=body["location"]["name"],
            grouped_categories=body["categories"],
        )
        path = tmp.name
    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=f"innoinvest-{siruta_code}.docx",
    )
```

- [ ] **Step 10: Run the full API test suite**

```bash
pytest tests/api tests/export -v
```

Expected: all PASS.

- [ ] **Step 11: Manual verification end-to-end**

```bash
innoinvest serve --port 8000 &
sleep 2
curl -s -o /tmp/floresti.csv "http://localhost:8000/report/4324/export.csv" && head -5 /tmp/floresti.csv
curl -s -o /tmp/floresti.docx "http://localhost:8000/report/4324/export.docx"
file /tmp/floresti.docx
kill %1
```

Expected: CSV has header + rows; `file` reports `/tmp/floresti.docx: Microsoft Word 2007+`.

- [ ] **Step 12: Commit**

```bash
git add src/innoinvest/export/ src/innoinvest/api/routes/reports.py tests/export/
git commit -m "feat(api,export): CSV + Word export endpoints with provenance preserved"
```

---

## Phase 8 — Demo Polish

### Task 8.1: One-command demo via docker-compose

**Files:**
- Modify: `docker-compose.yml`
- Create: `Dockerfile.api`
- Create: `frontend/Dockerfile`
- Create: `README.md`

- [ ] **Step 1: Backend Dockerfile**

Create `Dockerfile.api`:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY pyproject.toml /app/
COPY src /app/src
RUN pip install --no-cache-dir -e .
COPY config /app/config
COPY data /app/data
CMD ["uvicorn", "innoinvest.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Frontend Dockerfile**

Create `frontend/Dockerfile`:

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY web .
ENV NEXT_PUBLIC_API_BASE=http://localhost:8000
RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
ENV NEXT_PUBLIC_API_BASE=http://localhost:8000
EXPOSE 3000
CMD ["npm", "start"]
```

- [ ] **Step 3: Extend `docker-compose.yml`**

Replace `docker-compose.yml` with:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: innoinvest
      POSTGRES_USER: innoinvest
      POSTGRES_PASSWORD: innoinvest
    ports:
      - "5433:5432"
    volumes:
      - db_data:/var/lib/postgresql/data
      - ./db/migrations:/docker-entrypoint-initdb.d:ro

  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    environment:
      DATABASE_URL: postgresql+psycopg://innoinvest:innoinvest@db:5432/innoinvest
    depends_on: [db]
    ports:
      - "8000:8000"

  seed:
    build:
      context: .
      dockerfile: Dockerfile.api
    environment:
      DATABASE_URL: postgresql+psycopg://innoinvest:innoinvest@db:5432/innoinvest
    depends_on: [db]
    command: ["sh", "-c", "innoinvest seed && innoinvest ingest"]
    restart: "no"

  web:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    depends_on: [api]
    ports:
      - "3000:3000"

volumes:
  db_data:
```

- [ ] **Step 4: Write `README.md` with demo instructions**

Create `README.md`:

```markdown
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

## Components

- `src/innoinvest/api/` — FastAPI HTTP layer
- `src/innoinvest/ingest/` — Eurostat + INS Tempo clients + runner
- `src/innoinvest/export/` — CSV + Word writers
- `config/kpis.yaml` — declarative KPI catalog (add KPIs without code changes)
- `data/siruta_nw_romania.csv` — seeded SIRUTA codes
- `frontend/` — Next.js frontend

## Dev setup

```
docker compose up -d db
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
innoinvest seed                # load SIRUTA
innoinvest ingest              # pull data from Eurostat + INS Tempo
innoinvest serve --port 8000   # API
cd web && npm install && npm run dev  # frontend
```

Tests:

```
pytest                 # unit + DB tests
pytest -m live         # opt-in: hits real Eurostat + INS Tempo
```

## Design

See `docs/superpowers/specs/2026-05-23-data-pipeline-design.md`.
```

- [ ] **Step 5: Bring up the full stack**

```bash
docker compose down -v
docker compose up --build -d
sleep 30  # give seed + ingest time to finish
docker compose logs seed | tail -10
curl -s http://localhost:8000/report/4324 | python -m json.tool | head -40
open http://localhost:3000
```

Expected: the `seed` container shows `inserted N locations` and `ingest complete`; the curl returns JSON with Floresti's population; the frontend renders the picker and report.

- [ ] **Step 6: Commit**

```bash
git add Dockerfile.api frontend/Dockerfile docker-compose.yml README.md
git commit -m "chore: one-command demo via docker compose + readme"
```

---

### Task 8.2: Expand SIRUTA seed to full NW Romania

**Files:**
- Modify: `data/siruta_nw_romania.csv`

- [ ] **Step 1: Download the official SIRUTA list and extract NW counties**

Run:
```bash
mkdir -p /tmp/siruta
curl -L -o /tmp/siruta/SIRUTA.xlsx \
  "https://www.recensamantromania.ro/wp-content/uploads/2022/06/SIRUTA_RPL2021.xlsx"
```

Convert the Excel to CSV with the columns we need (you can use a one-off Python script or open in Excel/Numbers). Filter rows to county codes belonging to the 6 NW counties: `1026` (Bihor), `2719` (Bistrița-Năsăud), `4017` (Cluj), `11724` (Maramureș), `14492` (Satu Mare), `17387` (Sălaj), plus all communes/cities whose `parent_siruta` is one of those.

Save as `data/siruta_nw_romania.csv`, replacing the starter version. Keep the same column shape:

```
siruta_code,name,type,parent_siruta,nuts_code
```

- [ ] **Step 2: Verify count**

```bash
wc -l data/siruta_nw_romania.csv
```

Expected: ~400-450 lines (6 counties + ~400 communes/cities + region + country).

- [ ] **Step 3: Re-seed and re-ingest**

```bash
docker compose down -v
docker compose up --build -d
sleep 60  # full ingestion takes longer at full scale
docker compose logs seed | tail -20
```

- [ ] **Step 4: Spot-check the report for another commune**

```bash
curl -s "http://localhost:8000/locations?q=hue" | python -m json.tool
curl -s "http://localhost:8000/report/4253" | python -m json.tool | head -30
```

Expected: Huedin appears and has population data.

- [ ] **Step 5: Commit**

```bash
git add data/siruta_nw_romania.csv
git commit -m "data: full SIRUTA seed for all six NW Romania counties (~400 communes)"
```

---

## Self-Review Checklist

After implementation, verify against the spec:

**Spec coverage** — every requirement traceable to a task:

| Spec section | Task(s) |
|---|---|
| §5 Architecture diagram | 0.1, 0.2, 1.1, 6.1, 6.2, 7.1, 7.2, 8.1 |
| §6 Data Model (5 tables + indexes + provenance fields) | 1.1 |
| §6 SIRUTA primary keys | 1.2, 8.2 |
| §6 `raw_payload` JSONB | 1.1, 3.1, 4.1 |
| §7 BaseClient ABC | 2.1 |
| §7 YAML KPI config | 2.1 |
| §7 Eurostat client (JSON-stat) | 4.1 |
| §7 INS Tempo client (REST) | 3.1 |
| §7 Nightly cron / manual refresh | 6.3 (CLI), 8.1 (compose service) |
| §7 Idempotent upserts | 5.1 |
| §7 Per-KPI error isolation + run_log | 5.1 |
| §8 Landing/picker screen | 7.1 |
| §8 15-category report view | 7.2 |
| §8 Flat-table tab | 7.2 |
| §8 Click-to-copy with citation | 7.2 |
| §8 Export Word + CSV | 7.3 |
| §8 Freshness badge | 7.2 |
| §9 Postgres + FastAPI + Next.js + Tailwind + shadcn + TanStack Table | 0.1, 0.2, 1.1, 6.1, 7.1, 7.2 |
| §9 docker-compose one-command demo | 8.1 |
| §2 inno.ro integration path | 6.1, 6.2 (OpenAPI + REST = integration-ready) |
| §2 AI-readiness (v2) | Out of scope for plan; schema supports it |

**Explicit non-goals (verify nothing snuck in):**
- ❌ Auth — not built ✓
- ❌ Compare mode — not built ✓
- ❌ Maps / OSM — not built ✓
- ❌ LLM narrative — not built ✓
- ❌ Mobile design — not built ✓

**Type consistency check:**
- `siruta_code` (TEXT/string) — consistent in `Location`, `KpiValue`, API responses, web types ✓
- `kpi_code` (TEXT/string) — consistent across `Kpi`, `KpiValue`, config, API, web ✓
- `ValueRow` field names match between `base.py`, both clients, and `runner._upsert_values` ✓
- `BaseClient.fetch(kpi, locations) -> list[ValueRow]` — same signature in Eurostat + INS Tempo + stubs ✓
- KpiConfig source blocks: both clients read `kpi.ins_tempo["matrix"|"dims"]` and `kpi.eurostat["dataset"|"filters"]` — matches YAML schema ✓
- API DTO `KpiDto.latest` and `history` arrays of `KpiValueDto` — consistent in reports.py and lib/api.ts ✓

**Placeholder scan:** plan contains no `TBD`, `TODO` (inside code) or "implement later" instructions. The only TODO is the **comment** in `data/siruta_nw_romania.csv` flagging that the starter seed is replaced in Task 8.2 — which is a known follow-up task, not a placeholder in the plan itself.

**No orphans:** every type, function, and config key used in a later task is defined in an earlier task.
