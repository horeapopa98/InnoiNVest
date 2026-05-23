import pytest
from fastapi.testclient import TestClient

from innoinvest.api.main import create_app
from innoinvest.db import SessionLocal, engine
from innoinvest.models import Base, Location


@pytest.fixture
def client():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    s = SessionLocal()
    for loc in [
        Location(siruta_code="4324", name="Floresti", name_normalized="floresti",
                 type="commune", parent_siruta=None, nuts_code="RO113"),
        Location(siruta_code="4253", name="Huedin", name_normalized="huedin",
                 type="commune", parent_siruta=None, nuts_code="RO113"),
        Location(siruta_code="4030", name="Cluj-Napoca", name_normalized="cluj-napoca",
                 type="city", parent_siruta=None, nuts_code="RO113"),
    ]:
        s.add(loc)
    s.commit()
    s.close()
    return TestClient(create_app())
