from httpx import Response
from fastapi.testclient import TestClient


def preflight(client: TestClient, origin: str) -> Response:
    return client.options(
        "/api/auth/register",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )


def test_registration_preflight_allows_configured_local_origins(
    client: TestClient,
) -> None:
    for origin in (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ):
        response = preflight(client, origin)

        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == origin
        assert "POST" in response.headers["access-control-allow-methods"]


def test_registration_preflight_rejects_unconfigured_origin(
    client: TestClient,
) -> None:
    response = preflight(client, "http://untrusted.example:5173")

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
