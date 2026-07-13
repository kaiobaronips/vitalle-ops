from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from math import ceil
from typing import Any, Iterable
from zoneinfo import ZoneInfo


TASK_STATUS_PENDING = "PENDING"
TASK_STATUS_IN_PROGRESS = "IN_PROGRESS"
TASK_STATUS_COMPLETED = "COMPLETED"
TASK_STATUS_OVERDUE = "OVERDUE"
TASK_STATUS_BLOCKED = "BLOCKED"
TASK_STATUS_REVIEW_PENDING = "REVIEW_PENDING"
TASK_STATUS_JUSTIFIED = "JUSTIFIED"
TASK_STATUS_NOT_APPLICABLE = "NOT_APPLICABLE"
TASK_STATUS_CANCELLED = "CANCELLED"

TASK_TYPES = {
    "STANDARD",
    "GOAL",
    "CHECKLIST",
    "CONDITIONAL",
    "REVIEW",
    "CLOSING",
    "OPENING",
}

RECURRENCE_TYPES = {
    "DAILY",
    "WEEKDAYS",
    "WEEKLY",
    "MONTHLY",
    "CUSTOM",
    "SPECIFIC_WEEKDAYS",
}

TASK_PRIORITY_ORDER = {"LOW": 0, "NORMAL": 1, "HIGH": 2, "CRITICAL": 3}

TASK_BUCKET_ORDER = {
    "OVERDUE": 0,
    "NOW": 1,
    "IN_PROGRESS": 2,
    "UPCOMING": 3,
    "COMPLETED": 4,
}

COMPLETED_STATES = {
    TASK_STATUS_COMPLETED,
    TASK_STATUS_JUSTIFIED,
    TASK_STATUS_NOT_APPLICABLE,
}


@dataclass(frozen=True)
class StatusSnapshot:
    state: str
    label: str
    overdue_minutes: int = 0
    is_overdue: bool = False
    bucket: str = "UPCOMING"


def tz_for_name(name: str | None) -> ZoneInfo:
    return ZoneInfo(name or "America/Sao_Paulo")


def now_in_tz(name: str | None) -> datetime:
    return datetime.now(timezone.utc).astimezone(tz_for_name(name))


def date_in_tz(name: str | None, current: datetime | None = None) -> date:
    current = current or now_in_tz(name)
    return current.astimezone(tz_for_name(name)).date()


def week_of_month(value: date) -> int:
    first_day = value.replace(day=1)
    offset = (value.day + first_day.weekday() - 1) // 7 + 1
    return max(1, offset)


def normalize_weekday(value: date) -> int:
    return value.isoweekday()


def to_time(value: str | time | None) -> time:
    if isinstance(value, time):
        return value
    if not value:
        return time(0, 0)
    parts = [int(part) for part in str(value).split(":")[:3]]
    while len(parts) < 3:
        parts.append(0)
    return time(parts[0], parts[1], parts[2])


def _task_datetime(value: Any, operational_date: date | None, tz_name: str | None, fallback_now: datetime | None = None) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if isinstance(value, time):
        base_date = operational_date or date_in_tz(tz_name, fallback_now)
        tzinfo = tz_for_name(tz_name)
        return datetime.combine(base_date, value, tzinfo=tzinfo)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value)
            if parsed.tzinfo:
                return parsed
            base_date = operational_date or parsed.date()
            return datetime.combine(base_date, parsed.time(), tzinfo=tz_for_name(tz_name))
        except Exception:
            return None
    return None


def format_minutes(minutes: int) -> str:
    if minutes <= 0:
        return "0 min"
    hours, remainder = divmod(minutes, 60)
    if hours:
        return f"{hours}h {remainder}min"
    return f"{minutes} min"


