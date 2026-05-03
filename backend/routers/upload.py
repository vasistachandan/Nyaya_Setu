"""POST /api/upload — accept a PDF, persist it, create a pending case row."""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from models import Case, CaseStatus
from schemas import UploadResponse
from services.pdf_service import save_uploaded_pdf

router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    abs_path, stored_filename = save_uploaded_pdf(file.file, file.filename)

    case = Case(
        pdf_path=abs_path,
        pdf_filename=file.filename,
        status=CaseStatus.pending,
    )
    db.add(case)
    db.commit()
    db.refresh(case)

    return UploadResponse(
        case_id=case.id, pdf_filename=stored_filename, status=case.status.value
    )
