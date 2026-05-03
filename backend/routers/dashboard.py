"""Dashboard aggregation endpoint."""
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Case, CaseStatus
from routers.verification import _to_summary
from schemas import (
    CaseSummary,
    DashboardData,
    DashboardStats,
    DeadlineItem,
)

router = APIRouter(prefix="/api", tags=["dashboard"])


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(value[:10], fmt).date()
        except Exception:
            continue
    return None


@router.get("/dashboard", response_model=DashboardData)
def dashboard(department: str | None = None, db: Session = Depends(get_db)):
    today = date.today()
    horizon = today + timedelta(days=30)

    cases = (
        db.query(Case)
        .filter(Case.status == CaseStatus.verified)
        .order_by(Case.uploaded_at.desc())
        .all()
    )

    summaries: list[CaseSummary] = []
    deadlines: list[DeadlineItem] = []
    by_dept: dict[str, dict[str, int]] = defaultdict(
        lambda: {"compliance": 0, "appeal": 0, "total": 0}
    )

    compliance_count = 0
    appeal_count = 0
    upcoming_30 = 0

    for c in cases:
        summary = _to_summary(c)
        plan = c.action_plan
        if department:
            depts = (plan.responsible_departments or []) if plan else []
            if department not in depts:
                continue

        summaries.append(summary)

        if plan:
            if plan.compliance_required:
                compliance_count += 1
            if plan.appeal_recommended:
                appeal_count += 1
            for dept in plan.responsible_departments or ["Unassigned"]:
                by_dept[dept]["total"] += 1
                if plan.compliance_required:
                    by_dept[dept]["compliance"] += 1
                if plan.appeal_recommended:
                    by_dept[dept]["appeal"] += 1

            for kd in plan.key_dates or []:
                d = _parse_date(kd.get("date"))
                if not d:
                    continue
                days_remaining = (d - today).days
                if today <= d <= horizon:
                    upcoming_30 += 1
                deadlines.append(
                    DeadlineItem(
                        case_id=c.id,
                        case_number=c.case_number,
                        label=kd.get("label") or "Key date",
                        date=d.isoformat(),
                        days_remaining=days_remaining,
                    )
                )

    deadlines.sort(key=lambda x: (x.days_remaining is None, x.days_remaining))

    stats = DashboardStats(
        total_verified=len(summaries),
        compliance_required=compliance_count,
        appeals_recommended=appeal_count,
        deadlines_30_days=upcoming_30,
        by_department=[
            {"department": dept, **counts} for dept, counts in by_dept.items()
        ],
    )

    return DashboardData(
        stats=stats,
        cases=summaries,
        upcoming_deadlines=deadlines[:25],
    )
