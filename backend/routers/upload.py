"""POST /api/upload — accept a PDF, persist it, create a pending case row."""
from __future__ import annotations

import hashlib

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from models import Case, CaseStatus
from schemas import UploadResponse
from services.pdf_service import save_pdf_from_bytes

router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file.")

    pdf_hash = hashlib.sha256(contents).hexdigest()

    existing = db.query(Case).filter(Case.pdf_hash == pdf_hash).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Document already exists.",
        )

    abs_path, _ = save_pdf_from_bytes(contents, pdf_hash)

    case = Case(
        pdf_path=abs_path,
        pdf_filename=file.filename,
        pdf_hash=pdf_hash,
        status=CaseStatus.pending,
    )
    db.add(case)
    db.commit()
    db.refresh(case)

    return UploadResponse(
        case_id=case.id, pdf_filename=file.filename, status=case.status.value
    )
