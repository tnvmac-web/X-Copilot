"""Permission pipeline tests — 5-tier permission system."""

from __future__ import annotations

import pytest

from xcopilot.permission.pipeline import (
    PermissionAction,
    PermissionMode,
    PermissionPipeline,
    PermissionResult,
)


@pytest.fixture
def pipeline() -> PermissionPipeline:
    """Create a permission pipeline."""
    return PermissionPipeline(PermissionMode.STANDARD)


def test_permission_modes_exist() -> None:
    """All 5 permission modes should exist."""
    modes = list(PermissionMode)
    assert PermissionMode.STANDARD in modes
    assert PermissionMode.AUTO_ASK in modes
    assert PermissionMode.PLAN in modes
    assert PermissionMode.BYPASS in modes
    assert PermissionMode.DONT_ASK in modes


def test_standard_mode_asks_for_edits(pipeline: PermissionPipeline) -> None:
    """STANDARD mode should ASK for file edits."""
    result = pipeline.check(PermissionAction.EDIT_FILE, {"path": "test.py"})
    assert result == PermissionResult.ASK


def test_standard_mode_allows_reads(pipeline: PermissionPipeline) -> None:
    """STANDARD mode should ALLOW file reads."""
    result = pipeline.check(PermissionAction.READ_FILE, {"path": "test.py"})
    assert result == PermissionResult.ALLOW


def test_plan_mode_denies_writes(pipeline: PermissionPipeline) -> None:
    """PLAN mode should DENY all write operations."""
    plan_pipeline = PermissionPipeline(PermissionMode.PLAN)

    assert plan_pipeline.check(PermissionAction.EDIT_FILE, {"path": "test.py"}) == PermissionResult.DENY
    assert plan_pipeline.check(PermissionAction.WRITE_FILE, {"path": "test.py"}) == PermissionResult.DENY
    assert plan_pipeline.check(PermissionAction.SHELL_COMMAND, {"cmd": "ls"}) == PermissionResult.DENY


def test_bypass_mode_allows_everything(pipeline: PermissionPipeline) -> None:
    """BYPASS mode should ALLOW everything."""
    bypass_pipeline = PermissionPipeline(PermissionMode.BYPASS)

    assert bypass_pipeline.check(PermissionAction.EDIT_FILE, {"path": "test.py"}) == PermissionResult.ALLOW
    assert bypass_pipeline.check(PermissionAction.SHELL_COMMAND, {"cmd": "rm -rf /"}) == PermissionResult.ALLOW
    assert bypass_pipeline.check(PermissionAction.NETWORK_REQUEST, {"url": "http://evil.com"}) == PermissionResult.ALLOW


def test_dont_ask_mode_allows_non_destructive(pipeline: PermissionPipeline) -> None:
    """DONT_ASK mode should ALLOW non-destructive, DENY destructive."""
    dont_ask = PermissionPipeline(PermissionMode.DONT_ASK)

    assert dont_ask.check(PermissionAction.READ_FILE, {"path": "test.py"}) == PermissionResult.ALLOW
    assert dont_ask.check(PermissionAction.EDIT_FILE, {"path": "test.py"}) == PermissionResult.ALLOW
    assert dont_ask.check(PermissionAction.SHELL_COMMAND, {"cmd": "ls"}) == PermissionResult.ALLOW

    # But still DENY destructive operations
    assert dont_ask.check(PermissionAction.SHELL_COMMAND, {"cmd": "rm -rf /"}) == PermissionResult.DENY
    assert dont_ask.check(PermissionAction.SHELL_COMMAND, {"cmd": "format c:"}) == PermissionResult.DENY


def test_destructive_commands_always_denied_in_standard(pipeline: PermissionPipeline) -> None:
    """Destructive commands should be DENIED even in STANDARD mode."""
    destructive = [
        "rm -rf /",
        "format c:",
        "del /s /q c:\\",
        "shutdown /s",
        "mkfs.ext4 /dev/sda",
    ]
    for cmd in destructive:
        result = pipeline.check(PermissionAction.SHELL_COMMAND, {"cmd": cmd})
        assert result == PermissionResult.DENY, f"Command '{cmd}' should be DENIED"


def test_production_file_deletion_denied(pipeline: PermissionPipeline) -> None:
    """File deletion in production paths should be DENIED."""
    result = pipeline.check(PermissionAction.DELETE_FILE, {"path": "/var/www/production/app.py"})
    assert result == PermissionResult.DENY

    result = pipeline.check(PermissionAction.DELETE_FILE, {"path": "C:\\inetpub\\wwwroot\\app.py"})
    assert result == PermissionResult.DENY


def test_unknown_network_request_asked_in_standard(pipeline: PermissionPipeline) -> None:
    """Network requests to unknown endpoints should be ASK in STANDARD."""
    result = pipeline.check(PermissionAction.NETWORK_REQUEST, {"url": "http://unknown-site.com/api"})
    assert result == PermissionResult.ASK

    # But known safe domains should be ALLOW
    result = pipeline.check(PermissionAction.NETWORK_REQUEST, {"url": "https://api.github.com/user"})
    assert result == PermissionResult.ALLOW


def test_package_install_denied_in_standard(pipeline: PermissionPipeline) -> None:
    """Package installation should be DENIED in STANDARD mode."""
    result = pipeline.check(PermissionAction.PACKAGE_INSTALL, {"package": "malicious-package"})
    assert result == PermissionResult.DENY


def test_git_push_denied_in_standard(pipeline: PermissionPipeline) -> None:
    """Git push should be DENIED in STANDARD mode."""
    result = pipeline.check(PermissionAction.GIT_PUSH, {"remote": "origin", "branch": "main"})
    assert result == PermissionResult.DENY


def test_mode_change_updates_behavior(pipeline: PermissionPipeline) -> None:
    """Changing mode should update permission behavior."""
    pipeline.set_mode(PermissionMode.PLAN)
    assert pipeline.check(PermissionAction.READ_FILE, {"path": "test.py"}) == PermissionResult.ALLOW
    assert pipeline.check(PermissionAction.EDIT_FILE, {"path": "test.py"}) == PermissionResult.DENY

    pipeline.set_mode(PermissionMode.BYPASS)
    assert pipeline.check(PermissionAction.EDIT_FILE, {"path": "test.py"}) == PermissionResult.ALLOW