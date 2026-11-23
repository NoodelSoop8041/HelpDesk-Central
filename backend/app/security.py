from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import os
import secrets

import jwt
from pwdlib import PasswordHash

password_hasher = PasswordHash.recommended()
DUMMY_PASSWORD_HASH = password_hasher.hash(secrets.token_urlsafe(32))

_ALLOWED_JWT_ALGORITHMS = frozenset({"HS256", "HS384", "HS512"})


class JWTConfigurationError(ValueError):
    pass


@dataclass(frozen=True)
class JWTSettings:
    secret_key: str
    algorithm: str
    access_token_expire_minutes: int


def get_jwt_settings() -> JWTSettings:
    secret_key = os.getenv("JWT_SECRET_KEY", "").strip()
    algorithm = os.getenv("JWT_ALGORITHM", "HS256").strip()
    expires_in = os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30").strip()

    if len(secret_key) < 32:
        raise JWTConfigurationError(
            "JWT_SECRET_KEY must be configured with at least 32 characters."
        )
    if algorithm not in _ALLOWED_JWT_ALGORITHMS:
        raise JWTConfigurationError("JWT_ALGORITHM is not supported.")

    try:
        access_token_expire_minutes = int(expires_in)
    except ValueError as exc:
        raise JWTConfigurationError(
            "JWT_ACCESS_TOKEN_EXPIRE_MINUTES must be an integer."
        ) from exc

    if not 1 <= access_token_expire_minutes <= 1440:
        raise JWTConfigurationError(
            "JWT_ACCESS_TOKEN_EXPIRE_MINUTES must be between 1 and 1440."
        )

    return JWTSettings(
        secret_key=secret_key,
        algorithm=algorithm,
        access_token_expire_minutes=access_token_expire_minutes,
    )


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_hasher.verify(password, password_hash)


def create_access_token(user_id: int, settings: JWTSettings) -> str:
    issued_at = datetime.now(timezone.utc)
    expires_at = issued_at + timedelta(
        minutes=settings.access_token_expire_minutes,
    )
    return jwt.encode(
        {
            "sub": str(user_id),
            "iat": issued_at,
            "exp": expires_at,
        },
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def decode_access_token(token: str, settings: JWTSettings) -> int:
    payload = jwt.decode(
        token,
        settings.secret_key,
        algorithms=[settings.algorithm],
        options={"require": ["sub", "iat", "exp"]},
    )
    subject = payload.get("sub")
    if (
        not isinstance(subject, str)
        or not subject.isdecimal()
        or len(subject) > 19
    ):
        raise jwt.InvalidTokenError("Invalid token subject.")

    user_id = int(subject)
    if user_id < 1:
        raise jwt.InvalidTokenError("Invalid token subject.")
    return user_id
