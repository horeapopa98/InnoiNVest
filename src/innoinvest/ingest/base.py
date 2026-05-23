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
