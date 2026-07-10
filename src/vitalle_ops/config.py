from __future__ import annotations

from dataclasses import dataclass, field
import os
from typing import Optional

from vitalle_ops.support import load_local_env


load_local_env()


@dataclass(frozen=True)
class APIConfig:
    admin_api_key: Optional[str] = field(default_factory=lambda: os.getenv("VITALLE_ADMIN_API_KEY") or os.getenv("VITALLE_API_KEY") or None)
    allow_insecure_development_auth: bool = field(default_factory=lambda: os.getenv("VITALLE_ALLOW_INSECURE_DEV_AUTH", "false").lower() in {"1", "true", "yes"})
    auth_jwt_secret: Optional[str] = field(default_factory=lambda: os.getenv("VITALLE_AUTH_JWT_SECRET") or os.getenv("SUPABASE_JWT_SECRET") or None)
    auth_jwks_json: Optional[str] = field(default_factory=lambda: os.getenv("VITALLE_AUTH_JWKS") or os.getenv("SUPABASE_JWT_JWKS") or os.getenv("SUPABASE_JWKS") or None)
    supabase_url: str = field(default_factory=lambda: os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or "")
    supabase_anon_key: str = field(default_factory=lambda: os.getenv("SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY") or "")
