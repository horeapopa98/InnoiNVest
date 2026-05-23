"""Seed the `location` table from a SIRUTA CSV file."""
from __future__ import annotations

import csv
import unicodedata
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Location


def normalize(name: str) -> str:
    """Lowercase + strip Romanian diacritics for search."""
    stripped = unicodedata.normalize("NFKD", name)
    no_marks = "".join(ch for ch in stripped if not unicodedata.combining(ch))
    return no_marks.lower().strip()


def seed_locations(session: Session, csv_path: Path) -> int:
    """Insert any new locations from `csv_path`. Returns count of newly inserted rows."""
    existing = {row[0] for row in session.execute(select(Location.siruta_code)).all()}
    inserted = 0

    with open(csv_path, newline="", encoding="utf-8") as fh:
        # Skip lines that start with '#' (comment convention).
        rows = [line for line in fh if not line.startswith("#")]

    reader = csv.DictReader(rows)
    for row in reader:
        code = row["siruta_code"].strip()
        if not code or code in existing:
            continue
        loc = Location(
            siruta_code=code,
            name=row["name"].strip(),
            name_normalized=normalize(row["name"]),
            type=row["type"].strip(),
            parent_siruta=(row.get("parent_siruta") or None) or None,
            nuts_code=(row.get("nuts_code") or None) or None,
        )
        session.add(loc)
        inserted += 1

    session.commit()
    return inserted
