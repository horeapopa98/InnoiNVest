from decimal import Decimal
from pathlib import Path

import pytest
import responses

from innoinvest.ingest.base import KpiConfig
from innoinvest.ingest.eurostat import EurostatClient
from innoinvest.models import Location

FIXTURE = Path(__file__).parent / "fixtures" / "eurostat_nama_10r_3gdp.json"


def make_kpi() -> KpiConfig:
    return KpiConfig(
        kpi_code="gdp_per_capita",
        name_en="GDP per capita",
        name_ro="PIB pe locuitor",
        unit="EUR",
        category="Macro-Economy",
        aggregation_level="county",
        description="",
        eurostat={
            "dataset": "nama_10r_3gdp",
            "filters": {"unit": "EUR_HAB"},
            "geo_level": "nuts3",
        },
    )


def make_locations() -> list[Location]:
    return [
        Location(
            siruta_code="4017", name="Cluj", name_normalized="cluj",
            type="county", parent_siruta="RO11", nuts_code="RO113",
        ),
    ]


@responses.activate
def test_fetch_returns_value_row_per_period():
    body = FIXTURE.read_text()
    responses.add(
        responses.GET,
        "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10r_3gdp",
        body=body, content_type="application/json", status=200,
    )

    client = EurostatClient(
        base_url="https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data"
    )
    rows = client.fetch(make_kpi(), make_locations())

    assert len(rows) >= 1
    assert all(r.source_code == "eurostat" for r in rows)
    assert all(r.source_dataset_id == "nama_10r_3gdp" for r in rows)
    assert all(r.siruta_code == "4017" for r in rows)  # mapped from nuts_code
    assert all(isinstance(r.value, Decimal) for r in rows)
    assert all(len(r.period) == 4 and r.period.isdigit() for r in rows)


@pytest.mark.live
def test_live_cluj_gdp_per_capita():
    from innoinvest.settings import settings
    client = EurostatClient(base_url=settings.eurostat_base_url)
    rows = client.fetch(make_kpi(), make_locations())
    assert any(r.value and r.value > 5000 for r in rows), (
        "expected positive GDP per capita for Cluj"
    )
