import secrets
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.auth import get_current_user
from app.database import SessionLocal
from app.models import User
from app.security import DUMMY_PASSWORD_HASH, password_hasher

TEST_PASSWORD = secrets.token_urlsafe(18)
TEST_JWT_SECRET = secrets.token_urlsafe(48)


def registration_payload(**overrides: str) -> dict[str, str]:
    payload = {
        "full_name": "  Riley Employee  ",
        "email": "  Riley.Employee@Example.com ",
        "password": TEST_PASSWORD,
    }
    payload.update(overrides)
    return payload


def configure_jwt(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JWT_SECRET_KEY", TEST_JWT_SECRET)
    monkeypatch.setenv("JWT_ALGORITHM", "HS256")
    monkeypatch.setenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30")


def protected_test_client() -> TestClient:
    protected_app = FastAPI()

    @protected_app.get("/protected")
    def protected_route(
        current_user: User = Depends(get_current_user),
    ) -> dict[str, int]:
        return {"user_id": current_user.id}

    return TestClient(protected_app)


def test_register_user_returns_normalized_safe_user(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register",
        json=registration_payload(),
    )

    assert response.status_code == 201
    user = response.json()
    assert set(user) == {"id", "full_name", "email", "role", "created_at"}
    assert user["id"] > 0
    assert user["full_name"] == "Riley Employee"
    assert user["email"] == "riley.employee@example.com"
    assert user["role"] == "employee"
    assert user["created_at"]
    assert TEST_PASSWORD not in response.text


@pytest.mark.parametrize("missing_field", ["full_name", "email", "password"])
def test_register_user_requires_all_fields(
    client: TestClient,
    missing_field: str,
) -> None:
    payload = registration_payload()
    payload.pop(missing_field)

    response = client.post("/api/auth/register", json=payload)

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", missing_field]


def test_register_user_rejects_invalid_email(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register",
        json=registration_payload(email="not-an-email"),
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "email"]


@pytest.mark.parametrize("password", ["short", "p" * 129])
def test_register_user_rejects_password_outside_length_bounds(
    client: TestClient,
    password: str,
) -> None:
    response = client.post(
        "/api/auth/register",
        json=registration_payload(password=password),
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "password"]
    assert password not in response.text


def test_register_user_rejects_duplicate_normalized_email(
    client: TestClient,
) -> None:
    first_response = client.post(
        "/api/auth/register",
        json=registration_payload(),
    )
    duplicate_response = client.post(
        "/api/auth/register",
        json=registration_payload(email="riley.employee@example.com"),
    )

    assert first_response.status_code == 201
    assert duplicate_response.status_code == 409
    assert duplicate_response.json() == {
        "detail": "An account with this email already exists."
    }


def test_register_user_stores_only_password_hash(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register",
        json=registration_payload(),
    )
    with SessionLocal() as session:
        user = session.scalar(
            select(User).where(User.email == "riley.employee@example.com")
        )

    assert response.status_code == 201
    assert user is not None
    assert user.hashed_password != TEST_PASSWORD
    assert user.hashed_password.startswith("$argon2id$")
    assert password_hasher.verify(TEST_PASSWORD, user.hashed_password)


def test_register_user_rejects_client_supplied_role(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/auth/register",
        json=registration_payload(role="admin"),
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "role"]


def test_login_issues_expiring_token_and_normalizes_email(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configure_jwt(monkeypatch)
    registration = client.post(
        "/api/auth/register",
        json=registration_payload(),
    )
    assert registration.status_code == 201

    response = client.post(
        "/api/auth/login",
        json={
            "email": "  RILEY.EMPLOYEE@Example.com ",
            "password": TEST_PASSWORD,
        },
    )

    assert response.status_code == 200
    token_response = response.json()
    assert set(token_response) == {"access_token", "token_type", "expires_in"}
    assert token_response["token_type"] == "bearer"
    assert token_response["expires_in"] == 1800
    claims = jwt.decode(
        token_response["access_token"],
        TEST_JWT_SECRET,
        algorithms=["HS256"],
    )
    assert claims["sub"] == str(registration.json()["id"])
    assert claims["exp"] - claims["iat"] == 1800
    assert TEST_PASSWORD not in response.text


def test_login_returns_same_error_for_wrong_password_and_unknown_email(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configure_jwt(monkeypatch)
    client.post("/api/auth/register", json=registration_payload())

    wrong_password = client.post(
        "/api/auth/login",
        json={
            "email": "riley.employee@example.com",
            "password": secrets.token_urlsafe(24),
        },
    )
    unknown_email = client.post(
        "/api/auth/login",
        json={
            "email": "unknown@example.com",
            "password": TEST_PASSWORD,
        },
    )

    assert wrong_password.status_code == 401
    assert unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json() == {
        "detail": "Invalid email or password."
    }


def test_login_verifies_dummy_hash_for_unknown_email(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configure_jwt(monkeypatch)
    verification_inputs: list[tuple[str, str]] = []

    def record_verification(password: str, password_hash: str) -> bool:
        verification_inputs.append((password, password_hash))
        return False

    monkeypatch.setattr("app.auth.verify_password", record_verification)

    response = client.post(
        "/api/auth/login",
        json={
            "email": "unknown@example.com",
            "password": TEST_PASSWORD,
        },
    )

    assert response.status_code == 401
    assert verification_inputs == [(TEST_PASSWORD, DUMMY_PASSWORD_HASH)]


def test_login_validates_required_fields_and_email(
    client: TestClient,
) -> None:
    missing_password = client.post(
        "/api/auth/login",
        json={"email": "riley.employee@example.com"},
    )
    invalid_email = client.post(
        "/api/auth/login",
        json={"email": "not-an-email", "password": TEST_PASSWORD},
    )

    assert missing_password.status_code == 422
    assert invalid_email.status_code == 422
    assert TEST_PASSWORD not in invalid_email.text


def test_missing_jwt_configuration_is_safe_and_does_not_break_tickets(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)

    response = client.post(
        "/api/auth/login",
        json={
            "email": "riley.employee@example.com",
            "password": TEST_PASSWORD,
        },
    )
    stats_response = client.get("/api/tickets/stats")
    protected_response = protected_test_client().get(
        "/protected",
        headers={"Authorization": "Bearer not-a-token"},
    )

    assert response.status_code == 503
    assert response.json() == {"detail": "Authentication is not configured."}
    assert stats_response.status_code == 200
    assert protected_response.status_code == 503


def test_protected_dependency_accepts_authenticated_user(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    configure_jwt(monkeypatch)
    registration = client.post(
        "/api/auth/register",
        json=registration_payload(),
    )
    login_response = client.post(
        "/api/auth/login",
        json={
            "email": "riley.employee@example.com",
            "password": TEST_PASSWORD,
        },
    )
    protected = protected_test_client()
    missing_token = protected.get("/protected")
    authenticated = protected.get(
        "/protected",
        headers={
            "Authorization": f"Bearer {login_response.json()['access_token']}"
        },
    )

    assert registration.status_code == 201
    assert login_response.status_code == 200
    assert missing_token.status_code == 401
    assert missing_token.headers["www-authenticate"] == "Bearer"
    assert authenticated.status_code == 200
    assert authenticated.json() == {"user_id": registration.json()["id"]}


@pytest.mark.parametrize("token_kind", ["invalid_signature", "expired", "unknown_user"])
def test_protected_dependency_rejects_invalid_tokens(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    token_kind: str,
) -> None:
    configure_jwt(monkeypatch)
    now = datetime.now(timezone.utc)
    subject = "999999" if token_kind == "unknown_user" else "1"
    issued_at = now - timedelta(minutes=2)
    expires_at = (
        now - timedelta(minutes=1)
        if token_kind == "expired"
        else now + timedelta(minutes=5)
    )
    token_secret = (
        secrets.token_urlsafe(48)
        if token_kind == "invalid_signature"
        else TEST_JWT_SECRET
    )
    token = jwt.encode(
        {
            "sub": subject,
            "iat": issued_at,
            "exp": expires_at,
        },
        token_secret,
        algorithm="HS256",
    )

    response = protected_test_client().get(
        "/protected",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