def recurrence_matches(rule: dict[str, Any], operational_date: date) -> bool:
    recurrence_type = str(rule.get("recurrence_type") or "DAILY").upper()
    start_date = rule.get("start_date")
    end_date = rule.get("end_date")
    if start_date and operational_date < start_date:
        return False
    if end_date and operational_date > end_date:
        return False

    interval_value = max(1, int(rule.get("interval_value") or 1))

    if recurrence_type == "DAILY":
        if not start_date:
            return True
        return ((operational_date - start_date).days % interval_value) == 0

    if recurrence_type in {"WEEKDAYS", "SPECIFIC_WEEKDAYS"}:
        weekdays = set(int(day) for day in rule.get("weekdays") or [])
        return normalize_weekday(operational_date) in weekdays or (
            recurrence_type == "WEEKDAYS" and normalize_weekday(operational_date) in {1, 2, 3, 4, 5}
        )

    if recurrence_type == "WEEKLY":
        weekdays = set(int(day) for day in rule.get("weekdays") or [])
        if weekdays and normalize_weekday(operational_date) not in weekdays:
            return False
        if not start_date:
            return True
        return ((operational_date - start_date).days // 7) % interval_value == 0

    if recurrence_type == "MONTHLY":
        month_days = set(int(day) for day in rule.get("month_days") or [])
        weeks_of_month = set(int(week) for week in rule.get("weeks_of_month") or [])
        weekdays = set(int(day) for day in rule.get("weekdays") or [])
        if month_days and operational_date.day in month_days:
            return True
        if weeks_of_month and weekdays:
            return week_of_month(operational_date) in weeks_of_month and normalize_weekday(operational_date) in weekdays
        if not start_date:
            return False
        return operational_date.day == start_date.day and ((operational_date.month - start_date.month) % interval_value == 0)

    if recurrence_type == "CUSTOM":
        payload = rule.get("custom_rule_json") or {}
        dates = payload.get("dates") if isinstance(payload, dict) else []
        if isinstance(dates, list) and operational_date.isoformat() in {str(item) for item in dates}:
            return True
        weekdays = set(int(day) for day in (payload.get("weekdays") if isinstance(payload, dict) else []) or [])
        if weekdays and normalize_weekday(operational_date) not in weekdays:
            return False
        return bool(payload)

    return True


def task_status_snapshot(task: dict[str, Any], now: datetime | None = None) -> StatusSnapshot:
    now = now or datetime.now(timezone.utc)
    operational_date = task.get("operational_date")
    tz_name = task.get("timezone") or task.get("unit_timezone") or task.get("organization_timezone") or "America/Sao_Paulo"
    scheduled_due = _task_datetime(task.get("scheduled_due"), operational_date, tz_name, now)
    scheduled_start = _task_datetime(task.get("scheduled_start"), operational_date, tz_name, now)
    status = str(task.get("status") or TASK_STATUS_PENDING).upper()

    if status in COMPLETED_STATES:
        label = "Concluída"
        if status == TASK_STATUS_JUSTIFIED:
            label = "Justificada"
        elif status == TASK_STATUS_NOT_APPLICABLE:
            label = "Não aplicável"
        return StatusSnapshot(state=status, label=label, bucket="COMPLETED")

    if status == TASK_STATUS_BLOCKED:
        return StatusSnapshot(state=status, label="Bloqueada", bucket="IN_PROGRESS")
    if status == TASK_STATUS_REVIEW_PENDING:
        return StatusSnapshot(state=status, label="Aguardando revisão", bucket="IN_PROGRESS")
    if status == TASK_STATUS_IN_PROGRESS:
        if scheduled_due and now > scheduled_due:
            overdue_minutes = max(1, ceil((now - scheduled_due).total_seconds() / 60))
            return StatusSnapshot(
                state=TASK_STATUS_OVERDUE,
                label=f"Atrasada {format_minutes(overdue_minutes)}",
                overdue_minutes=overdue_minutes,
                is_overdue=True,
                bucket="OVERDUE",
            )
        return StatusSnapshot(state=status, label="Em andamento", bucket="IN_PROGRESS")

    if scheduled_due and now > scheduled_due:
        overdue_minutes = max(1, ceil((now - scheduled_due).total_seconds() / 60))
        return StatusSnapshot(
            state=TASK_STATUS_OVERDUE,
            label=f"Atrasada {format_minutes(overdue_minutes)}",
            overdue_minutes=overdue_minutes,
            is_overdue=True,
            bucket="OVERDUE",
        )

    if scheduled_start and now >= scheduled_start:
        return StatusSnapshot(state=TASK_STATUS_PENDING, label="Agora", bucket="NOW")

    return StatusSnapshot(state=TASK_STATUS_PENDING, label="Próxima", bucket="UPCOMING")


def late_minutes_from_completion(task: dict[str, Any], completed_at: datetime | None) -> int:
    scheduled_due = _task_datetime(task.get("scheduled_due"), task.get("operational_date"), task.get("timezone"), completed_at)
    if not completed_at or not scheduled_due:
        return 0
    delta = completed_at - scheduled_due
    return max(0, ceil(delta.total_seconds() / 60))


def task_weight(task: dict[str, Any]) -> float:
    priority = str(task.get("priority_snapshot") or task.get("priority") or "NORMAL").upper()
    return 2.0 if priority == "CRITICAL" or bool(task.get("is_critical_snapshot")) else 1.0


def calculate_compliance(tasks: Iterable[dict[str, Any]]) -> dict[str, Any]:
    totals = {
        "applicable": 0.0,
        "completed": 0.0,
        "on_time": 0.0,
        "weighted_points": 0.0,
        "goal_total": 0,
        "goal_achieved": 0,
        "justified": 0,
        "blocked": 0,
        "not_applicable": 0,
    }

    for task in tasks:
        status = str(task.get("status") or "").upper()
        if status == TASK_STATUS_NOT_APPLICABLE:
            totals["not_applicable"] += 1
            continue
        weight = task_weight(task)
        totals["applicable"] += weight
        if status in COMPLETED_STATES:
            totals["completed"] += weight
            totals["weighted_points"] += 100.0 * weight
            if status == TASK_STATUS_JUSTIFIED:
                totals["justified"] += 1
            if not task.get("is_late"):
                totals["on_time"] += weight
            continue
        if status == TASK_STATUS_BLOCKED:
            totals["blocked"] += 1
            continue
        if status == TASK_STATUS_IN_PROGRESS and task.get("goal_target_snapshot"):
            target = int(task.get("goal_target_snapshot") or 0)
            current = int(task.get("goal_current") or 0)
            totals["goal_total"] += target
            totals["goal_achieved"] += min(current, target)

    compliance = 0.0 if totals["applicable"] <= 0 else round(totals["weighted_points"] / (totals["applicable"] * 100.0) * 100.0, 1)
    punctuality = 0.0 if totals["applicable"] <= 0 else round(totals["on_time"] / totals["applicable"] * 100.0, 1)
    conclusion = 0.0 if totals["applicable"] <= 0 else round(totals["completed"] / totals["applicable"] * 100.0, 1)
    goals = 0.0 if totals["goal_total"] <= 0 else round(totals["goal_achieved"] / totals["goal_total"] * 100.0, 1)

    return {
        "score": compliance,
        "punctuality": punctuality,
        "conclusion": conclusion,
        "goals": goals,
        "raw": totals,
    }


def sector_health_status(tasks: Iterable[dict[str, Any]], now: datetime | None = None) -> dict[str, Any]:
    now = now or datetime.now(timezone.utc)
    overdue = []
    near_due = []
    critical_overdue = []
    for task in tasks:
        snapshot = task_status_snapshot(task, now)
        due = _task_datetime(
            task.get("scheduled_due"),
            task.get("operational_date"),
            task.get("timezone"),
            now,
        )
        if snapshot.is_overdue:
            overdue.append(task)
            if task.get("is_critical_snapshot"):
                critical_overdue.append(task)
        elif due and 0 <= (due - now).total_seconds() <= 30 * 60:
            near_due.append(task)

    if critical_overdue or len(overdue) >= 3:
        state = "CRITICO"
    elif overdue:
        state = "ATRASADO"
    elif near_due or any(str(task.get("priority_snapshot") or "").upper() == "HIGH" for task in tasks):
        state = "ATENCAO"
    else:
        state = "EM_DIA"

    return {
        "state": state,
        "overdue_count": len(overdue),
        "near_due_count": len(near_due),
        "critical_overdue_count": len(critical_overdue),
    }


def bucket_tasks(tasks: Iterable[dict[str, Any]], now: datetime | None = None) -> dict[str, list[dict[str, Any]]]:
    now = now or datetime.now(timezone.utc)
    buckets = {key: [] for key in TASK_BUCKET_ORDER}
    for task in tasks:
        snapshot = task_status_snapshot(task, now)
        task_copy = dict(task)
        task_copy["display_state"] = snapshot.state
        task_copy["display_label"] = snapshot.label
        task_copy["overdue_minutes"] = snapshot.overdue_minutes
        task_copy["is_overdue"] = snapshot.is_overdue
        buckets.setdefault(snapshot.bucket, []).append(task_copy)
    for key in buckets:
        buckets[key].sort(
            key=lambda item: (
                _task_datetime(item.get("scheduled_due"), item.get("operational_date"), item.get("timezone"), now)
                or _task_datetime(item.get("scheduled_start"), item.get("operational_date"), item.get("timezone"), now)
                or datetime.max.replace(tzinfo=timezone.utc)
            )
        )
    return buckets
