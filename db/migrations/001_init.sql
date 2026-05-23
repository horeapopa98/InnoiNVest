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
