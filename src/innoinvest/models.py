from __future__ import annotations
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    BigInteger, ForeignKey, Integer, Numeric, String, TIMESTAMP, UniqueConstraint, func
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


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
    fetched_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )
    raw_payload: Mapped[Any | None] = mapped_column(JSONB)


class RunLog(Base):
    __tablename__ = "run_log"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    started_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )
    finished_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    source_code: Mapped[str | None] = mapped_column(String, ForeignKey("source.source_code"))
    kpis_fetched: Mapped[int] = mapped_column(Integer, default=0)
    kpis_failed: Mapped[int] = mapped_column(Integer, default=0)
    error_summary: Mapped[Any | None] = mapped_column(JSONB)
