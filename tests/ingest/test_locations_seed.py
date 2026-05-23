import csv
from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from innoinvest.db import SessionLocal, engine
from innoinvest.models import Base, Location
from innoinvest.ingest.locations import seed_locations


@pytest.fixture
def db():
    """Reset the location table for each test using TRUNCATE CASCADE."""
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE location CASCADE"))
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()


def test_seed_locations_loads_all_rows(db: Session, tmp_path: Path):
    csv_path = tmp_path / "siruta.csv"
    csv_path.write_text(
        "siruta_code,name,type,parent_siruta,nuts_code\n"
        "RO,Romania,country,,RO\n"
        "4017,Cluj,county,,RO113\n"
        "4324,Floresti,commune,4017,RO113\n"
    )
    inserted = seed_locations(db, csv_path)

    assert inserted == 3
    floresti = db.get(Location, "4324")
    assert floresti is not None
    assert floresti.name == "Floresti"
    assert floresti.name_normalized == "floresti"
    assert floresti.type == "commune"
    assert floresti.parent_siruta == "4017"
    assert floresti.nuts_code == "RO113"


def test_seed_locations_skips_comment_lines(db: Session, tmp_path: Path):
    csv_path = tmp_path / "siruta.csv"
    csv_path.write_text(
        "# this is a comment\n"
        "siruta_code,name,type,parent_siruta,nuts_code\n"
        "RO,Romania,country,,RO\n"
    )
    assert seed_locations(db, csv_path) == 1


def test_seed_locations_is_idempotent(db: Session, tmp_path: Path):
    csv_path = tmp_path / "siruta.csv"
    csv_path.write_text(
        "siruta_code,name,type,parent_siruta,nuts_code\n"
        "RO,Romania,country,,RO\n"
    )
    seed_locations(db, csv_path)
    inserted_second = seed_locations(db, csv_path)
    assert inserted_second == 0
    assert db.query(Location).count() == 1
