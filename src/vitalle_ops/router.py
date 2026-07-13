from __future__ import annotations

import re
from datetime import date, datetime, time
from typing import Any, Iterable, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from vitalle_ops.auth import APIPrincipal, require_principal
from vitalle_ops.domain import bucket_tasks, calculate_compliance, date_in_tz, now_in_tz, sector_health_status
from vitalle_ops.store import (
    add_goal_entry,
    add_task_comment,
    add_task_evidence,
    archive_task_template,
    block_task,
    complete_subtask,
    complete_task,
    duplicate_task_template,
    get_dashboard_summary,
    get_daily_operation,
    get_daily_operation_summary,
    get_daily_task_instance,
    get_scope_defaults,
    get_sector_by_slug,
    get_task_template,
    get_user_context,
    list_alerts,
    list_audit_events,
    list_daily_operation_tasks_for_date,
    list_daily_reports,
    list_daily_task_instances,
    list_history,
    list_sectors,
    list_system_settings,
    list_task_comments,
    list_task_evidences,
    list_task_goal_entries,
    list_task_template_subtasks,
    list_task_templates,
    list_user_sector_assignments,
    list_users,
    mark_not_applicable,
    reopen_task,
    resolve_alert,
    refresh_alerts,
    refresh_task_runtime_state,
    sync_daily_operation,
    start_task,
    upsert_sector,
    upsert_system_setting,
    upsert_task_template,
    upsert_user,
    upsert_user_profile,
    replace_user_sector_assignments,
)


