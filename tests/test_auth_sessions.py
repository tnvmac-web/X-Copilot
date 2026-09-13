from __future__ import annotations

from fastapi.testclient import TestClient

from server.main import app

client = TestClient(app)


def test_login_returns_token_and_auth_allows_access() -> None:
    login_response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "admin"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["token"]
    assert token

    session_response = client.get(
        "/api/sessions",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert session_response.status_code == 200
    assert isinstance(session_response.json(), list)


def test_session_creation_and_fetch_work() -> None:
    login_response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "admin"},
    )
    token = login_response.json()["token"]

    create_response = client.post(
        "/api/sessions",
        json={"title": "Test session"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_response.status_code == 200
    payload = create_response.json()
    assert payload["title"] == "Test session"

    session_id = payload["id"]
    fetch_response = client.get(
        f"/api/sessions/{session_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert fetch_response.status_code == 200
    assert fetch_response.json()["id"] == session_id
