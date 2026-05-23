"""Orchestrates: load KPIs → for each KPI, pick the right client → fetch → upsert.

Always writes a `run_log` row, even on partial failure.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Callable, Mapping

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from ..models import Kpi, KpiValue, Location, RunLog, Source
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

    def run(self) -> None:
        session = self._session_factory()
        run = RunLog(started_at=datetime.now(timezone.utc), kpis_fetched=0, kpis_failed=0)
        session.add(run)
        session.commit()

        try:
            self._upsert_sources(session)
            self._upsert_kpi_catalog(session)
            errors: list[dict] = []

            locations = session.query(Location).all()
            for kpi in self._kpis:
                applicable = self._locations_for_kpi(kpi, locations)
                client_name = (
                    "ins_tempo" if kpi.ins_tempo
                    else "eurostat" if kpi.eurostat
                    else None
                )
                if client_name is None or client_name not in self._clients:
                    errors.append({"kpi": kpi.kpi_code, "reason": "no client configured"})
                    run.kpis_failed += 1
                    continue
                client = self._clients[client_name]
                try:
                    rows = client.fetch(kpi, applicable)
                except Exception as exc:  # noqa: BLE001 - want to log + continue
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

    # ------------------------------------------------------------------ helpers
    _SOURCE_REGISTRY: dict[str, dict] = {
        "eurostat": {
            "name": "Eurostat",
            "homepage_url": "https://ec.europa.eu/eurostat",
            "license": "CC BY 4.0",
        },
        "ins_tempo": {
            "name": "INS TEMPO (Romanian National Institute of Statistics)",
            "homepage_url": "http://statistici.insse.ro:8077/tempo-ins",
            "license": None,
        },
    }

    def _upsert_sources(self, session: Session) -> None:
        """Ensure every client that may produce rows has a row in source."""
        for code, client in self._clients.items():
            meta = self._SOURCE_REGISTRY.get(code, {"name": code, "homepage_url": None, "license": None})
            stmt = pg_insert(Source).values(
                source_code=code,
                name=meta["name"],
                homepage_url=meta.get("homepage_url"),
                license=meta.get("license"),
            ).on_conflict_do_nothing(index_elements=["source_code"])
            session.execute(stmt)
        session.commit()

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
