from datetime import date, datetime, time
from zoneinfo import ZoneInfo

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from vitalle_ops.auth import APIPrincipal
from vitalle_ops.domain import recurrence_matches, sector_health_status
from vitalle_ops.migrations import _supabase_migration_name
from vitalle_ops.router import TaskTemplateInput, _filter_tasks, _principal_guard, _resolve_scope


def test_sector_health_accepts_postgres_time_values() -> None:
    timezone = ZoneInfo("America/Sao_Paulo")
    now = datetime(2026, 7, 10, 9, 0, tzinfo=timezone)
    tasks = [
        {
            "status": "PENDING",
            "scheduled_due": time(9, 20),
            "operational_date": date(2026, 7, 10),
            "timezone": "America/Sao_Paulo",
            "priority_snapshot": "NORMAL",
        }
    ]

    health = sector_health_status(tasks, now)

    assert health["state"] == "ATENCAO"
    assert health["near_due_count"] == 1


def test_principal_guard_resolves_development_headers(monkeypatch) -> None:
    monkeypatch.setenv("VITALLE_ALLOW_INSECURE_DEV_AUTH", "true")
    app = FastAPI()

    @app.get("/")
    def guarded(principal: APIPrincipal = Depends(_principal_guard)) -> dict[str, str]:
        return {"role": principal.role, "user_id": principal.user_id}

    response = TestClient(app).get(
        "/",
        headers={
            "X-Vitalle-Dev-Role": "collaborator",
            "X-Vitalle-Dev-User-Id": "demo-secretaria",
        },
    )

    assert response.status_code == 200
    assert response.json() == {"role": "collaborator", "user_id": "demo-secretaria"}


def test_development_headers_are_rejected_in_production(monkeypatch) -> None:
    monkeypatch.setenv("VITALLE_ALLOW_INSECURE_DEV_AUTH", "true")
    monkeypatch.setenv("VERCEL_ENV", "production")
    monkeypatch.delenv("VITALLE_ADMIN_API_KEY", raising=False)
    monkeypatch.delenv("VITALLE_API_KEY", raising=False)
    app = FastAPI()

    @app.get("/")
    def guarded(principal: APIPrincipal = Depends(_principal_guard)) -> dict[str, str]:
        return {"role": principal.role}

    response = TestClient(app).get("/", headers={"X-Vitalle-Dev-Role": "admin"})

    assert response.status_code == 401


def test_api_key_can_forward_a_scoped_operator_session(monkeypatch) -> None:
    monkeypatch.setenv("VITALLE_ADMIN_API_KEY", "internal-key")
    monkeypatch.setenv("VERCEL_ENV", "production")
    app = FastAPI()

    @app.get("/")
    def guarded(principal: APIPrincipal = Depends(_principal_guard)) -> dict[str, str]:
        return {"role": principal.role, "sector_id": principal.sector_id}

    response = TestClient(app).get(
        "/",
        headers={
            "X-API-Key": "internal-key",
            "X-Vitalle-Dev-Role": "operator",
            "X-Vitalle-Dev-Sector-Id": "sector-asb",
        },
    )

    assert response.status_code == 200
    assert response.json() == {"role": "operator", "sector_id": "sector-asb"}


def test_monthly_recurrence_honors_interval_across_years() -> None:
    rule = {
        "recurrence_type": "MONTHLY",
        "interval_value": 5,
        "start_date": date(2026, 11, 10),
    }

    assert recurrence_matches(rule, date(2027, 4, 10)) is True
    assert recurrence_matches(rule, date(2027, 3, 10)) is False


def test_monthly_recurrence_applies_interval_to_month_days() -> None:
    rule = {
        "recurrence_type": "MONTHLY",
        "interval_value": 2,
        "start_date": date(2026, 1, 1),
        "month_days": [15],
    }

    assert recurrence_matches(rule, date(2026, 2, 15)) is False
    assert recurrence_matches(rule, date(2026, 3, 15)) is True


def test_task_template_rejects_an_inverted_schedule() -> None:
    with pytest.raises(ValidationError):
        TaskTemplateInput(
            sector_id="sector-avaliador",
            title="Agenda",
            start_time=time(11, 0),
            due_time=time(10, 0),
        )


def test_custom_migration_name_maps_to_supabase_history() -> None:
    assert _supabase_migration_name("0001_vitalle_ops.sql") == "vitalle_ops"


def test_operator_scope_includes_only_active_sectors(monkeypatch) -> None:
    monkeypatch.setattr(
        "vitalle_ops.router.get_user_context",
        lambda _user_id: {
            "organization_id": "vitalle-odontologia",
            "unit_id": "vitalle-main",
            "unit_timezone": "America/Sao_Paulo",
        },
    )
    monkeypatch.setattr(
        "vitalle_ops.router.list_sectors",
        lambda _unit_id: [
            {"id": "active-sector", "status": "active"},
            {"id": "inactive-sector", "status": "inactive"},
        ],
    )

    scope = _resolve_scope(APIPrincipal(role="operator", user_id="demo-ops"))

    assert scope["accessible_sector_ids"] == ["active-sector"]


def test_empty_sector_scope_does_not_leak_tasks() -> None:
    summary = {
        "tasks": [{"id": "task-1", "sector_id": "sector-a"}],
        "sectors": [{"id": "sector-a"}],
        "alerts": [
            {"id": "alert-1", "sector_id": "sector-a"},
            {"id": "alert-global", "sector_id": None},
        ],
    }

    filtered = _filter_tasks(summary, [], "America/Sao_Paulo")

    assert filtered["tasks"] == []
    assert filtered["sectors"] == []
    assert filtered["alerts"] == []
