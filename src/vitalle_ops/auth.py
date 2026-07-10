from __future__ import annotations

import base64
import hashlib
import hmac
import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from hmac import compare_digest
from time import time
from typing import Any, Optional

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
from fastapi import Header, HTTPException, status

from vitalle_ops.config import APIConfig
from vitalle_ops.store import get_user_context


@dataclass(frozen=True)
class APIPrincipal:
    role: str
    user_id: str = ""
    email: str = ""
    auth_method: str = "api_key"
    organization_id: str = ""
    unit_id: str = ""
    sector_id: str = ""
    display_name: str = ""
    permissions: tuple[str, ...] = ()

    @property
    def is_admin(self) -> bool:
        return self.role.lower() in {"admin", "owner"}


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}".encode("ascii"))


def _decode_jwt_parts(token: str) -> tuple[dict[str, Any], dict[str, Any], bytes, bytes]:
    try:
        header_raw, payload_raw, signature_raw = token.split(".")
        header = json.loads(_b64url_decode(header_raw))
        signed = f"{header_raw}.{payload_raw}".encode("ascii")
        payload = json.loads(_b64url_decode(payload_raw))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bearer token") from exc
    return header, payload, signed, _b64url_decode(signature_raw)


def _validate_jwt_payload(payload: dict[str, Any]) -> None:
    exp = payload.get("exp")
    if isinstance(exp, (int, float)) and exp < time():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired bearer token")


def _decode_and_verify_jwt_hs256(token: str, secret: str) -> dict[str, Any]:
    header, payload, signed, signature = _decode_jwt_parts(token)
    if header.get("alg") != "HS256":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bearer token")
    expected = hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).digest()
    if not compare_digest(expected, signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bearer token")
    _validate_jwt_payload(payload)
    return payload


def _load_jwks(jwks_json: str) -> list[dict[str, Any]]:
    try:
        payload = json.loads(jwks_json)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="JWT auth is not configured") from exc
    keys = payload.get("keys") if isinstance(payload, dict) else payload
    if not isinstance(keys, list):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="JWT auth is not configured")
    return [key for key in keys if isinstance(key, dict)]


def _find_jwk(header: dict[str, Any], jwks_json: str) -> dict[str, Any]:
    kid = header.get("kid")
    alg = header.get("alg")
    for key in _load_jwks(jwks_json):
        if key.get("kid") == kid and key.get("alg") == alg:
            return key
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bearer token")


def _decode_and_verify_jwt_es256(token: str, jwks_json: str) -> dict[str, Any]:
    header, payload, signed, signature = _decode_jwt_parts(token)
    if header.get("alg") != "ES256":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bearer token")
    jwk = _find_jwk(header, jwks_json)
    if jwk.get("kty") != "EC" or jwk.get("crv") != "P-256" or len(signature) != 64:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bearer token")
    try:
        x = int.from_bytes(_b64url_decode(str(jwk["x"])), "big")
        y = int.from_bytes(_b64url_decode(str(jwk["y"])), "big")
        public_key = ec.EllipticCurvePublicNumbers(x, y, ec.SECP256R1()).public_key()
        der_signature = encode_dss_signature(
            int.from_bytes(signature[:32], "big"),
            int.from_bytes(signature[32:], "big"),
        )
        public_key.verify(der_signature, signed, ec.ECDSA(hashes.SHA256()))
    except (KeyError, ValueError, InvalidSignature) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bearer token") from exc
    _validate_jwt_payload(payload)
    return payload


def _fetch_supabase_user(token: str, config: APIConfig) -> dict[str, Any]:
    supabase_url = config.supabase_url.rstrip("/")
    if not supabase_url or not config.supabase_anon_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="JWT auth is not configured")

    request = urllib.request.Request(
        f"{supabase_url}/auth/v1/user",
        headers={
            "apikey": config.supabase_anon_key,
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bearer token") from exc


def _decode_bearer_payload(token: str, config: APIConfig) -> dict[str, Any]:
    local_auth_error: Optional[HTTPException] = None
    try:
        header, _, _, _ = _decode_jwt_parts(token)
        alg = header.get("alg")
        if alg == "HS256" and config.auth_jwt_secret:
            return _decode_and_verify_jwt_hs256(token, config.auth_jwt_secret)
        if alg == "ES256" and config.auth_jwks_json:
            return _decode_and_verify_jwt_es256(token, config.auth_jwks_json)
        local_auth_error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="JWT auth is not configured")
    except HTTPException as exc:
        local_auth_error = exc

    if config.supabase_url and config.supabase_anon_key:
        user = _fetch_supabase_user(token, config)
        return {
            "sub": user.get("id"),
            "email": user.get("email"),
        }
    raise local_auth_error or HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bearer token")


def _principal_from_bearer_token(token: str, config: APIConfig) -> APIPrincipal:
    payload = _decode_bearer_payload(token, config)
    user_id = str(payload.get("sub") or "")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token missing user subject")

    user_context = get_user_context(user_id)
    if not user_context:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not linked to Vitalle Ops")
    return APIPrincipal(
        role=str(user_context.get("role") or "collaborator"),
        user_id=user_id,
        email=str(user_context.get("email") or payload.get("email") or ""),
        auth_method="bearer",
        organization_id=str(user_context.get("organization_id") or ""),
        unit_id=str(user_context.get("unit_id") or ""),
        sector_id=str(user_context.get("sector_id") or ""),
        display_name=str(user_context.get("display_name") or user_context.get("full_name") or ""),
    )


def require_principal(
    authorization: Optional[str] = Header(default=None),
    x_api_key: Optional[str] = Header(default=None),
    x_vitalle_dev_role: Optional[str] = Header(default=None),
    x_vitalle_dev_user_id: Optional[str] = Header(default=None),
    x_vitalle_dev_email: Optional[str] = Header(default=None),
    x_vitalle_dev_organization_id: Optional[str] = Header(default=None),
    x_vitalle_dev_unit_id: Optional[str] = Header(default=None),
    x_vitalle_dev_sector_id: Optional[str] = Header(default=None),
    x_vitalle_dev_display_name: Optional[str] = Header(default=None),
) -> APIPrincipal:
    config = APIConfig()
    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() == "bearer" and token:
            return _principal_from_bearer_token(token, config)

    if config.admin_api_key and x_api_key and compare_digest(config.admin_api_key, x_api_key):
        return APIPrincipal(role="admin", auth_method="api_key")

    if config.allow_insecure_development_auth:
        return APIPrincipal(
            role=x_vitalle_dev_role or "admin",
            user_id=x_vitalle_dev_user_id or "",
            email=x_vitalle_dev_email or "",
            auth_method="dev",
            organization_id=x_vitalle_dev_organization_id or "",
            unit_id=x_vitalle_dev_unit_id or "",
            sector_id=x_vitalle_dev_sector_id or "",
            display_name=x_vitalle_dev_display_name or "",
        )

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
