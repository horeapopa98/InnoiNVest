from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from innoinvest.db import SessionLocal, engine
from innoinvest.models import Base, Location, Source, Kpi, KpiValue, RunLog
from innoinvest.ingest.base import BaseClient, KpiConfig, ValueRow
from innoinvest.ingest.runner import IngestionRunner


@pytest.fixture
def db():
    # Drop in FK-safe order; recreate everything.
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    s = SessionLocal()
    s.add(Source(source_code="ins_tempo", name="INS Tempo"))
    s.add(Source(source_code="eurostat", name="Eurostat"))
    s.add(Location(
        siruta_code="4324", name="Floresti", name_normalized="floresti",
        type="commune", parent_siruta=None, nuts_code="RO113",
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

    def __init__(self, rows):
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
    assert db.query(Kpi).filter_by(kpi_code="pop_total").one()
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
