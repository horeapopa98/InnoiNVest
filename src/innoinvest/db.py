from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from .settings import settings

engine = create_engine(settings.database_url, future=True, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


def get_session() -> Session:
    return SessionLocal()
