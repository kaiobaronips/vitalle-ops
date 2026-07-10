from __future__ import annotations

import json
from dataclasses import asdict
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Iterable
from uuid import uuid4

from vitalle_ops.db import get_connection
from vitalle_ops.domain import (
    TASK_STATUS_BLOCKED,
    TASK_STATUS_COMPLETED,
    TASK_STATUS_IN_PROGRESS,
    TASK_STATUS_JUSTIFIED,
    TASK_STATUS_NOT_APPLICABLE,
    TASK_STATUS_OVERDUE,
    TASK_STATUS_PENDING,
    TASK_STATUS_REVIEW_PENDING,
    bucket_tasks,
    calculate_compliance,
    date_in_tz,
    late_minutes_from_completion,
    now_in_tz,
    recurrence_matches,
    sector_health_status,
    task_status_snapshot,
    tz_for_name,
)


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)


def _maybe_json(value: Any) -> Any:
    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception:
            return value
    return value


def _first_or_none(rows: list[dict[str, Any]]) -> dict[str, Any]:
    return rows[0] if rows else {}


def get_scope_defaults() -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                select
                    o.id as organization_id,
                    o.name as organization_name,
                    o.slug as organization_slug,
                    o.timezone as organization_timezone,
                    u.id as unit_id,
                    u.name as unit_name,
                    u.slug as unit_slug,
                    u.timezone as unit_timezone
                from organizations o
                join units u on u.organization_id = o.id and u.is_active = true
                where o.is_active = true
                order by u.sort_order asc, u.created_at asc
                limit 1
                """
            )
            return dict(cur.fetchone() or {})


def get_user_context(user_id: str) -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                select
                    u.id,
                    u.organization_id,
                    u.unit_id,
                    u.email,
                    u.full_name,
                    u.role,
                    u.is_active,
                    u.is_demo,
                    p.display_name,
                    p.title,
                    p.avatar_url,
                    p.phone,
                    p.bio,
                    o.name as organization_name,
                    o.slug as organization_slug,
                    o.timezone as organization_timezone,
                    unit.name as unit_name,
                    unit.slug as unit_slug,
                    unit.timezone as unit_timezone
                from users u
                left join user_profiles p on p.user_id = u.id
                join organizations o on o.id = u.organization_id
                left join units unit on unit.id = u.unit_id
                where u.id = %s
                """,
                (user_id,),
            )
            return dict(cur.fetchone() or {})


def list_users(unit_id: str) -> list[dict[str, Any]]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                select
                    u.id,
                    u.organization_id,
                    u.unit_id,
                    u.email,
                    u.full_name,
                    u.role,
                    u.is_active,
                    u.is_demo,
                    coalesce(p.display_name, u.full_name) as display_name,
                    p.title,
                    p.avatar_url,
                    p.phone,
                    p.bio,
                    array_remove(array_agg(distinct s.id) filter (where s.id is not null), null) as sector_ids,
                    array_remove(array_agg(distinct s.slug) filter (where s.slug is not null), null) as sector_slugs,
                    array_remove(array_agg(distinct s.name) filter (where s.name is not null), null) as sector_names,
                    u.created_at,
                    u.updated_at
                from users u
                left join user_profiles p on p.user_id = u.id
                left join user_sector_assignments usa on usa.user_id = u.id and usa.is_active = true
                left join sectors s on s.id = usa.sector_id
                where u.unit_id = %s
                group by u.id, p.display_name, p.title, p.avatar_url, p.phone, p.bio
                order by u.role asc, u.full_name asc
                """,
                (unit_id,),
            )
            return [dict(row) for row in cur.fetchall()]


def list_user_sector_assignments(user_id: str) -> list[dict[str, Any]]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                select
                    usa.id,
                    usa.user_id,
                    usa.sector_id,
                    usa.is_primary,
                    usa.is_active,
                    usa.created_at,
                    s.name as sector_name,
                    s.slug as sector_slug
                from user_sector_assignments usa
                join sectors s on s.id = usa.sector_id
                where usa.user_id = %s and usa.is_active = true
                order by usa.is_primary desc, s.sort_order asc, s.name asc
                """,
                (user_id,),
            )
            return [dict(row) for row in cur.fetchall()]


def list_sectors(unit_id: str) -> list[dict[str, Any]]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                select
                    s.id,
                    s.organization_id,
                    s.unit_id,
                    s.name,
                    s.slug,
                    s.description,
                    s.responsible_user_id,
                    s.color,
                    s.icon,
                    s.status,
                    s.sort_order,
                    s.metadata_json,
                    s.created_at,
                    s.updated_at,
                    u.full_name as responsible_name,
                    u.role as responsible_role,
                    p.display_name as responsible_display_name
                from sectors s
                left join users u on u.id = s.responsible_user_id
                left join user_profiles p on p.user_id = u.id
                where s.unit_id = %s
                order by s.sort_order asc, s.name asc
                """,
                (unit_id,),
            )
            return [dict(row) for row in cur.fetchall()]


def get_sector_by_slug(unit_id: str, slug: str) -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                select
                    s.id,
                    s.organization_id,
                    s.unit_id,
                    s.name,
                    s.slug,
                    s.description,
                    s.responsible_user_id,
                    s.color,
                    s.icon,
                    s.status,
                    s.sort_order,
                    s.metadata_json,
                    s.created_at,
                    s.updated_at,
                    u.full_name as responsible_name,
                    p.display_name as responsible_display_name
                from sectors s
                left join users u on u.id = s.responsible_user_id
                left join user_profiles p on p.user_id = u.id
                where s.unit_id = %s and s.slug = %s
                limit 1
                """,
                (unit_id, slug),
            )
            return dict(cur.fetchone() or {})


def upsert_sector(payload: dict[str, Any]) -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                insert into sectors (
                    id, organization_id, unit_id, name, slug, description, responsible_user_id, color, icon, status, sort_order, metadata_json
                ) values (
                    %(id)s, %(organization_id)s, %(unit_id)s, %(name)s, %(slug)s, %(description)s, %(responsible_user_id)s,
                    %(color)s, %(icon)s, %(status)s, %(sort_order)s, %(metadata_json)s::jsonb
                )
                on conflict (id) do update set
                    organization_id = excluded.organization_id,
                    unit_id = excluded.unit_id,
                    name = excluded.name,
                    slug = excluded.slug,
                    description = excluded.description,
                    responsible_user_id = excluded.responsible_user_id,
                    color = excluded.color,
                    icon = excluded.icon,
                    status = excluded.status,
                    sort_order = excluded.sort_order,
                    metadata_json = excluded.metadata_json,
                    updated_at = now()
                returning *
                """,
                {
                    "id": payload["id"],
                    "organization_id": payload["organization_id"],
                    "unit_id": payload["unit_id"],
                    "name": payload["name"],
                    "slug": payload["slug"],
                    "description": payload.get("description", ""),
                    "responsible_user_id": payload.get("responsible_user_id"),
                    "color": payload.get("color", "#0f766e"),
                    "icon": payload.get("icon", "building-2"),
                    "status": payload.get("status", "active"),
                    "sort_order": payload.get("sort_order", 0),
                    "metadata_json": _json(payload.get("metadata_json") or payload.get("metadata") or {}),
                },
            )
            return dict(cur.fetchone() or {})


def upsert_user(payload: dict[str, Any]) -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                insert into users (
                    id, organization_id, unit_id, email, full_name, role, is_active, is_demo
                ) values (%(id)s, %(organization_id)s, %(unit_id)s, %(email)s, %(full_name)s, %(role)s, %(is_active)s, %(is_demo)s)
                on conflict (id) do update set
                    organization_id = excluded.organization_id,
                    unit_id = excluded.unit_id,
                    email = excluded.email,
                    full_name = excluded.full_name,
                    role = excluded.role,
                    is_active = excluded.is_active,
                    is_demo = excluded.is_demo,
                    updated_at = now()
                returning *
                """,
                {
                    "id": payload["id"],
                    "organization_id": payload["organization_id"],
                    "unit_id": payload.get("unit_id"),
                    "email": payload.get("email", ""),
                    "full_name": payload.get("full_name", payload.get("display_name", "")),
                    "role": payload.get("role", "collaborator"),
                    "is_active": payload.get("is_active", True),
                    "is_demo": payload.get("is_demo", False),
                },
            )
            return dict(cur.fetchone() or {})


