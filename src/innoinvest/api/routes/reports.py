from collections import defaultdict
from functools import lru_cache
from io import StringIO
from pathlib import Path
from tempfile import NamedTemporaryFile

import yaml
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from ..deps import get_db
from ...models import Kpi, KpiValue, Location
from ...export.csv import write_csv as write_csv_file
from ...export.docx import write_docx

router = APIRouter()


@lru_cache(maxsize=1)
def _load_institutions() -> dict[str, list[dict]]:
    """Load institutions catalog from config/institutions.yaml, grouped by siruta_code."""
    path = Path(__file__).resolve().parents[4] / "config" / "institutions.yaml"
    if not path.exists():
        return {}
    with open(path, encoding="utf-8") as fh:
        raw = yaml.safe_load(fh) or []
    grouped: dict[str, list[dict]] = defaultdict(list)
    for entry in raw:
        grouped[entry["siruta_code"]].append({
            "name": entry["name"],
            "type": entry["type"],
            "url": entry.get("url"),
        })
    return dict(grouped)


@router.get("/report/{siruta_code}")
def get_report(
    siruta_code: str,
    format: str = Query("grouped", pattern="^(grouped|flat)$"),
    db: Session = Depends(get_db),
):
    loc = db.get(Location, siruta_code)
    if loc is None:
        raise HTTPException(status_code=404, detail=f"location {siruta_code} not found")

    # Walk up the hierarchy (commune/city → county → region → country) so a
    # location inherits every KPI available at a coarser geography.
    candidate_siruta = [siruta_code]
    cursor = loc
    seen = {siruta_code}
    while cursor and cursor.parent_siruta and cursor.parent_siruta not in seen:
        candidate_siruta.append(cursor.parent_siruta)
        seen.add(cursor.parent_siruta)
        cursor = db.get(Location, cursor.parent_siruta)

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
        # Prefer the latest period that actually has a value (Eurostat returns
        # NaN/null for the most recent year before data is finalized).
        latest_idx = next(
            (i for i, v in enumerate(values) if v["value"] is not None),
            0,
        )
        latest = values[latest_idx]
        history = [v for i, v in enumerate(values) if i != latest_idx]
        grouped[meta["category"]].append({
            **meta,
            "latest": latest,
            "history": history,
        })

    # Pull institutions from any siruta in the hierarchy walk (typically the county).
    inst_catalog = _load_institutions()
    institutions: list[dict] = []
    for sc in candidate_siruta:
        for inst in inst_catalog.get(sc, []):
            institutions.append({**inst, "for_siruta": sc})

    return {
        "location": _serialize_loc(loc),
        "categories": [
            {"category": cat, "kpis": kpis} for cat, kpis in grouped.items()
        ],
        "institutions": institutions,
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
