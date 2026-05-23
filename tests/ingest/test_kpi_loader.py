from pathlib import Path

import pytest

from innoinvest.ingest.base import KpiConfig
from innoinvest.ingest.kpi_loader import load_kpis


def test_load_kpis_parses_all_entries():
    kpis = load_kpis(Path("config/kpis.yaml"))
    assert len(kpis) >= 5
    codes = [k.kpi_code for k in kpis]
    assert "pop_total" in codes
    assert "gdp_per_capita" in codes


def test_load_kpis_returns_kpiconfig_with_source_blocks():
    kpis = {k.kpi_code: k for k in load_kpis(Path("config/kpis.yaml"))}

    pop = kpis["pop_total"]
    assert isinstance(pop, KpiConfig)
    assert pop.aggregation_level == "commune"
    assert pop.ins_tempo is not None
    assert pop.ins_tempo["matrix"] == "POP107D"
    assert pop.eurostat is None

    gdp = kpis["gdp_per_capita"]
    assert gdp.eurostat is not None
    assert gdp.eurostat["dataset"] == "nama_10r_3gdp"
    assert gdp.ins_tempo is None


def test_load_kpis_rejects_invalid_aggregation_level(tmp_path: Path):
    bad = tmp_path / "bad.yaml"
    bad.write_text(
        "- kpi_code: x\n  name_en: x\n  name_ro: x\n  unit: x\n"
        "  category: x\n  aggregation_level: planet\n  description: x\n"
    )
    with pytest.raises(ValueError, match="aggregation_level"):
        load_kpis(bad)
