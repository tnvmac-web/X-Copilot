"""Tests for server API routes."""

import os

import pytest


class TestServerRoutes:
    """Verify all expected API routes exist in server/main.py."""

    def test_api_routes_file_exists(self):
        server_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "server", "main.py")
        assert os.path.exists(server_path)

    def test_server_has_memory_routes(self):
        server_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "server", "main.py")
        with open(server_path) as f:
            source = f.read()
        assert '"/api/memory"' in source
        assert "@app.get" in source

    def test_server_has_skills_marketplace_routes(self):
        server_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "server", "main.py")
        with open(server_path) as f:
            source = f.read()
        assert '"/api/skills/marketplace"' in source

    def test_server_has_projects_routes(self):
        server_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "server", "main.py")
        with open(server_path) as f:
            source = f.read()
        assert '"/api/projects"' in source

    def test_server_has_memory_engine_import(self):
        server_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "server", "main.py")
        with open(server_path) as f:
            source = f.read()
        assert "from xcopilot.memory import MemoryEngine" in source
        assert "from xcopilot.skills import marketplace" in source

    def test_server_has_all_expected_routes(self):
        server_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "server", "main.py")
        with open(server_path) as f:
            source = f.read()
        expected = [
            "/health",
            "/ready",
            "/api/status",
            "/api/config",
            "/api/models",
            "/api/providers",
            "/api/settings",
            "/api/auth/login",
            "/api/sessions",
            "/api/chat",
            "/api/chat/stream",
            "/api/ws",
            "/api/memory",
            "/api/skills/marketplace",
            "/api/projects",
        ]
        for route in expected:
            assert route in source, f"Missing route: {route}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
