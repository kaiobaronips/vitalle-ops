from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from vitalle_ops.auth import APIPrincipal
from vitalle_ops.domain import sector_health_status
from vitalle_ops.router import _principal_guard


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
