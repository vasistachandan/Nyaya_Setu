"""POST /api/extract/{case_id} — run Groq over the saved PDF text and persist."""
from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import ActionPlan, Case, Extraction
from schemas import ExtractionPayload
from services.ai_service import extract_judgment

router = APIRouter(prefix="/api", tags=["extraction"])


def _build_extraction_payload(parsed: dict[str, Any]) -> ExtractionPayload:
    """Coerce the AI's parsed JSON into our Pydantic schema, dropping unknowns."""
    safe = {
        "case_details": parsed.get("case_details") or {},
        "parties": parsed.get("parties") or {},
        "key_directions": parsed.get("key_directions") or [],
        "timelines": parsed.get("timelines") or [],
        "action_plan": parsed.get("action_plan") or {},
        "overall_confidence": float(parsed.get("overall_confidence") or 0.0),
        "summary": parsed.get("summary") or "",
        "summary_src": parsed.get("summary_src"),
    }
    return ExtractionPayload.model_validate(safe)


@router.post("/extract/{case_id}", response_model=ExtractionPayload)
def run_extraction(case_id: int, db: Session = Depends(get_db)):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    try:
        parsed = extract_judgment(case.pdf_path)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except RuntimeError as exc:
        msg = str(exc)
        low = msg.lower()
        if "scanned" in low or "ocr" in low:
            raise HTTPException(status_code=422, detail=msg) from exc
        raise HTTPException(status_code=502, detail=msg) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"Extraction failed: {exc!s}"
        ) from exc

    payload = _build_extraction_payload(parsed)

    case.case_number = payload.case_details.case_number or case.case_number
    case.court_name = payload.case_details.court_name or case.court_name
    case.judgment_date = payload.case_details.date_of_order or case.judgment_date

    extraction = case.extraction
    if extraction is None:
        extraction = Extraction(case_id=case.id)
        db.add(extraction)

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
    extraction.raw_claude_response = parsed.get("_raw") or json.dumps(parsed, default=str)

    plan = case.action_plan
    if plan is None:
        plan = ActionPlan(case_id=case.id)
        db.add(plan)

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

    db.commit()
    return payload
