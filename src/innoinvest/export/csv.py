import csv
from typing import IO, Iterable

FIELDS = [
    "category", "kpi_code", "kpi_name_en", "unit",
    "period", "value", "source_code", "source_dataset_id", "source_url",
]


def write_csv(out: IO[str], rows: Iterable[dict]) -> None:
    writer = csv.DictWriter(out, fieldnames=FIELDS, extrasaction="ignore")
    writer.writeheader()
    for r in rows:
        writer.writerow(r)
