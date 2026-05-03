"""SQLAlchemy ORM models for the CCMS AI prototype.

The schema mirrors the hackathon plan:
    cases  ->  extractions  ->  action_plans
    cases  ->  verification_logs

We use JSON columns instead of Postgres-only JSONB so the same models work
against both Postgres (production-like) and SQLite (offline fallback).
"""
from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def _utcnow() -> datetime:
    return datetime.now(tz=timezone.utc)


class CaseStatus(str, enum.Enum):
    pending = "pending"
    verified = "verified"
    rejected = "rejected"


class ReviewerAction(str, enum.Enum):
    approved = "approved"
    edited = "edited"
    rejected = "rejected"


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    case_number: Mapped[str | None] = mapped_column(String(120), nullable=True)
    court_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    judgment_date: Mapped[str | None] = mapped_column(String(50), nullable=True)
    pdf_path: Mapped[str] = mapped_column(String(500), nullable=False)
    pdf_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[CaseStatus] = mapped_column(
        Enum(CaseStatus, native_enum=False), default=CaseStatus.pending, nullable=False
    )
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    extraction: Mapped["Extraction"] = relationship(
        "Extraction", uselist=False, back_populates="case", cascade="all, delete-orphan"
    )
    action_plan: Mapped["ActionPlan"] = relationship(
        "ActionPlan", uselist=False, back_populates="case", cascade="all, delete-orphan"
    )
    verification_logs: Mapped[list["VerificationLog"]] = relationship(
        "VerificationLog", back_populates="case", cascade="all, delete-orphan"
    )


class Extraction(Base):
    __tablename__ = "extractions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"))
    case_details: Mapped[dict] = mapped_column(JSON, default=dict)
    parties_involved: Mapped[dict] = mapped_column(JSON, default=dict)
    key_directions: Mapped[list] = mapped_column(JSON, default=list)
    timelines: Mapped[list] = mapped_column(JSON, default=list)
    raw_claude_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence_scores: Mapped[dict] = mapped_column(JSON, default=dict)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    case: Mapped[Case] = relationship("Case", back_populates="extraction")


class ActionPlan(Base):
    __tablename__ = "action_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"))
    compliance_required: Mapped[bool] = mapped_column(Boolean, default=False)
    compliance_details: Mapped[str | None] = mapped_column(Text, nullable=True)
    appeal_recommended: Mapped[bool] = mapped_column(Boolean, default=False)
    appeal_rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    limitation_period: Mapped[str | None] = mapped_column(String(120), nullable=True)
    responsible_departments: Mapped[list] = mapped_column(JSON, default=list)
    nature_of_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    key_dates: Mapped[list] = mapped_column(JSON, default=list)
    ai_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    reviewer_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    case: Mapped[Case] = relationship("Case", back_populates="action_plan")


class VerificationLog(Base):
    __tablename__ = "verification_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"))
    reviewer_action: Mapped[ReviewerAction] = mapped_column(
        Enum(ReviewerAction, native_enum=False), nullable=False
    )
    reviewer_id: Mapped[str] = mapped_column(String(120), default="admin")
    edited_fields: Mapped[dict] = mapped_column(JSON, default=dict)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    case: Mapped[Case] = relationship("Case", back_populates="verification_logs")
