"""Pydantic schemas — the public contract for the API."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------- Sub-shapes returned by the AI extractor ----------
class PdfSourceRef(BaseModel):
    """Verbatim excerpt from the judgment PDF for reviewer highlight-in-document."""

    model_config = ConfigDict(extra="ignore")

    page: int = Field(0, ge=0, description="1-based page number from [Page N] markers")
    quote: str = Field("", max_length=1200)


class CaseDetails(BaseModel):
    model_config = ConfigDict(extra="ignore")

    case_number: str = ""
    court_name: str = ""
    date_of_order: str = ""
    bench: str = ""
    case_number_src: Optional[PdfSourceRef] = None
    court_name_src: Optional[PdfSourceRef] = None
    date_of_order_src: Optional[PdfSourceRef] = None
    bench_src: Optional[PdfSourceRef] = None


class Parties(BaseModel):
    model_config = ConfigDict(extra="ignore")

    petitioner: str = ""
    respondent: str = ""
    petitioner_src: Optional[PdfSourceRef] = None
    respondent_src: Optional[PdfSourceRef] = None


class Direction(BaseModel):
    model_config = ConfigDict(extra="ignore")

    direction: str
    paragraph_reference: str = ""
    confidence: float = 0.0
    source: Optional[PdfSourceRef] = None


class Timeline(BaseModel):
    event: str
    date_or_period: str
    is_inferred: bool = False


class KeyDate(BaseModel):
    label: str
    date: str
    is_inferred: bool = False


class ActionPlanData(BaseModel):
    compliance_required: bool = False
    compliance_details: str = ""
    appeal_recommended: bool = False
    appeal_rationale: str = ""
    limitation_period: str = ""
    responsible_departments: list[str] = Field(default_factory=list)
    nature_of_action: str = ""
    key_dates: list[KeyDate] = Field(default_factory=list)


class ExtractionPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    case_details: CaseDetails = Field(default_factory=CaseDetails)
    parties: Parties = Field(default_factory=Parties)
    key_directions: list[Direction] = Field(default_factory=list)
    timelines: list[Timeline] = Field(default_factory=list)
    action_plan: ActionPlanData = Field(default_factory=ActionPlanData)
    overall_confidence: float = 0.0
    summary: str = ""
    summary_src: Optional[PdfSourceRef] = None


# ---------- API response shapes ----------
class CaseSummary(BaseModel):
    id: int
    case_number: Optional[str]
    court_name: Optional[str]
    judgment_date: Optional[str]
    pdf_filename: str
    status: str
    uploaded_at: datetime
    overall_confidence: float = 0.0
    summary: Optional[str] = None
    action_required: Optional[str] = None
    responsible_departments: list[str] = Field(default_factory=list)
    nearest_deadline: Optional[str] = None

    class Config:
        from_attributes = True


class CaseFull(BaseModel):
    case: CaseSummary
    extraction: Optional[ExtractionPayload] = None


class UploadResponse(BaseModel):
    case_id: int
    pdf_filename: str
    status: str


class VerificationRequest(BaseModel):
    """Body sent from the verify page when reviewer hits approve / edit / reject."""
    action: str  # 'approved' | 'edited' | 'rejected'
    reviewer_id: str = "admin"
    reviewer_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    edited_payload: Optional[ExtractionPayload] = None


class DashboardStats(BaseModel):
    total_verified: int
    compliance_required: int
    appeals_recommended: int
    deadlines_30_days: int
    by_department: list[dict[str, Any]]


class DeadlineItem(BaseModel):
    case_id: int
    case_number: Optional[str]
    label: str
    date: str
    days_remaining: Optional[int] = None


class DashboardData(BaseModel):
    stats: DashboardStats
    cases: list[CaseSummary]
    upcoming_deadlines: list[DeadlineItem]
