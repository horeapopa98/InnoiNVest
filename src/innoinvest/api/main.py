from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes.locations import router as locations_router
from .routes.reports import router as reports_router


def create_app() -> FastAPI:
    app = FastAPI(title="InnoINVest API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_methods=["GET"],
        allow_headers=["*"],
    )
    app.include_router(locations_router)
    app.include_router(reports_router)
    return app


app = create_app()
