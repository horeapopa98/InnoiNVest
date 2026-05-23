from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..deps import get_db
from ...ingest.locations import normalize
from ...models import Location

router = APIRouter()


@router.get("/locations")
def search_locations(q: str = "", db: Session = Depends(get_db)):
    norm = normalize(q)
    if not norm:
        return []
    rows = (
        db.query(Location)
        .filter(Location.name_normalized.like(f"{norm}%"))
        .order_by(Location.name)
        .limit(20)
        .all()
    )
    return [_serialize(loc) for loc in rows]


@router.get("/locations/{siruta_code}")
def get_location(siruta_code: str, db: Session = Depends(get_db)):
    loc = db.get(Location, siruta_code)
    if loc is None:
        raise HTTPException(status_code=404, detail=f"location {siruta_code} not found")
    return _serialize(loc)


def _serialize(loc: Location) -> dict:
    return {
        "siruta_code": loc.siruta_code,
        "name": loc.name,
        "type": loc.type,
        "parent_siruta": loc.parent_siruta,
        "nuts_code": loc.nuts_code,
        "population_latest": loc.population_latest,
    }
