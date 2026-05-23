"""Eurostat dissemination API client (JSON-stat 2.0)."""
from __future__ import annotations

import math
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
        # Use naming='id' so columns are dimension codes (geo, time, unit, …)
        # rather than human-readable labels which vary by language.
        df = ds.write("dataframe", naming="id")

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
                    value=(
                        Decimal(str(value))
                        if value is not None and not (isinstance(value, float) and math.isnan(value))
                        else None
                    ),
                    source_code=self.name,
                    source_dataset_id=dataset,
                    source_url=resp.url,
                    raw_payload=record,
                )
            )
        return rows