def upsert_user_profile(payload: dict[str, Any]) -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                insert into user_profiles (user_id, display_name, title, avatar_url, phone, bio, metadata_json)
                values (%(user_id)s, %(display_name)s, %(title)s, %(avatar_url)s, %(phone)s, %(bio)s, %(metadata_json)s::jsonb)
                on conflict (user_id) do update set
                    display_name = excluded.display_name,
                    title = excluded.title,
                    avatar_url = excluded.avatar_url,
                    phone = excluded.phone,
                    bio = excluded.bio,
                    metadata_json = excluded.metadata_json,
                    updated_at = now()
                returning *
                """,
                {
                    "user_id": payload["user_id"],
                    "display_name": payload.get("display_name", payload.get("full_name", "")),
                    "title": payload.get("title", ""),
                    "avatar_url": payload.get("avatar_url", ""),
                    "phone": payload.get("phone", ""),
                    "bio": payload.get("bio", ""),
                    "metadata_json": _json(payload.get("metadata_json") or payload.get("metadata") or {}),
                },
            )
            return dict(cur.fetchone() or {})


def upsert_user_sector_assignment(payload: dict[str, Any]) -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                insert into user_sector_assignments (user_id, sector_id, is_primary, is_active)
                values (%(user_id)s, %(sector_id)s, %(is_primary)s, %(is_active)s)
                on conflict (user_id, sector_id) do update set
                    is_primary = excluded.is_primary,
                    is_active = excluded.is_active
                returning *
                """,
                {
                    "user_id": payload["user_id"],
                    "sector_id": payload["sector_id"],
                    "is_primary": payload.get("is_primary", False),
                    "is_active": payload.get("is_active", True),
                },
            )
            return dict(cur.fetchone() or {})


def replace_user_sector_assignments(user_id: str, sector_ids: list[str]) -> list[dict[str, Any]]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                update user_sector_assignments
                set is_active = false
                where user_id = %s
                """,
                (user_id,),
            )
            results: list[dict[str, Any]] = []
            for sector_id in sector_ids:
                cur.execute(
                    """
                    insert into user_sector_assignments (user_id, sector_id, is_primary, is_active)
                    values (%s, %s, false, true)
                    on conflict (user_id, sector_id) do update set
                        is_active = true,
                        updated_at = now()
                    returning *
                    """,
                    (user_id, sector_id),
                )
                row = cur.fetchone()
                if row:
                    results.append(dict(row))
            connection.commit()
            return results


def upsert_system_setting(payload: dict[str, Any]) -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                insert into system_settings (organization_id, unit_id, key, value_json, updated_by)
                values (%(organization_id)s, %(unit_id)s, %(key)s, %(value_json)s::jsonb, %(updated_by)s)
                on conflict (unit_id, key) do update set
                    value_json = excluded.value_json,
                    updated_by = excluded.updated_by,
                    updated_at = now()
                returning *
                """,
                {
                    "organization_id": payload["organization_id"],
                    "unit_id": payload["unit_id"],
                    "key": payload["key"],
                    "value_json": _json(payload.get("value_json") or payload.get("value") or {}),
                    "updated_by": payload.get("updated_by"),
                },
            )
            return dict(cur.fetchone() or {})


def list_system_settings(unit_id: str) -> list[dict[str, Any]]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                select id, organization_id, unit_id, key, value_json, updated_by, created_at, updated_at
                from system_settings
                where unit_id = %s
                order by key asc
                """,
                (unit_id,),
            )
            return [dict(row) for row in cur.fetchall()]


def list_task_templates(unit_id: str) -> list[dict[str, Any]]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                select
                    t.id,
                    t.organization_id,
                    t.unit_id,
                    t.sector_id,
                    s.name as sector_name,
                    s.slug as sector_slug,
                    t.recurrence_rule_id,
                    t.title,
                    t.description,
                    t.task_type,
                    t.default_assignee_id,
                    u.full_name as default_assignee_name,
                    t.start_time,
                    t.due_time,
                    t.priority,
                    t.is_critical,
                    t.goal_target,
                    t.goal_unit,
                    t.goal_group_key,
                    t.requires_comment_on_completion,
                    t.requires_evidence,
                    t.requires_manager_review,
                    t.allow_not_applicable,
                    t.is_conditional,
                    t.instructions,
                    t.active,
                    t.archived_at,
                    t.created_by,
                    t.updated_by,
                    t.created_at,
                    t.updated_at,
                    r.recurrence_type,
                    r.interval_value,
                    r.weekdays,
                    r.month_days,
                    r.weeks_of_month,
                    r.custom_rule_json,
                    r.start_date,
                    r.end_date,
                    coalesce(subs.subtasks_count, 0) as subtasks_count
                from task_templates t
                join sectors s on s.id = t.sector_id
                left join users u on u.id = t.default_assignee_id
                left join task_recurrence_rules r on r.id = t.recurrence_rule_id
                left join (
                    select task_template_id, count(*) as subtasks_count
                    from task_template_subtasks
                    group by task_template_id
                ) subs on subs.task_template_id = t.id
                where t.unit_id = %s
                order by s.sort_order asc, t.start_time asc, t.created_at asc
                """,
                (unit_id,),
            )
            return [dict(row) for row in cur.fetchall()]


def get_task_template(template_id: str) -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                select
                    t.*,
                    s.name as sector_name,
                    s.slug as sector_slug,
                    s.color as sector_color,
                    s.icon as sector_icon,
                    s.status as sector_status,
                    u.full_name as default_assignee_name,
                    r.recurrence_type,
                    r.interval_value,
                    r.weekdays,
                    r.month_days,
                    r.weeks_of_month,
                    r.custom_rule_json,
                    r.start_date,
                    r.end_date
                from task_templates t
                join sectors s on s.id = t.sector_id
                left join users u on u.id = t.default_assignee_id
                left join task_recurrence_rules r on r.id = t.recurrence_rule_id
                where t.id = %s
                limit 1
                """,
                (template_id,),
            )
            template = dict(cur.fetchone() or {})
            if not template:
                return {}
            cur.execute(
                """
                select
                    id,
                    task_template_id,
                    title,
                    sort_order,
                    is_required,
                    created_at,
                    updated_at
                from task_template_subtasks
                where task_template_id = %s
                order by sort_order asc, id asc
                """,
                (template_id,),
            )
            template["subtasks"] = [dict(row) for row in cur.fetchall()]
            return template


def list_task_template_subtasks(template_id: str) -> list[dict[str, Any]]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                select id, task_template_id, title, sort_order, is_required, created_at, updated_at
                from task_template_subtasks
                where task_template_id = %s
                order by sort_order asc, id asc
                """,
                (template_id,),
            )
            return [dict(row) for row in cur.fetchall()]


