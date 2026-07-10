from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Any, Iterator

import psycopg
from psycopg.rows import dict_row

from vitalle_ops.support import env


logger = logging.getLogger("vitalle_ops.db")


def database_url() -> str:
    return env("SUPABASE_DB_URL") or env("DATABASE_URL")


@contextmanager
def get_connection() -> Iterator[psycopg.Connection[Any]]:
    db_url = database_url()
    if not db_url:
        raise RuntimeError("SUPABASE_DB_URL or DATABASE_URL is required")
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
