"""SQLAlchemy engine, session, and base classes."""
from __future__ import annotations

from sqlalchemy import create_engine, text
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


def ensure_pdf_hash_schema() -> None:
    """Add ``cases.pdf_hash`` when upgrading an existing DB (create_all does not ALTER)."""
    import hashlib
    from pathlib import Path

    from sqlalchemy import inspect

    insp = inspect(engine)
    if not insp.has_table("cases"):
        return
    if "pdf_hash" in {c["name"] for c in insp.get_columns("cases")}:
        return

    is_sqlite = "sqlite" in str(engine.url).lower()
    print("[database] Schema upgrade: add cases.pdf_hash and backfill from PDF files…")

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE cases ADD COLUMN pdf_hash VARCHAR(64)"))

    session = SessionLocal()
    try:
        rows = session.execute(text("SELECT id, pdf_path FROM cases")).all()
        for row in rows:
            rid, pdf_path = row[0], row[1]
            p = Path(pdf_path)
            if not p.is_file():
                raise RuntimeError(
                    f"Migration failed: PDF missing for case id={rid}: {pdf_path}"
                )
            digest = hashlib.sha256(p.read_bytes()).hexdigest()
            session.execute(
                text("UPDATE cases SET pdf_hash = :h WHERE id = :id"),
                {"h": digest, "id": rid},
            )
        session.commit()
    finally:
        session.close()

    with engine.begin() as conn:
        conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_cases_pdf_hash ON cases (pdf_hash)"
            )
        )
        if not is_sqlite:
            conn.execute(text("ALTER TABLE cases ALTER COLUMN pdf_hash SET NOT NULL"))

    print("[database] pdf_hash upgrade finished.")


def init_db() -> None:
    """Create all tables. Called on FastAPI startup."""
    from models import Base as ModelsBase  # noqa: F401  (ensures models import)

    Base.metadata.create_all(bind=engine)
    ensure_pdf_hash_schema()