def upsert_task_template(payload: dict[str, Any]) -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            recurrence_rule = payload.get("recurrence_rule") or {}
            recurrence_rule_id = payload.get("recurrence_rule_id")
            if recurrence_rule and not recurrence_rule_id:
                recurrence_rule_id = payload["id"] + "::rule"
                cur.execute(
                    """
                    insert into task_recurrence_rules (
                        id, organization_id, unit_id, recurrence_type, interval_value, weekdays, month_days,
                        weeks_of_month, custom_rule_json, start_date, end_date, is_active
                    ) values (
                        %(id)s, %(organization_id)s, %(unit_id)s, %(recurrence_type)s, %(interval_value)s,
                        %(weekdays)s, %(month_days)s, %(weeks_of_month)s, %(custom_rule_json)s::jsonb,
                        %(start_date)s, %(end_date)s, true
                    )
                    on conflict (id) do update set
                        recurrence_type = excluded.recurrence_type,
                        interval_value = excluded.interval_value,
                        weekdays = excluded.weekdays,
                        month_days = excluded.month_days,
                        weeks_of_month = excluded.weeks_of_month,
                        custom_rule_json = excluded.custom_rule_json,
                        start_date = excluded.start_date,
                        end_date = excluded.end_date,
                        updated_at = now()
                    """,
                    {
                        "id": recurrence_rule_id,
                        "organization_id": payload["organization_id"],
                        "unit_id": payload["unit_id"],
                        "recurrence_type": recurrence_rule.get("recurrence_type", "DAILY"),
                        "interval_value": recurrence_rule.get("interval_value", 1),
                        "weekdays": recurrence_rule.get("weekdays") or [],
                        "month_days": recurrence_rule.get("month_days") or [],
                        "weeks_of_month": recurrence_rule.get("weeks_of_month") or [],
                        "custom_rule_json": _json(recurrence_rule.get("custom_rule_json") or {}),
                        "start_date": recurrence_rule.get("start_date"),
                        "end_date": recurrence_rule.get("end_date"),
                    },
                )
            cur.execute(
                """
                insert into task_templates (
                    id, organization_id, unit_id, sector_id, recurrence_rule_id, title, description, task_type,
                    default_assignee_id, start_time, due_time, priority, is_critical, goal_target, goal_unit, goal_group_key,
                    requires_comment_on_completion, requires_evidence, requires_manager_review, allow_not_applicable,
                    is_conditional, instructions, active, archived_at, created_by, updated_by
                ) values (
                    %(id)s, %(organization_id)s, %(unit_id)s, %(sector_id)s, %(recurrence_rule_id)s, %(title)s, %(description)s,
                    %(task_type)s, %(default_assignee_id)s, %(start_time)s, %(due_time)s, %(priority)s, %(is_critical)s,
                    %(goal_target)s, %(goal_unit)s, %(goal_group_key)s, %(requires_comment_on_completion)s, %(requires_evidence)s,
                    %(requires_manager_review)s, %(allow_not_applicable)s, %(is_conditional)s, %(instructions)s, %(active)s,
                    %(archived_at)s, %(created_by)s, %(updated_by)s
                )
                on conflict (id) do update set
                    organization_id = excluded.organization_id,
                    unit_id = excluded.unit_id,
                    sector_id = excluded.sector_id,
                    recurrence_rule_id = excluded.recurrence_rule_id,
                    title = excluded.title,
                    description = excluded.description,
                    task_type = excluded.task_type,
                    default_assignee_id = excluded.default_assignee_id,
                    start_time = excluded.start_time,
                    due_time = excluded.due_time,
                    priority = excluded.priority,
                    is_critical = excluded.is_critical,
                    goal_target = excluded.goal_target,
                    goal_unit = excluded.goal_unit,
                    goal_group_key = excluded.goal_group_key,
                    requires_comment_on_completion = excluded.requires_comment_on_completion,
                    requires_evidence = excluded.requires_evidence,
                    requires_manager_review = excluded.requires_manager_review,
                    allow_not_applicable = excluded.allow_not_applicable,
                    is_conditional = excluded.is_conditional,
                    instructions = excluded.instructions,
                    active = excluded.active,
                    archived_at = excluded.archived_at,
                    updated_by = excluded.updated_by,
                    updated_at = now()
                returning *
                """,
                {
                    "id": payload["id"],
                    "organization_id": payload["organization_id"],
                    "unit_id": payload["unit_id"],
                    "sector_id": payload["sector_id"],
                    "recurrence_rule_id": recurrence_rule_id,
                    "title": payload["title"],
                    "description": payload.get("description", ""),
                    "task_type": payload.get("task_type", "STANDARD"),
                    "default_assignee_id": payload.get("default_assignee_id"),
                    "start_time": payload.get("start_time"),
                    "due_time": payload.get("due_time"),
                    "priority": payload.get("priority", "NORMAL"),
                    "is_critical": payload.get("is_critical", False),
                    "goal_target": payload.get("goal_target"),
                    "goal_unit": payload.get("goal_unit", ""),
                    "goal_group_key": payload.get("goal_group_key", ""),
                    "requires_comment_on_completion": payload.get("requires_comment_on_completion", False),
                    "requires_evidence": payload.get("requires_evidence", False),
                    "requires_manager_review": payload.get("requires_manager_review", False),
                    "allow_not_applicable": payload.get("allow_not_applicable", True),
                    "is_conditional": payload.get("is_conditional", False),
                    "instructions": payload.get("instructions", ""),
                    "active": payload.get("active", True),
                    "archived_at": payload.get("archived_at"),
                    "created_by": payload.get("created_by"),
                    "updated_by": payload.get("updated_by"),
                },
            )
            template = dict(cur.fetchone() or {})
            subtasks = payload.get("subtasks")
            if subtasks is not None:
                cur.execute("delete from task_template_subtasks where task_template_id = %s", (payload["id"],))
                for index, subtask in enumerate(subtasks, start=1):
                    subtask_id = subtask.get("id") or f"{payload['id']}::subtask::{index}"
                    cur.execute(
                        """
                        insert into task_template_subtasks (
                            id, task_template_id, title, sort_order, is_required
                        ) values (%s, %s, %s, %s, %s)
                        on conflict (id) do update set
                            title = excluded.title,
                            sort_order = excluded.sort_order,
                            is_required = excluded.is_required,
                            updated_at = now()
                        """,
                        (
                            subtask_id,
                            payload["id"],
                            subtask["title"],
                            subtask.get("sort_order", index),
                            subtask.get("is_required", True),
                        ),
                    )
            return template


def duplicate_task_template(template_id: str, actor_user_id: str | None = None) -> dict[str, Any]:
    template = get_task_template(template_id)
    if not template:
        return {}
    new_id = f"{template_id}::copy::{uuid4().hex[:8]}"
    template["id"] = new_id
    template["title"] = f"{template['title']} (cópia)"
    template["created_by"] = actor_user_id
    template["updated_by"] = actor_user_id
    template["subtasks"] = [
        {
            "title": subtask["title"],
            "sort_order": subtask["sort_order"],
            "is_required": subtask["is_required"],
        }
        for subtask in template.get("subtasks", [])
    ]
    return upsert_task_template(template)


def archive_task_template(template_id: str, active: bool, actor_user_id: str | None = None) -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                update task_templates
                set active = %s,
                    archived_at = case when %s then null else coalesce(archived_at, now()) end,
                    updated_by = %s,
                    updated_at = now()
                where id = %s
                returning *
                """,
                (active, active, actor_user_id, template_id),
            )
            return dict(cur.fetchone() or {})


def get_daily_operation(unit_id: str, operational_date: date) -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                select *
                from daily_operations
                where unit_id = %s and operational_date = %s
                limit 1
                """,
                (unit_id, operational_date),
            )
            return dict(cur.fetchone() or {})


