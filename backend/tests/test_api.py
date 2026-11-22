from typing import Any

from fastapi.testclient import TestClient


def create_ticket(
    client: TestClient,
    **overrides: Any,
) -> dict[str, Any]:
    payload = {
        "title": "Laptop cannot connect to Wi-Fi",
        "description": "Connection drops after login.",
        "requester": "Alex User",
    }
    payload.update(overrides)
    response = client.post("/api/tickets", json=payload)
    assert response.status_code == 201
    return response.json()


def test_health_endpoint_returns_ok(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_ticket_uses_default_priority_and_status(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/tickets",
        json={
            "title": "Laptop cannot connect to Wi-Fi",
            "description": "Connection drops after login.",
            "requester": "Alex User",
        },
    )

    assert response.status_code == 201
    ticket = response.json()
    assert ticket["id"] > 0
    assert ticket["priority"] == "Medium"
    assert ticket["status"] == "Open"
    assert ticket["created_at"]
    assert ticket["updated_at"]


def test_create_ticket_accepts_priority(client: TestClient) -> None:
    ticket = create_ticket(client, priority="High")

    assert ticket["priority"] == "High"


def test_list_tickets(client: TestClient) -> None:
    first = create_ticket(client, title="First ticket")
    second = create_ticket(client, title="Second ticket")

    response = client.get("/api/tickets")

    assert response.status_code == 200
    assert [ticket["id"] for ticket in response.json()] == [
        second["id"],
        first["id"],
    ]


def test_get_ticket_by_id(client: TestClient) -> None:
    created = create_ticket(client)

    response = client.get(f"/api/tickets/{created['id']}")

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]
    assert response.json()["title"] == created["title"]


def test_get_nonexistent_ticket_returns_404(client: TestClient) -> None:
    response = client.get("/api/tickets/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Ticket not found."}


def test_update_ticket_status(client: TestClient) -> None:
    created = create_ticket(client)

    response = client.patch(
        f"/api/tickets/{created['id']}/status",
        json={"status": "In Progress"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "In Progress"
    assert client.get(f"/api/tickets/{created['id']}").json()["status"] == "In Progress"


def test_update_nonexistent_ticket_status_returns_404(
    client: TestClient,
) -> None:
    response = client.patch(
        "/api/tickets/999/status",
        json={"status": "Resolved"},
    )

    assert response.status_code == 404


def test_invalid_status_is_rejected(client: TestClient) -> None:
    created = create_ticket(client)

    response = client.patch(
        f"/api/tickets/{created['id']}/status",
        json={"status": "Waiting"},
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "status"]


def test_ticket_stats_aggregate_statuses(client: TestClient) -> None:
    open_ticket = create_ticket(client)
    in_progress_ticket = create_ticket(client)
    resolved_ticket = create_ticket(client)
    client.patch(
        f"/api/tickets/{in_progress_ticket['id']}/status",
        json={"status": "In Progress"},
    )
    client.patch(
        f"/api/tickets/{resolved_ticket['id']}/status",
        json={"status": "Resolved"},
    )

    response = client.get("/api/tickets/stats")

    assert response.status_code == 200
    assert response.json() == {
        "total_tickets": 3,
        "open_tickets": 1,
        "in_progress_tickets": 1,
        "resolved_tickets": 1,
    }


def test_empty_title_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/tickets",
        json={
            "title": "   ",
            "description": "Connection drops after login.",
            "requester": "Alex User",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "title"]


def test_missing_required_field_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/tickets",
        json={
            "title": "Laptop cannot connect to Wi-Fi",
            "description": "Connection drops after login.",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "requester"]


def test_invalid_priority_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/tickets",
        json={
            "title": "Laptop cannot connect to Wi-Fi",
            "description": "Connection drops after login.",
            "requester": "Alex User",
            "priority": "Urgent",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "priority"]
