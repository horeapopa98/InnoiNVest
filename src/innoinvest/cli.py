"""Typer CLI: innoinvest seed | ingest | serve."""
from __future__ import annotations

from pathlib import Path

import typer
import uvicorn

from .db import SessionLocal
from .ingest.eurostat import EurostatClient
from .ingest.ins_tempo import InsTempoClient
from .ingest.kpi_loader import load_kpis
from .ingest.locations import seed_locations
from .ingest.runner import IngestionRunner
from .settings import settings

app = typer.Typer(help="InnoINVest backend CLI")


@app.command()
def seed(
    csv_path: Path = typer.Option(Path("data/siruta_nw_romania.csv"), "--csv"),
) -> None:
    """Seed the location table from a SIRUTA CSV."""
    with SessionLocal() as s:
        n = seed_locations(s, csv_path)
        typer.echo(f"inserted {n} locations")


@app.command()
def ingest(
    config_path: Path = typer.Option(Path("config/kpis.yaml"), "--config"),
) -> None:
    """Fetch every configured KPI and upsert into kpi_value."""
    kpis = load_kpis(config_path)
    clients = {
        "ins_tempo": InsTempoClient(base_url=settings.ins_tempo_base_url),
        "eurostat": EurostatClient(base_url=settings.eurostat_base_url),
    }
    runner = IngestionRunner(
        session_factory=lambda: SessionLocal(),
        clients=clients,
        kpis=kpis,
    )
    runner.run()
    typer.echo("ingest complete")


@app.command()
def serve(host: str = "0.0.0.0", port: int = 8000) -> None:
    """Start the FastAPI server."""
    uvicorn.run("innoinvest.api.main:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    app()