def upsert_daily_operation(
    organization_id: str,
    unit_id: str,
    operational_date: date,
    timezone_name: str,
    sync_source: str,
) -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                insert into daily_operations (
                    organization_id, unit_id, operational_date, timezone, sync_source, generated_at
                ) values (%s, %s, %s, %s, %s, now())
                on conflict (unit_id, operational_date) do update set
                    timezone = excluded.timezone,
                    sync_source = excluded.sync_source,
                    updated_at = now()
                returning *
                """,
                (organization_id, unit_id, operational_date, timezone_name, sync_source),
            )
            return dict(cur.fetchone() or {})


def list_daily_task_instances(unit_id: str, operational_date: date) -> list[dict[str, Any]]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                select
                    dti.*,
                    do.timezone as timezone,
                    s.slug as sector_slug,
                    s.name as sector_name,
                    s.color as sector_color,
                    s.icon as sector_icon,
                    s.sort_order as sector_sort_order,
                    u.full_name as assignee_name,
                    u.role as assignee_role,
                    coalesce(subs.total_subtasks, 0) as total_subtasks,
                    coalesce(subs.completed_subtasks, 0) as completed_subtasks,
                    coalesce(goals.goal_current, 0) as goal_progress
                from daily_task_instances dti
                join daily_operations do on do.id = dti.daily_operation_id
                join sectors s on s.id = dti.sector_id
                left join users u on u.id = dti.assignee_id
                left join (
                    select daily_task_instance_id, count(*) as total_subtasks, count(*) filter (where is_completed) as completed_subtasks
                    from daily_task_subtask_instances
                    group by daily_task_instance_id
                ) subs on subs.daily_task_instance_id = dti.id
                left join (
                    select daily_task_instance_id, coalesce(sum(quantity), 0) as goal_current
                    from task_goal_entries
                    group by daily_task_instance_id
                ) goals on goals.daily_task_instance_id = dti.id
                where dti.unit_id = %s and dti.operational_date = %s
                order by dti.scheduled_start asc, s.sort_order asc, dti.created_at asc
                """,
                (unit_id, operational_date),
            )
            return [dict(row) for row in cur.fetchall()]


def list_daily_task_instances_by_sector(unit_id: str, operational_date: date, sector_id: str) -> list[dict[str, Any]]:
    return [task for task in list_daily_task_instances(unit_id, operational_date) if task["sector_id"] == sector_id]


def get_daily_task_instance(task_id: str) -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                select
                    dti.*,
                    do.timezone as timezone,
                    s.slug as sector_slug,
                    s.name as sector_name,
                    s.color as sector_color,
                    s.icon as sector_icon,
                    u.full_name as assignee_name,
                    coalesce(subs.total_subtasks, 0) as total_subtasks,
                    coalesce(subs.completed_subtasks, 0) as completed_subtasks,
                    coalesce(goals.goal_current, 0) as goal_progress
                from daily_task_instances dti
                join daily_operations do on do.id = dti.daily_operation_id
                join sectors s on s.id = dti.sector_id
                left join users u on u.id = dti.assignee_id
                left join (
                    select daily_task_instance_id, count(*) as total_subtasks, count(*) filter (where is_completed) as completed_subtasks
                    from daily_task_subtask_instances
                    group by daily_task_instance_id
                ) subs on subs.daily_task_instance_id = dti.id
                left join (
                    select daily_task_instance_id, coalesce(sum(quantity), 0) as goal_current
                    from task_goal_entries
                    group by daily_task_instance_id
                ) goals on goals.daily_task_instance_id = dti.id
                where dti.id::text = %s
                limit 1
                """,
                (task_id,),
            )
            return dict(cur.fetchone() or {})


def list_task_subtasks(task_id: str) -> list[dict[str, Any]]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                select
                    id,
                    daily_task_instance_id,
                    task_template_subtask_id,
                    title_snapshot,
                    sort_order,
                    is_required,
                    is_completed,
                    completed_at,
                    completed_by,
                    notes,
                    created_at,
                    updated_at
                from daily_task_subtask_instances
                where daily_task_instance_id::text = %s
                order by sort_order asc, created_at asc
                """,
                (task_id,),
            )
            return [dict(row) for row in cur.fetchall()]


def list_task_goal_entries(task_id: str) -> list[dict[str, Any]]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                select id, daily_task_instance_id, recorded_by, quantity, note, created_at
                from task_goal_entries
                where daily_task_instance_id::text = %s
                order by created_at asc
                """,
                (task_id,),
            )
            return [dict(row) for row in cur.fetchall()]


def list_task_comments(task_id: str) -> list[dict[str, Any]]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                select c.id, c.daily_task_instance_id, c.user_id, c.comment_type, c.body, c.created_at, u.full_name as user_name
                from task_comments c
                left join users u on u.id = c.user_id
                where c.daily_task_instance_id::text = %s
                order by c.created_at asc
                """,
                (task_id,),
            )
            return [dict(row) for row in cur.fetchall()]


