import json
from decimal import Decimal
from pathlib import Path

import pytest
import responses

from innoinvest.ingest.base import KpiConfig
from innoinvest.ingest.ins_tempo import InsTempoClient
from innoinvest.models import Location

FIXTURE = Path(__file__).parent / "fixtures" / "ins_tempo_POP107D.json"


def make_kpi() -> KpiConfig:
    return KpiConfig(
        kpi_code="pop_total",
        name_en="Total population",
        name_ro="Populatia totala",
        unit="persons",
        category="Demographics",
        aggregation_level="commune",
        description="",
        ins_tempo={
            "matrix": "POP107D",
            "dims": {"SEX": "Total", "AGE": "Total", "URBAN_RURAL": "Total"},
            "geo_level": "lau2",
        },
    )


def make_locations() -> list[Location]:
    return [
        Location(
            siruta_code="4324", name="Floresti", name_normalized="floresti",
            type="commune", parent_siruta="4017", nuts_code="RO113",
        ),
    ]


@responses.activate
def test_fetch_returns_one_value_row_per_year():
    fixture_body = FIXTURE.read_text()
    responses.add(
        responses.POST,
        "http://statistici.insse.ro:8077/tempo-ins/matrix/POP107D",
        body=fixture_body,
        content_type="application/json",
        status=200,
    )

    client = InsTempoClient(base_url="http://statistici.insse.ro:8077/tempo-ins")
    rows = client.fetch(make_kpi(), make_locations())

    assert all(r.siruta_code == "4324" for r in rows)
    assert all(r.kpi_code == "pop_total" for r in rows)
    assert all(r.source_code == "ins_tempo" for r in rows)
    assert all(r.source_dataset_id == "POP107D" for r in rows)
    assert all(r.source_url and r.source_url.endswith("POP107D") for r in rows)
    for r in rows:
        assert isinstance(r.value, Decimal)
        assert len(r.period) == 4 and r.period.isdigit()


@responses.activate
def test_fetch_filters_to_requested_locations_only():
    body = {
        "matrixName": "POP107D",
        "dimensions": [
            {"name": "Localitate", "options": [
                {"code": "4324", "label": "FLORESTI"},
                {"code": "9999", "label": "OTHER"},
            ]},
            {"name": "Ani", "options": [{"code": "2025", "label": "Anul 2025"}]},
        ],
        "dataPoints": [
            {"Localitate": "4324", "Ani": "2025", "value": 57437},
            {"Localitate": "9999", "Ani": "2025", "value": 1},
        ],
    }
    responses.add(
        responses.POST,
        "http://statistici.insse.ro:8077/tempo-ins/matrix/POP107D",
        body=json.dumps(body),
        content_type="application/json",
        status=200,
    )
    client = InsTempoClient(base_url="http://statistici.insse.ro:8077/tempo-ins")
    rows = client.fetch(make_kpi(), make_locations())

    assert [r.siruta_code for r in rows] == ["4324"]
    assert rows[0].value == Decimal("57437")
    assert rows[0].period == "2025"


@responses.activate
def test_fetch_raises_for_non_200():
    responses.add(
        responses.POST,
        "http://statistici.insse.ro:8077/tempo-ins/matrix/POP107D",
        status=503,
    )
    client = InsTempoClient(base_url="http://statistici.insse.ro:8077/tempo-ins")
    with pytest.raises(RuntimeError, match="503"):
        client.fetch(make_kpi(), make_locations())


@pytest.mark.live
def test_live_floresti_population():
    """Hit the real INS Tempo endpoint. Run with: pytest -m live."""
    from innoinvest.settings import settings
    client = InsTempoClient(base_url=settings.ins_tempo_base_url)
    rows = client.fetch(make_kpi(), make_locations())
    assert any(r.siruta_code == "4324" and r.value and r.value > 50000 for r in rows), (
        "expected Floresti population > 50,000 in at least one year"
    )
