from io import StringIO

from innoinvest.export.csv import write_csv


def test_write_csv_emits_one_row_per_kpi_value():
    out = StringIO()
    write_csv(out, [
        {"category": "Demographics", "kpi_code": "pop_total", "kpi_name_en": "Total population",
         "unit": "persons", "period": "2025", "value": "57437",
         "source_code": "ins_tempo", "source_dataset_id": "POP107D",
         "source_url": "http://x/POP107D"},
        {"category": "Labor Market", "kpi_code": "gross_monthly_salary",
         "kpi_name_en": "Avg gross monthly earnings", "unit": "RON",
         "period": "2024", "value": "5800", "source_code": "ins_tempo",
         "source_dataset_id": "FOM104D", "source_url": "http://x/FOM104D"},
    ])
    body = out.getvalue()
    lines = body.strip().splitlines()
    assert lines[0].split(",")[0] == "category"
    assert "Floresti" not in body  # location is in the filename, not rows
    assert "pop_total" in body
    assert "57437" in body
    assert "ins_tempo,POP107D" in body