def list_task_evidences(task_id: str) -> list[dict[str, Any]]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                select id, daily_task_instance_id, user_id, evidence_type, label, payload_json, created_at
                from task_evidences
                where daily_task_instance_id::text = %s
                order by created_at asc
                """,
                (task_id,),
            )
            return [dict(row) for row in cur.fetchall()]


def _ensure_subtasks(cur: Any, task: dict[str, Any], template_subtasks: list[dict[str, Any]]) -> None:
    cur.execute("select 1 from daily_task_subtask_instances where daily_task_instance_id = %s limit 1", (task["id"],))
    if cur.fetchone():
        return
    for index, template_subtask in enumerate(template_subtasks, start=1):
        cur.execute(
            """
            insert into daily_task_subtask_instances (
                daily_task_instance_id, task_template_subtask_id, title_snapshot, sort_order, is_required
            ) values (%s, %s, %s, %s, %s)
            """,
            (
                task["id"],
                template_subtask["id"],
                template_subtask["title"],
                template_subtask["sort_order"] if template_subtask.get("sort_order") is not None else index,
                template_subtask.get("is_required", True),
            ),
        )


def sync_daily_operation(
    organization_id: str,
    unit_id: str,
    operational_date: date,
    timezone_name: str,
    sync_source: str,
    actor_user_id: str | None = None,
) -> dict[str, Any]:
    operation = upsert_daily_operation(organization_id, unit_id, operational_date, timezone_name, sync_source)
    templates = list_task_templates(unit_id)
    now = now_in_tz(timezone_name)

    with get_connection() as connection:
        with connection.cursor() as cur:
            for template in templates:
                if not template.get("active", True):
                    continue
                recurrence_rule = {
                    "recurrence_type": template.get("recurrence_type"),
                    "interval_value": template.get("interval_value"),
                    "weekdays": template.get("weekdays") or [],
                    "month_days": template.get("month_days") or [],
                    "weeks_of_month": template.get("weeks_of_month") or [],
                    "custom_rule_json": template.get("custom_rule_json") or {},
                    "start_date": template.get("start_date"),
                    "end_date": template.get("end_date"),
                }
                if not recurrence_matches(recurrence_rule, operational_date):
                    continue
                occurrence_key = str(template.get("start_time") or "default")
                cur.execute(
                    """
                    insert into daily_task_instances (
                        task_template_id, daily_operation_id, organization_id, unit_id, sector_id, assignee_id,
                        operational_date, occurrence_key, title_snapshot, description_snapshot, instructions_snapshot,
                        sector_name_snapshot, assignee_name_snapshot, task_type_snapshot, priority_snapshot,
                        goal_target_snapshot, goal_unit_snapshot, goal_group_key_snapshot, scheduled_start, scheduled_due, status,
                        review_status, is_critical_snapshot, requires_manager_review, requires_comment_on_completion,
                        requires_evidence, allow_not_applicable, is_conditional, subtasks_total, subtasks_completed,
                        goal_current, updated_at
                    ) values (
                        %(task_template_id)s, %(daily_operation_id)s, %(organization_id)s, %(unit_id)s, %(sector_id)s, %(assignee_id)s,
                        %(operational_date)s, %(occurrence_key)s, %(title_snapshot)s, %(description_snapshot)s, %(instructions_snapshot)s,
                        %(sector_name_snapshot)s, %(assignee_name_snapshot)s, %(task_type_snapshot)s, %(priority_snapshot)s,
                        %(goal_target_snapshot)s, %(goal_unit_snapshot)s, %(goal_group_key_snapshot)s, %(scheduled_start)s, %(scheduled_due)s, %(status)s,
                        %(review_status)s, %(is_critical_snapshot)s, %(requires_manager_review)s, %(requires_comment_on_completion)s,
                        %(requires_evidence)s, %(allow_not_applicable)s, %(is_conditional)s, %(subtasks_total)s, %(subtasks_completed)s,
                        %(goal_current)s, now()
                    )
                    on conflict (task_template_id, operational_date, occurrence_key) do update set
                        daily_operation_id = excluded.daily_operation_id,
                        organization_id = excluded.organization_id,
                        unit_id = excluded.unit_id,
                        sector_id = excluded.sector_id,
                        assignee_id = excluded.assignee_id,
                        title_snapshot = excluded.title_snapshot,
                        description_snapshot = excluded.description_snapshot,
                        instructions_snapshot = excluded.instructions_snapshot,
                        sector_name_snapshot = excluded.sector_name_snapshot,
                        assignee_name_snapshot = excluded.assignee_name_snapshot,
                        task_type_snapshot = excluded.task_type_snapshot,
                        priority_snapshot = excluded.priority_snapshot,
                        goal_target_snapshot = excluded.goal_target_snapshot,
                        goal_unit_snapshot = excluded.goal_unit_snapshot,
                        goal_group_key_snapshot = excluded.goal_group_key_snapshot,
                        scheduled_start = excluded.scheduled_start,
                        scheduled_due = excluded.scheduled_due,
                        status = case when daily_task_instances.status = %s then %s else daily_task_instances.status end,
                        review_status = excluded.review_status,
                        is_critical_snapshot = excluded.is_critical_snapshot,
                        requires_manager_review = excluded.requires_manager_review,
                        requires_comment_on_completion = excluded.requires_comment_on_completion,
                        requires_evidence = excluded.requires_evidence,
                        allow_not_applicable = excluded.allow_not_applicable,
                        is_conditional = excluded.is_conditional,
                        subtasks_total = excluded.subtasks_total,
                        subtasks_completed = excluded.subtasks_completed,
                        goal_current = excluded.goal_current,
                        updated_at = now()
                    returning *
                    """,
                    {
                        "task_template_id": template["id"],
                        "daily_operation_id": operation["id"],
                        "organization_id": template["organization_id"],
                        "unit_id": unit_id,
                        "sector_id": template["sector_id"],
                        "assignee_id": template.get("default_assignee_id"),
                        "operational_date": operational_date,
                        "occurrence_key": occurrence_key,
                        "title_snapshot": template["title"],
                        "description_snapshot": template.get("description", ""),
                        "instructions_snapshot": template.get("instructions", ""),
                        "sector_name_snapshot": template.get("sector_name", ""),
                        "assignee_name_snapshot": template.get("default_assignee_name") or "",
                        "task_type_snapshot": template.get("task_type", "STANDARD"),
                        "priority_snapshot": template.get("priority", "NORMAL"),
                        "goal_target_snapshot": template.get("goal_target"),
                        "goal_unit_snapshot": template.get("goal_unit", ""),
                        "goal_group_key_snapshot": template.get("goal_group_key", ""),
                        "scheduled_start": template.get("start_time"),
                        "scheduled_due": template.get("due_time"),
                        "status": TASK_STATUS_PENDING,
                        "review_status": "NONE",
                        "is_critical_snapshot": bool(template.get("is_critical")),
                        "requires_manager_review": bool(template.get("requires_manager_review")),
                        "requires_comment_on_completion": bool(template.get("requires_comment_on_completion")),
                        "requires_evidence": bool(template.get("requires_evidence")),
                        "allow_not_applicable": bool(template.get("allow_not_applicable", True)),
                        "is_conditional": bool(template.get("is_conditional")),
                        "subtasks_total": int(template.get("subtasks_count") or 0),
                        "subtasks_completed": 0,
                        "goal_current": 0,
                    },
                )
                inserted = dict(cur.fetchone() or {})
                template_subtasks = list_task_template_subtasks(template["id"])
                if template_subtasks:
                    _ensure_subtasks(cur, inserted, template_subtasks)
            connection.commit()

    refresh_task_runtime_state(unit_id, operational_date, timezone_name, actor_user_id=actor_user_id)
    refresh_alerts(unit_id, operational_date, timezone_name, actor_user_id=actor_user_id)
    return get_daily_operation_summary(unit_id, operational_date, timezone_name)


def refresh_task_runtime_state(
    unit_id: str,
    operational_date: date,
    timezone_name: str,
    actor_user_id: str | None = None,
) -> None:
    now = now_in_tz(timezone_name)
    tasks = list_daily_task_instances(unit_id, operational_date)
    with get_connection() as connection:
        with connection.cursor() as cur:
            for task in tasks:
                snapshot = task_status_snapshot(task, now)
                is_late = snapshot.is_overdue or (
                    task.get("completed_at") is not None and late_minutes_from_completion(task, task.get("completed_at")) > 0
                )
                late_minutes = snapshot.overdue_minutes if snapshot.is_overdue else late_minutes_from_completion(task, task.get("completed_at"))
                status = task["status"]
                if snapshot.is_overdue and status in {TASK_STATUS_PENDING, TASK_STATUS_IN_PROGRESS}:
                    status = TASK_STATUS_OVERDUE
                cur.execute(
                    """
                    update daily_task_instances
                    set is_late = %s,
                        late_minutes = %s,
                        status = case
                            when status = %s then %s
                            when status = %s then status
                            else status
                        end,
                        updated_at = now()
                    where id = %s
                    """,
                    (
                        is_late,
                        late_minutes,
                        TASK_STATUS_PENDING,
                        status,
                        TASK_STATUS_COMPLETED,
                        task["id"],
                    ),
                )


def refresh_alerts(
    unit_id: str,
    operational_date: date,
    timezone_name: str,
    actor_user_id: str | None = None,
) -> list[dict[str, Any]]:
    now = now_in_tz(timezone_name)
    tasks = list_daily_task_instances(unit_id, operational_date)
    sectors = list_sectors(unit_id)
    operation = get_daily_operation(unit_id, operational_date)
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute("delete from alerts where unit_id = %s and triggered_at::date = %s and status = 'active'", (unit_id, operational_date))
            cur.execute("delete from alerts where unit_id = %s and triggered_at::date = %s and status = 'resolved'", (unit_id, operational_date))
            for task in tasks:
                snapshot = task_status_snapshot(task, now)
                if snapshot.is_overdue:
                    alert_type = "TASK_OVERDUE"
                    severity = "warning"
                    if task.get("is_critical_snapshot"):
                        alert_type = "CRITICAL_TASK_OVERDUE"
                        severity = "critical"
                    dedup_key = f"{alert_type}:{task['id']}"
                    cur.execute(
                        """
                        insert into alerts (
                            organization_id, unit_id, sector_id, daily_task_instance_id, alert_type, severity,
                            title, description, status, dedup_key, triggered_at, metadata_json, created_at, updated_at
                        ) values (%s, %s, %s, %s, %s, %s, %s, %s, 'active', %s, now(), %s::jsonb, now(), now())
                        on conflict (unit_id, dedup_key) do update set
                            severity = excluded.severity,
                            title = excluded.title,
                            description = excluded.description,
                            status = 'active',
                            metadata_json = excluded.metadata_json,
                            triggered_at = now(),
                            updated_at = now()
                        """,
                        (
                            task["organization_id"],
                            unit_id,
                            task["sector_id"],
                            task["id"],
                            alert_type,
                            severity,
                            "Tarefa crítica pendente" if task.get("is_critical_snapshot") else "Tarefa atrasada",
                            f"{task['title_snapshot']} está atrasada há {snapshot.overdue_minutes} minutos.",
                            dedup_key,
                            _json({"sector_name": task["sector_name"], "late_minutes": snapshot.overdue_minutes}),
                        ),
                    )
            by_sector: dict[str, list[dict[str, Any]]] = {}
            for task in tasks:
                by_sector.setdefault(task["sector_id"], []).append(task)
            for sector in sectors:
                sector_tasks = by_sector.get(sector["id"], [])
                health = sector_health_status(sector_tasks, now)
                if health["state"] in {"ATRASADO", "CRITICO"}:
                    dedup_key = f"SECTOR_DELAYED:{sector['id']}:{operational_date.isoformat()}"
                    overdue_count = health["overdue_count"]
                    cur.execute(
                        """
                        insert into alerts (
                            organization_id, unit_id, sector_id, alert_type, severity, title, description, status,
                            dedup_key, triggered_at, metadata_json, created_at, updated_at
                        ) values (%s, %s, %s, 'SECTOR_DELAYED', %s, %s, %s, 'active', %s, now(), %s::jsonb, now(), now())
                        on conflict (unit_id, dedup_key) do update set
                            severity = excluded.severity,
                            title = excluded.title,
                            description = excluded.description,
                            status = 'active',
                            metadata_json = excluded.metadata_json,
                            triggered_at = now(),
                            updated_at = now()
                        """,
                        (
                            operation["organization_id"],
                            unit_id,
                            sector["id"],
                            "critical" if health["state"] == "CRITICO" else "warning",
                            f"{sector['name']} em {health['state'].lower()}",
                            f"{overdue_count} tarefa(s) atrasada(s) no setor.",
                            dedup_key,
                            _json(health),
                        ),
                    )
            connection.commit()
    return list_alerts(unit_id, status="active", limit=200)


def list_alerts(unit_id: str, status: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            where = ["unit_id = %s"]
            params: list[Any] = [unit_id]
            if status:
                where.append("status = %s")
                params.append(status)
            cur.execute(
                f"""
                select
                    a.*,
                    s.name as sector_name,
                    s.slug as sector_slug,
                    dti.title_snapshot as task_title,
                    dti.scheduled_due as task_due
                from alerts a
                left join sectors s on s.id = a.sector_id
                left join daily_task_instances dti on dti.id = a.daily_task_instance_id
                where {' and '.join(where)}
                order by a.triggered_at desc, a.created_at desc
                limit %s
                """,
                (*params, limit),
            )
            return [dict(row) for row in cur.fetchall()]


def resolve_alert(alert_id: str, actor_user_id: str | None = None) -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                update alerts
                set status = 'resolved',
                    resolved_at = now(),
                    resolved_by = %s,
                    updated_at = now()
                where id::text = %s
                returning *
                """,
                (actor_user_id, alert_id),
            )
            return dict(cur.fetchone() or {})


