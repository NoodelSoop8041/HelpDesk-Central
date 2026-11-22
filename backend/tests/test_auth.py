import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.database import SessionLocal
from app.models import User
from app.security import password_hasher

TEST_PASSWORD = "Strong-test-password-23"


def registration_payload(**overrides: str) -> dict[str, str]:
    payload = {
        "full_name": "  Riley Employee  ",
        "email": "  Riley.Employee@Example.com ",
        "password": TEST_PASSWORD,
    }
    payload.update(overrides)
    return payload


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
