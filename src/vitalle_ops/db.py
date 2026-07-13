from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Any, Iterator

import psycopg
from psycopg.rows import dict_row

try:
    from psycopg_pool import ConnectionPool
except ImportError:  # pragma: no cover - optional fallback for minimal local envs
    ConnectionPool = None  # type: ignore[assignment]

from vitalle_ops.support import env


logger = logging.getLogger("vitalle_ops.db")
_pool: Any = None
_pool_url: str | None = None


def database_url() -> str:
    return env("SUPABASE_DB_URL") or env("DATABASE_URL")


def _pool_max_size() -> int:
    try:
        return max(1, int(env("VITALLE_DB_POOL_MAX_SIZE") or "4"))
    except ValueError:
        return 4


def _connection_pool(db_url: str) -> Any:
    global _pool, _pool_url
    if ConnectionPool is None:
        return None
    if _pool is None or _pool_url != db_url:
        if _pool is not None:
            _pool.close()
        _pool = ConnectionPool(
            conninfo=db_url,
            min_size=0,
            max_size=_pool_max_size(),
            kwargs={"row_factory": dict_row},
        )
        _pool_url = db_url
    return _pool


@contextmanager
def get_connection() -> Iterator[psycopg.Connection[Any]]:
    db_url = database_url()
    if not db_url:
        raise RuntimeError("SUPABASE_DB_URL or DATABASE_URL is required")
    pool = _connection_pool(db_url)
    if pool is not None:
        with pool.connection() as connection:
            try:
                yield connection
                connection.commit()
            except Exception:
                connection.rollback()
                raise
        return

    connection = psycopg.connect(db_url, row_factory=dict_row)
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def database_ready() -> bool:
    try:
        with get_connection() as connection:
            with connection.cursor() as cur:
                cur.execute("select 1 as ready")
                return bool(cur.fetchone())
    except Exception as exc:
        logger.warning("database_ready_failed: %s: %s", type(exc).__name__, exc)
        return False
