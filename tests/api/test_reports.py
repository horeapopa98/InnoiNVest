from datetime import datetime, timezone
from decimal import Decimal

import pytest

from innoinvest.db import SessionLocal
from innoinvest.models import Source, Kpi, KpiValue, Location


@pytest.fixture
def populated_client(client):
    """Extend the conftest `client` fixture with KPI catalog + values for Floresti.

    Note: the conftest fixture seeds Floresti (4324) with parent_siruta=None.
    To exercise the county-level KPI flow, we additionally insert Cluj (4017)
    here and re-point Floresti at it.
    """
    s = SessionLocal()
    # Need Cluj county for the parent_siruta join in county-level KPIs.
    cluj = Location(
        siruta_code="4017", name="Cluj", name_normalized="cluj",
        type="county", parent_siruta=None, nuts_code="RO113",
    )
    s.add(cluj)
    s.commit()
    # Re-point Floresti to Cluj as parent.
    floresti = s.get(Location, "4324")
    floresti.parent_siruta = "4017"
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
    s.commit()  # flush source + kpi first so FK constraints are satisfied
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
    assert pop["latest"]["period"] == "2025"
    assert pop["latest"]["value"] == "57437"
    assert pop["latest"]["source_code"] == "ins_tempo"
    assert pop["latest"]["source_dataset_id"] == "POP107D"
    assert pop["latest"]["source_url"].endswith("POP107D")
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
