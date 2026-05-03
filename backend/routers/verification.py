"""Cases list + verify endpoints (approve / edit / reject)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import desc
from sqlalchemy.orm import Session

from database import get_db
from models import (
    ActionPlan,
    Case,
    CaseStatus,
    Extraction,
    ReviewerAction,
    VerificationLog,
)
from schemas import (
    CaseFull,
    CaseSummary,
    ExtractionPayload,
    PdfSourceRef,
    VerificationRequest,
)

router = APIRouter(prefix="/api", tags=["verify"])


def _to_summary(case: Case) -> CaseSummary:
    plan = case.action_plan
    extraction = case.extraction

    action_required = None
    if plan:
        bits = []
        if plan.compliance_required:
            bits.append("Compliance")
        if plan.appeal_recommended:
            bits.append("Appeal")
        action_required = " + ".join(bits) or "Review only"

    nearest = None
    if plan and plan.key_dates:
        future_dates = sorted(
            [d for d in plan.key_dates if d.get("date")], key=lambda d: d.get("date") or ""
        )
        if future_dates:
            nearest = future_dates[0].get("date")

    overall_conf = 0.0
    if extraction and isinstance(extraction.confidence_scores, dict):
        overall_conf = float(extraction.confidence_scores.get("overall") or 0.0)

    return CaseSummary(
        id=case.id,
        case_number=case.case_number,
        court_name=case.court_name,
        judgment_date=case.judgment_date,
        pdf_filename=case.pdf_filename,
        status=case.status.value,
        uploaded_at=case.uploaded_at,
        overall_confidence=overall_conf,
        summary=extraction.summary if extraction else None,
        action_required=action_required,
        responsible_departments=(plan.responsible_departments or []) if plan else [],
        nearest_deadline=nearest,
    )


@router.get("/cases", response_model=list[CaseSummary])
def list_cases(
    status: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Case).order_by(desc(Case.uploaded_at))
    if status:
        try:
            query = query.filter(Case.status == CaseStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status filter")
    return [_to_summary(c) for c in query.all()]


def _summary_src_from_extraction(ext: Extraction | None) -> dict | None:
    if not ext or not ext.confidence_scores:
        return None
    raw = ext.confidence_scores.get("summary_src")
    if not isinstance(raw, dict):
        return None
    try:
        ref = PdfSourceRef.model_validate(raw)
        if not (ref.quote or "").strip() and ref.page <= 0:
            return None
        return ref.model_dump(exclude_none=True)
    except Exception:
        return None


@router.get("/cases/{case_id}", response_model=CaseFull)
def get_case(case_id: int, db: Session = Depends(get_db)):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    summary = _to_summary(case)
    extraction_payload: ExtractionPayload | None = None

    if case.extraction or case.action_plan:
        ext = case.extraction
        plan = case.action_plan
        extraction_payload = ExtractionPayload.model_validate(
            {
                "case_details": (ext.case_details if ext else {}) or {},
                "parties": (ext.parties_involved if ext else {}) or {},
                "key_directions": (ext.key_directions if ext else []) or [],
                "timelines": (ext.timelines if ext else []) or [],
                "action_plan": {
                    "compliance_required": plan.compliance_required if plan else False,
                    "compliance_details": (plan.compliance_details if plan else "") or "",
                    "appeal_recommended": plan.appeal_recommended if plan else False,
                    "appeal_rationale": (plan.appeal_rationale if plan else "") or "",
                    "limitation_period": (plan.limitation_period if plan else "") or "",
                    "responsible_departments": (plan.responsible_departments if plan else []) or [],
                    "nature_of_action": (plan.nature_of_action if plan else "") or "",
                    "key_dates": (plan.key_dates if plan else []) or [],
                },
                "overall_confidence": (
                    (ext.confidence_scores or {}).get("overall", 0.0) if ext else 0.0
                ),
                "summary": (ext.summary if ext else "") or "",
                "summary_src": _summary_src_from_extraction(ext),
            }
        )

    return CaseFull(case=summary, extraction=extraction_payload)


@router.get("/cases/{case_id}/pdf")
def get_case_pdf(case_id: int, db: Session = Depends(get_db)):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return FileResponse(
        case.pdf_path,
        media_type="application/pdf",
        filename=case.pdf_filename,
        headers={"Cache-Control": "private, max-age=300"},
    )


@router.post("/cases/{case_id}/verify", response_model=CaseFull)
def verify_case(
    case_id: int,
    body: VerificationRequest,
    db: Session = Depends(get_db),
):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    try:
        action = ReviewerAction(body.action)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid action")

    edited_fields_payload: dict = {}

    if action in (ReviewerAction.approved, ReviewerAction.edited):
        if body.edited_payload is None and action == ReviewerAction.edited:
            raise HTTPException(
                status_code=400, detail="edited_payload required when editing"
            )

        if body.edited_payload is not None:
            payload = body.edited_payload
            extraction = case.extraction or Extraction(case_id=case.id)
            extraction.case_details = payload.case_details.model_dump()
            extraction.parties_involved = payload.parties.model_dump()
            extraction.key_directions = [d.model_dump() for d in payload.key_directions]
            extraction.timelines = [t.model_dump() for t in payload.timelines]
            extraction.summary = payload.summary
            extraction.confidence_scores = {
                "overall": payload.overall_confidence,
                "per_direction": [d.confidence for d in payload.key_directions],
            }
            if payload.summary_src and (
                (payload.summary_src.quote or "").strip() or payload.summary_src.page > 0
            ):
                extraction.confidence_scores["summary_src"] = (
                    payload.summary_src.model_dump(exclude_none=True)
                )
            db.add(extraction)

            plan = case.action_plan or ActionPlan(case_id=case.id)
            ap = payload.action_plan
            plan.compliance_required = bool(ap.compliance_required)
            plan.compliance_details = ap.compliance_details
            plan.appeal_recommended = bool(ap.appeal_recommended)
            plan.appeal_rationale = ap.appeal_rationale
            plan.limitation_period = ap.limitation_period
            plan.responsible_departments = ap.responsible_departments
            plan.nature_of_action = ap.nature_of_action
            plan.key_dates = [k.model_dump() for k in ap.key_dates]
            plan.ai_confidence = payload.overall_confidence
            plan.reviewer_notes = body.reviewer_notes
            db.add(plan)

            edited_fields_payload = payload.model_dump()

            case.case_number = payload.case_details.case_number or case.case_number
            case.court_name = payload.case_details.court_name or case.court_name
            case.judgment_date = payload.case_details.date_of_order or case.judgment_date

        case.status = CaseStatus.verified

    elif action == ReviewerAction.rejected:
        if not body.rejection_reason:
            raise HTTPException(status_code=400, detail="Rejection reason is required")
        case.status = CaseStatus.rejected

    db.add(
        VerificationLog(
            case_id=case.id,
            reviewer_action=action,
            reviewer_id=body.reviewer_id or "admin",
            edited_fields=edited_fields_payload,
            rejection_reason=body.rejection_reason,
        )
    )
    db.commit()
    db.refresh(case)
    return get_case(case_id, db)
