"""Parse the declarative KPI catalog from YAML into `KpiConfig` objects."""
from __future__ import annotations

from pathlib import Path

import yaml

from .base import KpiConfig

_VALID_AGG_LEVELS = {"commune", "county", "region", "country"}


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