def _task_event(
    cur: Any,
    task: dict[str, Any],
    event_type: str,
    actor_user_id: str | None,
    previous_state: dict[str, Any],
    new_state: dict[str, Any],
    metadata: dict[str, Any] | None = None,
) -> None:
    cur.execute(
        """
        insert into task_events (
            organization_id, unit_id, sector_id, daily_task_instance_id, event_type, actor_user_id,
            previous_state, new_state, metadata_json, created_at
        ) values (%s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, now())
        """,
        (
            task["organization_id"],
            task["unit_id"],
            task["sector_id"],
            task["id"],
            event_type,
            actor_user_id,
            _json(previous_state),
            _json(new_state),
            _json(metadata or {}),
        ),
    )
    cur.execute(
        """
        insert into audit_events (
            organization_id, unit_id, sector_id, entity_type, entity_id, event_type, actor_user_id,
            previous_state, new_state, metadata_json, timestamp
        ) values (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, now())
        """,
        (
            task["organization_id"],
            task["unit_id"],
            task["sector_id"],
            "daily_task_instance",
            str(task["id"]),
            event_type,
            actor_user_id,
            _json(previous_state),
            _json(new_state),
            _json(metadata or {}),
        ),
    )


def start_task(task_id: str, actor_user_id: str | None = None) -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute("select * from daily_task_instances where id::text = %s limit 1", (task_id,))
            task = dict(cur.fetchone() or {})
            if not task:
                return {}
            previous = dict(task)
            cur.execute(
                """
                update daily_task_instances
                set status = %s,
                    started_at = coalesce(started_at, now()),
                    updated_at = now()
                where id::text = %s
                returning *
                """,
                (TASK_STATUS_IN_PROGRESS, task_id),
            )
            updated = dict(cur.fetchone() or {})
            _task_event(cur, task, "TASK_STARTED", actor_user_id, previous, updated)
            connection.commit()
            return updated


def add_goal_entry(task_id: str, quantity: int, note: str, actor_user_id: str | None = None) -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute("select * from daily_task_instances where id::text = %s limit 1", (task_id,))
            task = dict(cur.fetchone() or {})
            if not task:
                return {}
            cur.execute(
                """
                insert into task_goal_entries (daily_task_instance_id, recorded_by, quantity, note)
                values (%s, %s, %s, %s)
                returning *
                """,
                (task["id"], actor_user_id, quantity, note),
            )
            goal = dict(cur.fetchone() or {})
            cur.execute(
                "update daily_task_instances set goal_current = goal_current + %s, updated_at = now() where id = %s returning *",
                (quantity, task["id"]),
            )
            updated = dict(cur.fetchone() or {})
            _task_event(cur, task, "TASK_GOAL_PROGRESS_ADDED", actor_user_id, task, updated, {"quantity": quantity, "note": note})
            connection.commit()
            return {"entry": goal, "task": updated}