router = APIRouter(prefix="/v1/vitalle", tags=["vitalle"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


def _page(items: list[dict[str, Any]], page: int, limit: int, total: int) -> dict[str, Any]:
    return {
        "items": items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit if total else 0,
        },
    }


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "item"


def _is_admin_like(principal: APIPrincipal) -> bool:
    return principal.is_admin or principal.role.lower() in {"owner", "admin", "manager", "gestor"}


def _resolve_scope(principal: APIPrincipal) -> dict[str, Any]:
    defaults = get_scope_defaults()
    user_context = get_user_context(principal.user_id) if principal.user_id else {}
    organization_id = principal.organization_id or user_context.get("organization_id") or defaults.get("organization_id", "")
    unit_id = principal.unit_id or user_context.get("unit_id") or defaults.get("unit_id", "")
    sector_id = principal.sector_id or user_context.get("sector_id") or ""
    organization_timezone = user_context.get("organization_timezone") or defaults.get("organization_timezone") or "America/Sao_Paulo"
    unit_timezone = user_context.get("unit_timezone") or defaults.get("unit_timezone") or organization_timezone
    display_name = principal.display_name or user_context.get("display_name") or user_context.get("full_name") or principal.email or "Usuário"
    role = principal.role or user_context.get("role") or "collaborator"
    accessible_sector_ids = []
    if _is_admin_like(principal):
        accessible_sector_ids = [sector["id"] for sector in list_sectors(unit_id)] if unit_id else []
    elif principal.user_id:
        assignments = list_user_sector_assignments(principal.user_id)
        accessible_sector_ids = [assignment["sector_id"] for assignment in assignments]
    if not accessible_sector_ids and sector_id:
        accessible_sector_ids = [sector_id]
    return {
        "principal": principal,
        "organization_id": organization_id,
        "unit_id": unit_id,
        "sector_id": sector_id,
        "role": role,
        "display_name": display_name,
        "organization_timezone": organization_timezone,
        "unit_timezone": unit_timezone,
        "accessible_sector_ids": accessible_sector_ids,
        "user_context": user_context,
        "admin_like": _is_admin_like(principal),
    }


def _filter_tasks(summary: dict[str, Any], sector_ids: list[str], timezone_name: str) -> dict[str, Any]:
    tasks = summary.get("tasks", [])
    if sector_ids:
        tasks = [task for task in tasks if task.get("sector_id") in sector_ids]
    buckets = bucket_tasks(tasks, now_in_tz(timezone_name))
    sectors = summary.get("sectors", [])
    if sector_ids:
        sectors = [sector for sector in sectors if sector.get("id") in sector_ids]
    alerts = summary.get("alerts", [])
    if sector_ids:
        alerts = [alert for alert in alerts if alert.get("sector_id") in sector_ids or not alert.get("sector_id")]
    compliance = calculate_compliance(tasks)
    now = now_in_tz(timezone_name)
    sector_payload = []
    tasks_by_sector: dict[str, list[dict[str, Any]]] = {}
    for task in tasks:
        tasks_by_sector.setdefault(task["sector_id"], []).append(task)
    for sector in sectors:
        sector_tasks = tasks_by_sector.get(sector["id"], [])
        health = sector_health_status(sector_tasks, now)
        sector_payload.append(
            {
                **sector,
                "task_count": len(sector_tasks),
                "completed_count": sum(1 for task in sector_tasks if str(task.get("status")).upper() in {"COMPLETED", "JUSTIFIED", "NOT_APPLICABLE"}),
                "overdue_count": health["overdue_count"],
                "near_due_count": health["near_due_count"],
                "health_state": health["state"],
            }
        )
    return {
        **summary,
        "tasks": tasks,
        "buckets": buckets,
        "sectors": sector_payload,
        "alerts": alerts,
        "compliance": compliance,
    }


def _task_detail(task: dict[str, Any]) -> dict[str, Any]:
    task_id = str(task.get("id") or "")
    if not task_id:
        raise HTTPException(status_code=404, detail="Task not found")
    return {
        **task,
        "subtasks": list_task_template_subtasks(task["task_template_id"]) if task.get("task_template_id") else [],
        "comments": list_task_comments(task_id),
        "goals": list_task_goal_entries(task_id),
        "evidences": list_task_evidences(task_id),
        "display": task.get("display_label"),
    }


class TaskTemplateSubtaskInput(BaseModel):
    title: str
    sort_order: int = 0
    is_required: bool = True


class RecurrenceRuleInput(BaseModel):
    recurrence_type: str = "DAILY"
    interval_value: int = 1
    weekdays: list[int] = Field(default_factory=list)
    month_days: list[int] = Field(default_factory=list)
    weeks_of_month: list[int] = Field(default_factory=list)
    custom_rule_json: dict[str, Any] = Field(default_factory=dict)
    start_date: date | None = None
    end_date: date | None = None


class TaskTemplateInput(BaseModel):
    id: str | None = None
    sector_id: str
    title: str
    description: str = ""
    task_type: str = "STANDARD"
    default_assignee_id: str | None = None
    start_time: time
    due_time: time
    priority: str = "NORMAL"
    is_critical: bool = False
    goal_target: int | None = None
    goal_unit: str = ""
    requires_comment_on_completion: bool = False
    requires_evidence: bool = False
    requires_manager_review: bool = False
    allow_not_applicable: bool = True
    is_conditional: bool = False
    instructions: str = ""
    active: bool = True
    archived_at: datetime | None = None
    recurrence_rule: RecurrenceRuleInput = Field(default_factory=RecurrenceRuleInput)
    subtasks: list[TaskTemplateSubtaskInput] = Field(default_factory=list)


class SectorInput(BaseModel):
    id: str | None = None
    name: str
    slug: str | None = None
    description: str = ""
    responsible_user_id: str | None = None
    responsible_name: str = ""
    color: str = "#0f766e"
    icon: str = "building-2"
    status: str = "active"
    sort_order: int = 0


class UserInput(BaseModel):
    id: str | None = None
    email: str
    full_name: str
    role: str = "collaborator"
    unit_id: str | None = None
    is_active: bool = True
    is_demo: bool = False
    display_name: str | None = None
    title: str = ""
    avatar_url: str = ""
    phone: str = ""
    bio: str = ""
    sector_ids: list[str] = Field(default_factory=list)


class TaskActionInput(BaseModel):
    comment: str = ""
    reason_type: str = ""
    details: str = ""
    quantity: int = 0
    note: str = ""


class ReportInput(BaseModel):
    operational_observations: str = ""
    operational_occurrence: str = ""
    next_shift_notes: str = ""
    external_form_url: str = ""


def _principal_guard(principal: APIPrincipal = Depends(require_principal)) -> APIPrincipal:
    return principal


@router.get("/me")
def me(principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    return _success(
        {
            "principal": principal.__dict__,
            "organization_id": scope["organization_id"],
            "unit_id": scope["unit_id"],
            "role": scope["role"],
            "display_name": scope["display_name"],
            "sector_ids": scope["accessible_sector_ids"],
            "admin_like": scope["admin_like"],
            "timezone": scope["unit_timezone"],
            "sectors": list_sectors(scope["unit_id"]) if scope["unit_id"] else [],
            "settings": list_system_settings(scope["unit_id"]) if scope["unit_id"] else [],
        }
    )


@router.get("/dashboard")
def dashboard(principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    if not scope["unit_id"]:
        raise HTTPException(status_code=404, detail="Unit not found")
    summary = get_dashboard_summary(scope["unit_id"], scope["unit_timezone"])
    return _success(
        {
            **_filter_tasks(summary, scope["accessible_sector_ids"], scope["unit_timezone"]),
            "scope": scope,
        }
    )


@router.get("/meu-dia")
def meu_dia(principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    if not scope["unit_id"]:
        raise HTTPException(status_code=404, detail="Unit not found")
    operational_date = date_in_tz(scope["unit_timezone"])
    summary = get_daily_operation_summary(scope["unit_id"], operational_date, scope["unit_timezone"])
    filtered = _filter_tasks(summary, scope["accessible_sector_ids"], scope["unit_timezone"])
    tasks = filtered["tasks"]
    next_task = next((task for task in tasks if str(task.get("status")).upper() in {"PENDING", "OVERDUE", "IN_PROGRESS"}), tasks[0] if tasks else {})
    return _success(
        {
            **filtered,
            "next_task": next_task,
            "day_progress": 0 if not tasks else round(sum(1 for task in tasks if str(task.get("status")).upper() in {"COMPLETED", "JUSTIFIED", "NOT_APPLICABLE"}) / len(tasks) * 100, 1),
            "date_label": operational_date.isoformat(),
        }
    )


@router.get("/operacao")
def operacao(principal: APIPrincipal = Depends(_principal_guard)):
    return dashboard(principal)


@router.post("/operacao/sincronizar")
def sincronizar_operacao(principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    if not scope["unit_id"]:
        raise HTTPException(status_code=404, detail="Unit not found")
    today = date_in_tz(scope["unit_timezone"])
    summary = sync_daily_operation(
        scope["organization_id"],
        scope["unit_id"],
        today,
        scope["unit_timezone"],
        sync_source="api",
        actor_user_id=principal.user_id or None,
    )
    return _success(summary)


@router.get("/setores")
def setores(principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    if not scope["unit_id"]:
        raise HTTPException(status_code=404, detail="Unit not found")
    sectors = list_sectors(scope["unit_id"])
    today = date_in_tz(scope["unit_timezone"])
    tasks = list_daily_task_instances(scope["unit_id"], today)
    if scope["accessible_sector_ids"] and not scope["admin_like"]:
        tasks = [task for task in tasks if task["sector_id"] in scope["accessible_sector_ids"]]
    sector_payload = []
    by_sector: dict[str, list[dict[str, Any]]] = {}
    for task in tasks:
        by_sector.setdefault(task["sector_id"], []).append(task)
    now = now_in_tz(scope["unit_timezone"])
    for sector in sectors:
        sector_tasks = by_sector.get(sector["id"], [])
        health = sector_health_status(sector_tasks, now)
        sector_payload.append({**sector, **health, "task_count": len(sector_tasks)})
    return _success({"items": sector_payload})


@router.get("/setores/{slug}")
def setor(slug: str, principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    if not scope["unit_id"]:
        raise HTTPException(status_code=404, detail="Unit not found")
    sector = get_sector_by_slug(scope["unit_id"], slug)
    if not sector:
        raise HTTPException(status_code=404, detail="Sector not found")
    today = date_in_tz(scope["unit_timezone"])
    tasks = [task for task in list_daily_task_instances(scope["unit_id"], today) if task["sector_id"] == sector["id"]]
    summary = calculate_compliance(tasks)
    return _success(
        {
            "sector": sector,
            "tasks": bucket_tasks(tasks, now_in_tz(scope["unit_timezone"])),
            "compliance": summary,
            "alerts": [alert for alert in list_alerts(scope["unit_id"], limit=100) if alert.get("sector_id") == sector["id"]],
        }
    )


@router.get("/alertas")
def alertas(status: str | None = Query(default=None), principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    if not scope["unit_id"]:
        raise HTTPException(status_code=404, detail="Unit not found")
    alerts = list_alerts(scope["unit_id"], status=status, limit=200)
    if scope["accessible_sector_ids"] and not scope["admin_like"]:
        alerts = [alert for alert in alerts if alert.get("sector_id") in scope["accessible_sector_ids"] or not alert.get("sector_id")]
    return _success({"items": alerts})


@router.get("/historico")
def historico(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    principal: APIPrincipal = Depends(_principal_guard),
):
    scope = _resolve_scope(principal)
    if not scope["unit_id"]:
        raise HTTPException(status_code=404, detail="Unit not found")
    history = list_history(scope["unit_id"], start_date=start_date, end_date=end_date, limit=60)
    return _success({"items": history})


@router.get("/relatorios")
def relatorios(principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    if not scope["unit_id"]:
        raise HTTPException(status_code=404, detail="Unit not found")
    return _success({"items": list_daily_reports(scope["unit_id"], limit=30)})


@router.get("/auditoria")
def auditoria(principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    if not scope["unit_id"]:
        raise HTTPException(status_code=404, detail="Unit not found")
    return _success({"items": list_audit_events(scope["unit_id"], limit=100)})


@router.get("/admin/tarefas")
def admin_tarefas(principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    if not _is_admin_like(principal):
        raise HTTPException(status_code=403, detail="Admin access required")
    return _success({"items": list_task_templates(scope["unit_id"])})


@router.get("/admin/tarefas/{template_id}")
def admin_tarefa(template_id: str, principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    if not _is_admin_like(principal):
        raise HTTPException(status_code=403, detail="Admin access required")
    template = get_task_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return _success(template)


@router.post("/admin/tarefas")
def admin_salvar_tarefa(payload: TaskTemplateInput, principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    if not _is_admin_like(principal):
        raise HTTPException(status_code=403, detail="Admin access required")
    template_id = payload.id or f"{_slugify(payload.title)}::{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    template = upsert_task_template(
        {
            "id": template_id,
            "organization_id": scope["organization_id"],
            "unit_id": scope["unit_id"],
            "sector_id": payload.sector_id,
            "title": payload.title,
            "description": payload.description,
            "task_type": payload.task_type,
            "default_assignee_id": payload.default_assignee_id,
            "start_time": payload.start_time,
            "due_time": payload.due_time,
            "priority": payload.priority,
            "is_critical": payload.is_critical,
            "goal_target": payload.goal_target,
            "goal_unit": payload.goal_unit,
            "requires_comment_on_completion": payload.requires_comment_on_completion,
            "requires_evidence": payload.requires_evidence,
            "requires_manager_review": payload.requires_manager_review,
            "allow_not_applicable": payload.allow_not_applicable,
            "is_conditional": payload.is_conditional,
            "instructions": payload.instructions,
            "active": payload.active,
            "archived_at": payload.archived_at,
            "created_by": principal.user_id or None,
            "updated_by": principal.user_id or None,
            "recurrence_rule": payload.recurrence_rule.model_dump(),
            "subtasks": [subtask.model_dump() for subtask in payload.subtasks],
        }
    )
    return _success(template)


@router.post("/admin/tarefas/{template_id}/duplicar")
def admin_duplicar_tarefa(template_id: str, principal: APIPrincipal = Depends(_principal_guard)):
    if not _is_admin_like(principal):
        raise HTTPException(status_code=403, detail="Admin access required")
    duplicated = duplicate_task_template(template_id, actor_user_id=principal.user_id or None)
    if not duplicated:
        raise HTTPException(status_code=404, detail="Template not found")
    return _success(duplicated)


@router.post("/admin/tarefas/{template_id}/arquivar")
def admin_arquivar_tarefa(template_id: str, principal: APIPrincipal = Depends(_principal_guard)):
    if not _is_admin_like(principal):
        raise HTTPException(status_code=403, detail="Admin access required")
    archived = archive_task_template(template_id, active=False, actor_user_id=principal.user_id or None)
    if not archived:
        raise HTTPException(status_code=404, detail="Template not found")
    return _success(archived)


@router.post("/admin/tarefas/{template_id}/ativar")
def admin_ativar_tarefa(template_id: str, principal: APIPrincipal = Depends(_principal_guard)):
    if not _is_admin_like(principal):
        raise HTTPException(status_code=403, detail="Admin access required")
    activated = archive_task_template(template_id, active=True, actor_user_id=principal.user_id or None)
    if not activated:
        raise HTTPException(status_code=404, detail="Template not found")
    return _success(activated)


@router.get("/admin/setores")
def admin_setores(principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    if not _is_admin_like(principal):
        raise HTTPException(status_code=403, detail="Admin access required")
    return _success({"items": list_sectors(scope["unit_id"])})


@router.post("/admin/setores")
def admin_salvar_setor(payload: SectorInput, principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    if not _is_admin_like(principal):
        raise HTTPException(status_code=403, detail="Admin access required")
    sector_id = payload.id or f"{_slugify(payload.name)}::{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    sector = upsert_sector(
        {
            "id": sector_id,
            "organization_id": scope["organization_id"],
            "unit_id": scope["unit_id"],
            "name": payload.name,
            "slug": payload.slug or _slugify(payload.name),
            "description": payload.description,
            "responsible_user_id": payload.responsible_user_id,
            "color": payload.color,
            "icon": payload.icon,
            "status": payload.status,
            "sort_order": payload.sort_order,
            "metadata_json": {"responsible_name": payload.responsible_name},
        }
    )
    return _success(sector)


@router.get("/admin/usuarios")
def admin_usuarios(principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    if not _is_admin_like(principal):
        raise HTTPException(status_code=403, detail="Admin access required")
    return _success({"items": list_users(scope["unit_id"])})


@router.post("/admin/usuarios")
def admin_salvar_usuario(payload: UserInput, principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    if not _is_admin_like(principal):
        raise HTTPException(status_code=403, detail="Admin access required")
    user_id = payload.id or f"{_slugify(payload.email)}::{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    user = upsert_user(
        {
            "id": user_id,
            "organization_id": scope["organization_id"],
            "unit_id": payload.unit_id or scope["unit_id"],
            "email": payload.email,
            "full_name": payload.full_name,
            "role": payload.role,
            "is_active": payload.is_active,
            "is_demo": payload.is_demo,
        }
    )
    profile = upsert_user_profile(
        {
            "user_id": user_id,
            "display_name": payload.display_name or payload.full_name,
            "title": payload.title,
            "avatar_url": payload.avatar_url,
            "phone": payload.phone,
            "bio": payload.bio,
        }
    )
    replace_user_sector_assignments(user_id, payload.sector_ids)
    return _success({"user": user, "profile": profile})


@router.get("/admin/configuracoes")
def admin_configuracoes(principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    if not _is_admin_like(principal):
        raise HTTPException(status_code=403, detail="Admin access required")
    return _success({"items": list_system_settings(scope["unit_id"])})


@router.post("/admin/configuracoes")
def admin_salvar_configuracao(payload: dict[str, Any], principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    if not _is_admin_like(principal):
        raise HTTPException(status_code=403, detail="Admin access required")
    if not payload.get("key"):
        raise HTTPException(status_code=400, detail="key is required")
    return _success(
        upsert_system_setting(
            {
                "organization_id": scope["organization_id"],
                "unit_id": scope["unit_id"],
                "key": payload["key"],
                "value_json": payload.get("value_json") or payload.get("value") or payload.get("data") or {},
                "updated_by": principal.user_id or None,
            }
        )
    )


@router.get("/tarefas/{task_id}")
def tarefa(task_id: str, principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    task = get_daily_task_instance(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not scope["admin_like"] and scope["accessible_sector_ids"] and task["sector_id"] not in scope["accessible_sector_ids"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return _success(_task_detail(task))


@router.post("/tarefas/{task_id}/iniciar")
def iniciar_tarefa(task_id: str, principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    task = get_daily_task_instance(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not scope["admin_like"] and scope["accessible_sector_ids"] and task["sector_id"] not in scope["accessible_sector_ids"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return _success(start_task(task_id, actor_user_id=principal.user_id or None))


@router.post("/tarefas/{task_id}/concluir")
def concluir_tarefa(task_id: str, payload: TaskActionInput, principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    task = get_daily_task_instance(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not scope["admin_like"] and scope["accessible_sector_ids"] and task["sector_id"] not in scope["accessible_sector_ids"]:
        raise HTTPException(status_code=403, detail="Access denied")
    if payload.comment:
        add_task_comment(task_id, payload.comment, actor_user_id=principal.user_id or None, comment_type="completion")
    updated = complete_task(task_id, payload.comment, actor_user_id=principal.user_id or None)
    refresh_alerts(scope["unit_id"], date_in_tz(scope["unit_timezone"]), scope["unit_timezone"], actor_user_id=principal.user_id or None)
    return _success(updated)


@router.post("/tarefas/{task_id}/bloquear")
def bloquear_tarefa(task_id: str, payload: TaskActionInput, principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    task = get_daily_task_instance(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not scope["admin_like"] and scope["accessible_sector_ids"] and task["sector_id"] not in scope["accessible_sector_ids"]:
        raise HTTPException(status_code=403, detail="Access denied")
    result = block_task(task_id, payload.reason_type or "Outro", payload.details or payload.comment, actor_user_id=principal.user_id or None)
    refresh_alerts(scope["unit_id"], date_in_tz(scope["unit_timezone"]), scope["unit_timezone"], actor_user_id=principal.user_id or None)
    return _success(result)


@router.post("/tarefas/{task_id}/nao-aplicavel")
def tarefa_nao_aplicavel(task_id: str, payload: TaskActionInput, principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    task = get_daily_task_instance(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not scope["admin_like"] and scope["accessible_sector_ids"] and task["sector_id"] not in scope["accessible_sector_ids"]:
        raise HTTPException(status_code=403, detail="Access denied")
    updated = mark_not_applicable(task_id, payload.comment or "Não aplicável hoje", actor_user_id=principal.user_id or None)
    refresh_alerts(scope["unit_id"], date_in_tz(scope["unit_timezone"]), scope["unit_timezone"], actor_user_id=principal.user_id or None)
    return _success(updated)


@router.post("/tarefas/{task_id}/reabrir")
def reabrir_tarefa(task_id: str, payload: TaskActionInput, principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    task = get_daily_task_instance(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not scope["admin_like"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    updated = reopen_task(task_id, reason=payload.comment or payload.details, actor_user_id=principal.user_id or None)
    refresh_alerts(scope["unit_id"], date_in_tz(scope["unit_timezone"]), scope["unit_timezone"], actor_user_id=principal.user_id or None)
    return _success(updated)


@router.post("/tarefas/{task_id}/meta")
def registrar_meta(task_id: str, payload: TaskActionInput, principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    task = get_daily_task_instance(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not scope["admin_like"] and scope["accessible_sector_ids"] and task["sector_id"] not in scope["accessible_sector_ids"]:
        raise HTTPException(status_code=403, detail="Access denied")
    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="quantity must be positive")
    result = add_goal_entry(task_id, payload.quantity, payload.note or payload.comment, actor_user_id=principal.user_id or None)
    refresh_alerts(scope["unit_id"], date_in_tz(scope["unit_timezone"]), scope["unit_timezone"], actor_user_id=principal.user_id or None)
    return _success(result)


@router.post("/tarefas/{task_id}/evidencia")
def registrar_evidencia(task_id: str, payload: dict[str, Any], principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    task = get_daily_task_instance(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not scope["admin_like"] and scope["accessible_sector_ids"] and task["sector_id"] not in scope["accessible_sector_ids"]:
        raise HTTPException(status_code=403, detail="Access denied")
    evidence = add_task_evidence(
        task_id,
        payload.get("evidence_type", "text"),
        payload.get("label", ""),
        payload.get("payload", payload),
        actor_user_id=principal.user_id or None,
    )
    return _success(evidence)


@router.post("/tarefas/{task_id}/subtarefas/{subtask_id}/concluir")
def concluir_subtarefa(task_id: str, subtask_id: str, payload: TaskActionInput, principal: APIPrincipal = Depends(_principal_guard)):
    scope = _resolve_scope(principal)
    task = get_daily_task_instance(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not scope["admin_like"] and scope["accessible_sector_ids"] and task["sector_id"] not in scope["accessible_sector_ids"]:
        raise HTTPException(status_code=403, detail="Access denied")
    updated = complete_subtask(subtask_id, actor_user_id=principal.user_id or None, notes=payload.comment)
    refresh_task_runtime_state(scope["unit_id"], date_in_tz(scope["unit_timezone"]), scope["unit_timezone"], actor_user_id=principal.user_id or None)
    return _success(updated)


@router.post("/alertas/{alert_id}/resolver")
def resolver_alerta(alert_id: str, principal: APIPrincipal = Depends(_principal_guard)):
    if not _is_admin_like(principal):
        raise HTTPException(status_code=403, detail="Admin access required")
    return _success(resolve_alert(alert_id, actor_user_id=principal.user_id or None))
