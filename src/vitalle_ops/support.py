from __future__ import annotations

import os
from pathlib import Path
from typing import Optional


_LOCAL_ENV_LOADED = False


def load_local_env(path: Optional[Path] = None) -> None:
    global _LOCAL_ENV_LOADED
    if path is None and _LOCAL_ENV_LOADED:
        return

    env_file = path or Path.cwd() / ".env"
    if not env_file.is_file():
        if path is None:
            _LOCAL_ENV_LOADED = True
        return

    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        name = name.strip()
        value = value.strip()
        if not name or name in os.environ:
            continue
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        os.environ[name] = value
    if path is None:
        _LOCAL_ENV_LOADED = True


def env(name: str, default: str = "") -> str:
    load_local_env()
    return os.getenv(name, default).strip()


def env_bool(name: str, default: bool = False) -> bool:
    load_local_env()
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}