def complete_subtask(subtask_id: str, actor_user_id: str | None = None, notes: str = "") -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                update daily_task_subtask_instances
                set is_completed = true,
                    completed_at = coalesce(completed_at, now()),
                    completed_by = coalesce(completed_by, %s),
                    notes = case when %s = '' then notes else %s end,
                    updated_at = now()
                where id::text = %s
                returning *
                """,
                (actor_user_id, notes, notes, subtask_id),
            )
            subtask = dict(cur.fetchone() or {})
            if not subtask:
                return {}
            cur.execute("select * from daily_task_instances where id = %s limit 1", (subtask["daily_task_instance_id"],))
            task = dict(cur.fetchone() or {})
            cur.execute(
                """
                update daily_task_instances
                set subtasks_completed = (
                        select count(*) from daily_task_subtask_instances where daily_task_instance_id = %s and is_completed = true
                    ),
                    updated_at = now()
                where id = %s
                returning *
                """,
                (task["id"], task["id"]),
            )
            updated = dict(cur.fetchone() or {})
            _task_event(cur, task, "TASK_SUBTASK_COMPLETED", actor_user_id, task, updated, {"subtask_id": subtask_id})
            connection.commit()
            return updated


def block_task(task_id: str, reason_type: str, details: str, actor_user_id: str | None = None) -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute("select * from daily_task_instances where id::text = %s limit 1", (task_id,))
            task = dict(cur.fetchone() or {})
            if not task:
                return {}
            cur.execute(
                """
                insert into task_blockers (daily_task_instance_id, reported_by, reason_type, details, status)
                values (%s, %s, %s, %s, 'ACTIVE')
                returning *
                """,
                (task["id"], actor_user_id, reason_type, details),
            )
            blocker = dict(cur.fetchone() or {})
            cur.execute(
                """
                update daily_task_instances
                set status = %s,
                    blocker_reason = %s,
                    blocker_details = %s,
                    updated_at = now()
                where id = %s
                returning *
                """,
                (TASK_STATUS_BLOCKED, reason_type, details, task["id"]),
            )
            updated = dict(cur.fetchone() or {})
            _task_event(cur, task, "TASK_BLOCKED", actor_user_id, task, updated, {"reason_type": reason_type, "details": details})
            connection.commit()
            return {"blocker": blocker, "task": updated}


def mark_not_applicable(task_id: str, reason: str, actor_user_id: str | None = None) -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute("select * from daily_task_instances where id::text = %s limit 1", (task_id,))
            task = dict(cur.fetchone() or {})
            if not task:
                return {}
            cur.execute(
                """
                update daily_task_instances
                set status = %s,
                    not_applicable_reason = %s,
                    updated_at = now()
                where id = %s
                returning *
                """,
                (TASK_STATUS_NOT_APPLICABLE, reason, task["id"]),
            )
            updated = dict(cur.fetchone() or {})
            _task_event(cur, task, "TASK_MARKED_NOT_APPLICABLE", actor_user_id, task, updated, {"reason": reason})
            connection.commit()
            return updated


def reopen_task(task_id: str, reason: str = "", actor_user_id: str | None = None) -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute("select * from daily_task_instances where id::text = %s limit 1", (task_id,))
            task = dict(cur.fetchone() or {})
            if not task:
                return {}
            cur.execute(
                """
                update daily_task_instances
                set status = %s,
                    justification_note = %s,
                    completed_at = null,
                    completed_by = null,
                    updated_at = now()
                where id = %s
                returning *
                """,
                (TASK_STATUS_REVIEW_PENDING, reason, task["id"]),
            )
            updated = dict(cur.fetchone() or {})
            _task_event(cur, task, "TASK_REOPENED", actor_user_id, task, updated, {"reason": reason})
            connection.commit()
            return updated


def complete_task(task_id: str, completion_comment: str, actor_user_id: str | None = None) -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute("select * from daily_task_instances where id::text = %s limit 1", (task_id,))
            task = dict(cur.fetchone() or {})
            if not task:
                return {}
            completed_at = now_in_tz(None)
            late_minutes = late_minutes_from_completion(task, completed_at)
            status = TASK_STATUS_COMPLETED if late_minutes == 0 else TASK_STATUS_COMPLETED
            if task.get("requires_manager_review"):
                status = TASK_STATUS_REVIEW_PENDING
            if task.get("is_conditional") and task.get("not_applicable_reason"):
                status = TASK_STATUS_NOT_APPLICABLE
            cur.execute(
                """
                update daily_task_instances
                set status = %s,
                    completed_at = %s,
                    completed_by = %s,
                    completion_comment = %s,
                    is_late = %s,
                    late_minutes = %s,
                    updated_at = now()
                where id = %s
                returning *
                """,
                (
                    status,
                    completed_at,
                    actor_user_id,
                    completion_comment,
                    late_minutes > 0,
                    late_minutes,
                    task["id"],
                ),
            )
            updated = dict(cur.fetchone() or {})
            _task_event(
                cur,
                task,
                "TASK_COMPLETED",
                actor_user_id,
                task,
                updated,
                {"completion_comment": completion_comment, "late_minutes": late_minutes},
            )
            connection.commit()
            return updated


def add_task_comment(task_id: str, body: str, actor_user_id: str | None = None, comment_type: str = "comment") -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                insert into task_comments (daily_task_instance_id, user_id, comment_type, body)
                values (%s, %s, %s, %s)
                returning *
                """,
                (task_id, actor_user_id, comment_type, body),
            )
            row = dict(cur.fetchone() or {})
            connection.commit()
            return row


def add_task_evidence(task_id: str, evidence_type: str, label: str, payload: dict[str, Any], actor_user_id: str | None = None) -> dict[str, Any]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                insert into task_evidences (daily_task_instance_id, user_id, evidence_type, label, payload_json)
                values (%s, %s, %s, %s, %s::jsonb)
                returning *
                """,
                (task_id, actor_user_id, evidence_type, label, _json(payload)),
            )
            row = dict(cur.fetchone() or {})
            cur.execute(
                "update daily_task_instances set evidence_count = evidence_count + 1, updated_at = now() where id::text = %s",
                (task_id,),
            )
            connection.commit()
            return row


def list_daily_reports(unit_id: str, limit: int = 30) -> list[dict[str, Any]]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                select
                    dr.*,
                    do.operational_date,
                    do.status as operation_status,
                    do.timezone,
                    do.unit_id,
                    do.organization_id
                from daily_reports dr
                join daily_operations do on do.id = dr.daily_operation_id
                where do.unit_id = %s
                order by do.operational_date desc
                limit %s
                """,
                (unit_id, limit),
            )
            return [dict(row) for row in cur.fetchall()]


