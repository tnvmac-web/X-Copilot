from __future__ import annotations

from fastapi.testclient import TestClient

from server.main import app

client = TestClient(app)


def _login() -> str:
    response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "admin"},
    )
    assert response.status_code == 200
    return response.json()["token"]


def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "xcopilot"


def test_status_endpoint() -> None:
    response = client.get("/api/status")
    assert response.status_code == 200
    payload = response.json()
    assert payload["version"]
    assert payload["status"] == "ready"


def test_chat_endpoint_requires_a_real_provider() -> None:
    token = _login()
    response = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "hello from the server"}],
            "model": "gpt-4o-mini",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code in {200, 503}
    if response.status_code == 503:
        assert "provider" in response.json()["detail"].lower()


def test_websocket_prompt_roundtrip() -> None:
    token = _login()
    with client.websocket_connect("/api/ws") as websocket:
        websocket.send_json({"token": token})
        welcome = websocket.receive_json()
        assert welcome["type"] == "connected"

        websocket.send_json(
            {
                "method": "prompt.submit",
                "params": {
                    "session_id": "session-123",
                    "messages": [{"role": "user", "content": "ping"}],
                    "model": "gpt-4o-mini",
                },
            }
        )

        event = websocket.receive_json()
        assert event["type"] in {"message.delta", "message.complete", "error"}
