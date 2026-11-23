from typing import Any

from fastapi.testclient import TestClient


def create_asset(
    client: TestClient,
    **overrides: Any,
) -> dict[str, Any]:
    payload = {
        "asset_tag": "IT-1001",
        "name": "Laptop",
    }
    payload.update(overrides)
    response = client.post("/api/assets", json=payload)
    assert response.status_code == 201
    return response.json()


def test_list_assets_returns_assets_sorted_by_asset_tag(
    client: TestClient,
) -> None:
    first = create_asset(client, asset_tag="IT-1002")
    second = create_asset(client, asset_tag="IT-1001")

    response = client.get("/api/assets")

    assert response.status_code == 200
    assert [asset["id"] for asset in response.json()] == [
        second["id"],
        first["id"],
    ]


def test_create_asset_normalizes_tag_and_defaults_optional_fields(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/assets",
        json={"asset_tag": "  it-1001 ", "name": "  Laptop  "},
    )

    assert response.status_code == 201
    asset = response.json()
    assert asset["id"] > 0
    assert asset["asset_tag"] == "IT-1001"
    assert asset["name"] == "Laptop"
    assert asset["category"] is None
    assert asset["manufacturer"] is None
    assert asset["model"] is None
    assert asset["serial_number"] is None
    assert asset["status"] == "Available"
    assert asset["assigned_employee"] is None
    assert asset["created_at"]


def test_create_asset_accepts_optional_inventory_details(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/assets",
        json={
            "asset_tag": "MON-042",
            "name": "Monitor",
            "category": "Display",
            "manufacturer": "Example Corp",
            "model": "View 24",
            "serial_number": "SN-9876",
            "status": "Assigned",
            "assigned_employee": "Riley Employee",
        },
    )

    assert response.status_code == 201
    asset = response.json()
    assert asset["category"] == "Display"
    assert asset["manufacturer"] == "Example Corp"
    assert asset["model"] == "View 24"
    assert asset["serial_number"] == "SN-9876"
    assert asset["status"] == "Assigned"
    assert asset["assigned_employee"] == "Riley Employee"


def test_create_asset_requires_tag_and_name(client: TestClient) -> None:
    for missing_field in ("asset_tag", "name"):
        payload = {"asset_tag": "IT-1001", "name": "Laptop"}
        payload.pop(missing_field)

        response = client.post("/api/assets", json=payload)

        assert response.status_code == 422
        assert response.json()["detail"][0]["loc"] == ["body", missing_field]


def test_create_asset_rejects_blank_tag_and_name(client: TestClient) -> None:
    for field in ("asset_tag", "name"):
        response = client.post(
            "/api/assets",
            json={"asset_tag": "IT-1001", "name": "Laptop", field: "   "},
        )

        assert response.status_code == 422
        assert response.json()["detail"][0]["loc"] == ["body", field]


def test_create_asset_rejects_duplicate_tag_case_insensitively(
    client: TestClient,
) -> None:
    create_asset(client, asset_tag="it-1001")

    response = client.post(
        "/api/assets",
        json={"asset_tag": " IT-1001 ", "name": "Second laptop"},
    )

    assert response.status_code == 409
    assert response.json() == {
        "detail": "An asset with this asset tag already exists."
    }


def test_create_asset_rejects_unknown_status(client: TestClient) -> None:
    response = client.post(
        "/api/assets",
        json={
            "asset_tag": "IT-1001",
            "name": "Laptop",
            "status": "Missing",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "status"]