def list_audit_events(unit_id: str, limit: int = 50) -> list[dict[str, Any]]:
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                select
                    ae.*,
                    s.name as sector_name,
                    u.full_name as actor_name
                from audit_events ae
                left join sectors s on s.id = ae.sector_id
                left join users u on u.id = ae.actor_user_id
                where ae.unit_id = %s
                order by ae.timestamp desc
                limit %s
                """,
                (unit_id, limit),
            )
            return [dict(row) for row in cur.fetchall()]


def get_daily_operation_summary(unit_id: str, operational_date: date, timezone_name: str) -> dict[str, Any]:
    tasks = list_daily_task_instances(unit_id, operational_date)
    now = now_in_tz(timezone_name)
    buckets = bucket_tasks(tasks, now)
    compliance = calculate_compliance(tasks)
    alerts = list_alerts(unit_id, status="active", limit=200)
    sectors = list_sectors(unit_id)
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
                "completed_count": sum(1 for task in sector_tasks if str(task.get("status")).upper() in {TASK_STATUS_COMPLETED, TASK_STATUS_JUSTIFIED, TASK_STATUS_NOT_APPLICABLE}),
                "overdue_count": health["overdue_count"],
                "near_due_count": health["near_due_count"],
                "health_state": health["state"],
                "progress": 0 if not sector_tasks else round(sum(1 for task in sector_tasks if task.get("status") == TASK_STATUS_COMPLETED) / len(sector_tasks) * 100, 1),
            }
        )
    task_counts = {
        "total": len(tasks),
        "completed": sum(1 for task in tasks if str(task.get("status")).upper() in {TASK_STATUS_COMPLETED, TASK_STATUS_JUSTIFIED, TASK_STATUS_NOT_APPLICABLE}),
        "in_progress": sum(1 for task in tasks if str(task.get("status")).upper() == TASK_STATUS_IN_PROGRESS),
        "overdue": sum(1 for task in tasks if task_status_snapshot(task, now).is_overdue),
        "critical_pending": sum(1 for task in tasks if task_status_snapshot(task, now).is_overdue and task.get("is_critical_snapshot")),
    }
    return {
        "operation": get_daily_operation(unit_id, operational_date) or {},
        "date": operational_date,
        "now": now.isoformat(),
        "task_counts": task_counts,
        "compliance": compliance,
        "buckets": buckets,
        "sectors": sector_payload,
        "alerts": alerts,
        "tasks": tasks,
    }


def get_dashboard_summary(unit_id: str, timezone_name: str, operational_date: date | None = None) -> dict[str, Any]:
    operational_date = operational_date or date_in_tz(timezone_name)
    summary = get_daily_operation_summary(unit_id, operational_date, timezone_name)
    tasks = summary["tasks"]
    sectors = summary["sectors"]
    now = now_in_tz(timezone_name)
    by_sector = {sector["id"]: sector for sector in sectors}
    recurring_failures = _recurring_failures(tasks, unit_id, operational_date)
    points_of_attention = _points_of_attention(tasks, by_sector, now)
    operational_now = _operational_now(tasks, now)
    closing_summary = _closing_summary(tasks, summary["compliance"])
    return {
        **summary,
        "operational_now": operational_now,
        "points_of_attention": points_of_attention,
        "recurring_failures": recurring_failures,
        "closing_summary": closing_summary,
        "sector_health": sectors,
    }


def _operational_now(tasks: list[dict[str, Any]], now: datetime) -> list[dict[str, Any]]:
    feed = []
    for task in sorted(tasks, key=lambda item: item.get("scheduled_start") or time.min):
        snapshot = task_status_snapshot(task, now)
        feed.append(
            {
                "task_id": task["id"],
                "sector_name": task["sector_name"],
                "title": task["title_snapshot"],
                "status": snapshot.state,
                "label": snapshot.label,
                "scheduled_start": task["scheduled_start"],
                "scheduled_due": task["scheduled_due"],
                "completed_at": task.get("completed_at"),
            }
        )
    return feed


def _points_of_attention(tasks: list[dict[str, Any]], by_sector: dict[str, dict[str, Any]], now: datetime) -> list[dict[str, Any]]:
    points: list[dict[str, Any]] = []
    for task in tasks:
        snapshot = task_status_snapshot(task, now)
        if snapshot.is_overdue or str(task.get("status")).upper() == TASK_STATUS_BLOCKED:
            points.append(
                {
                    "kind": "task",
                    "task_id": task["id"],
                    "sector_name": task["sector_name"],
                    "title": task["title_snapshot"],
                    "status": snapshot.state,
                    "label": snapshot.label,
                    "late_minutes": snapshot.overdue_minutes,
                }
            )
    for sector_id, sector in by_sector.items():
        if sector.get("health_state") in {"ATRASADO", "CRITICO"}:
            points.append(
                {
                    "kind": "sector",
                    "sector_id": sector_id,
                    "sector_name": sector["name"],
                    "status": sector["health_state"],
                    "overdue_count": sector["overdue_count"],
                }
            )
    return points[:12]


def _closing_summary(tasks: list[dict[str, Any]], compliance: dict[str, Any]) -> dict[str, Any]:
    completed = sum(1 for task in tasks if str(task.get("status")).upper() in {TASK_STATUS_COMPLETED, TASK_STATUS_JUSTIFIED, TASK_STATUS_NOT_APPLICABLE})
    overdue = sum(1 for task in tasks if str(task.get("status")).upper() == TASK_STATUS_OVERDUE or task.get("is_late"))
    blockers = sum(1 for task in tasks if str(task.get("status")).upper() == TASK_STATUS_BLOCKED)
    goals_total = sum(int(task.get("goal_target_snapshot") or 0) for task in tasks if int(task.get("goal_target_snapshot") or 0) > 0)
    goals_achieved = sum(min(int(task.get("goal_current") or 0), int(task.get("goal_target_snapshot") or 0)) for task in tasks if int(task.get("goal_target_snapshot") or 0) > 0)
    return {
        "tasks_total": len(tasks),
        "tasks_completed": completed,
        "overdue": overdue,
        "blockers": blockers,
        "goal_target": goals_total,
        "goal_achieved": goals_achieved,
        "compliance": compliance["score"],
        "punctuality": compliance["punctuality"],
        "conclusion": compliance["conclusion"],
    }


def _recurring_failures(tasks: list[dict[str, Any]], unit_id: str, operational_date: date) -> list[dict[str, Any]]:
    failures: list[dict[str, Any]] = []
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                select t.title_snapshot, count(*) as total_failures, avg(late_minutes) as avg_late_minutes
                from daily_task_instances t
                where t.unit_id = %s
                  and t.operational_date >= %s - interval '7 days'
                  and (t.is_late = true or t.status = %s or t.status = %s)
                group by t.title_snapshot
                having count(*) >= 2
                order by count(*) desc, avg_late_minutes desc
                limit 10
                """,
                (unit_id, operational_date, TASK_STATUS_OVERDUE, TASK_STATUS_BLOCKED),
            )
            rows = [dict(row) for row in cur.fetchall()]
        for row in rows:
            failures.append(
                {
                    "title": row["title_snapshot"],
                    "total_failures": row["total_failures"],
                    "average_late_minutes": round(float(row["avg_late_minutes"] or 0), 1),
                }
            )
    return failures


def list_history(unit_id: str, start_date: date | None = None, end_date: date | None = None, limit: int = 60) -> list[dict[str, Any]]:
    start_date = start_date or (date.today() - timedelta(days=7))
    end_date = end_date or date.today()
    with get_connection() as connection:
        with connection.cursor() as cur:
            cur.execute(
                """
                select
                    do.operational_date,
                    do.status as operation_status,
                    do.timezone,
                    count(dti.id) as total_tasks,
                    count(*) filter (where dti.status in (%s, %s, %s)) as completed_tasks,
                    count(*) filter (where dti.status = %s or dti.is_late = true) as overdue_tasks,
                    count(*) filter (where dti.status = %s) as blocked_tasks,
                    count(*) filter (where dti.status = %s) as not_applicable_tasks
                from daily_operations do
                left join daily_task_instances dti on dti.daily_operation_id = do.id
                where do.unit_id = %s and do.operational_date between %s and %s
                group by do.operational_date, do.status, do.timezone
                order by do.operational_date desc
                limit %s
                """,
                (
                    TASK_STATUS_COMPLETED,
                    TASK_STATUS_JUSTIFIED,
                    TASK_STATUS_NOT_APPLICABLE,
                    TASK_STATUS_OVERDUE,
                    TASK_STATUS_BLOCKED,
                    TASK_STATUS_NOT_APPLICABLE,
                    unit_id,
                    start_date,
                    end_date,
                    limit,
                ),
            )
            return [dict(row) for row in cur.fetchall()]


def list_daily_operation_tasks_for_date(unit_id: str, operational_date: date) -> list[dict[str, Any]]:
    return list_daily_task_instances(unit_id, operational_date)
