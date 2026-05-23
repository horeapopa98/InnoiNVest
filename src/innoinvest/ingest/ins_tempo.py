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
