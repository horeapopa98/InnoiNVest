from sqlalchemy import inspect

from innoinvest.db import engine


def test_all_tables_exist():
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    assert tables >= {"source", "location", "kpi", "kpi_value", "run_log"}, (
        f"missing tables; have: {tables}"
    )
