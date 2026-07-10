from __future__ import annotations

import os

import uvicorn


def main() -> None:
    reload_enabled = os.getenv("VITALLE_API_RELOAD", "false").lower() in {"1", "true", "yes"}
    uvicorn.run("vitalle_ops.api:app", host="0.0.0.0", port=8000, reload=reload_enabled)


if __name__ == "__main__":
    main()
