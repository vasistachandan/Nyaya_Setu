"""SQLAlchemy engine, session, and base classes."""
from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from config import settings


def _build_engine():
    """Create a DB engine. Falls back to a local SQLite file if Postgres is not
    reachable, so the project can still be demoed without Docker.
    """
    url = settings.database_url
    try:
        engine = create_engine(url, pool_pre_ping=True, future=True)
        # Probe a connection to ensure the database is actually reachable.
        with engine.connect() as conn:  # pragma: no cover - smoke check
            conn.execute_options(no_parameters=True)
        return engine
    except Exception as exc:  # pragma: no cover - fallback path
        print(
            f"[database] Postgres unreachable ({exc!s}). "
            "Falling back to local SQLite at ./storage/ccms.sqlite"
        )
        sqlite_url = "sqlite:///./storage/ccms.sqlite"
        from pathlib import Path
        Path("./storage").mkdir(parents=True, exist_ok=True)
        return create_engine(
            sqlite_url, connect_args={"check_same_thread": False}, future=True
        )


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables. Called on FastAPI startup."""
    from models import Base as ModelsBase  # noqa: F401  (ensures models import)

    Base.metadata.create_all(bind=engine)
