"""Delete all cases, related database rows, and each case's PDF file on disk.

Run from the backend directory:
    python clear_data.py
"""
from __future__ import annotations

from pathlib import Path

from database import SessionLocal, init_db
from models import Case


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        cases = db.query(Case).all()
        paths = [Path(c.pdf_path) for c in cases]
        n = len(cases)
        for c in cases:
            db.delete(c)
        db.commit()
        removed = 0
        for p in paths:
            try:
                if p.is_file():
                    p.unlink()
                    removed += 1
            except OSError:
                pass
        print(f"Removed {n} case(s) and {removed} PDF file(s).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
