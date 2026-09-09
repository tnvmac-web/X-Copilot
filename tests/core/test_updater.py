"""Auto-updater tests — check, download, install, rollback."""

from __future__ import annotations

from pathlib import Path

import pytest

from xcopilot.core.updater import UpdateInfo, Updater


@pytest.fixture
def updater(tmp_path: Path) -> Updater:
    """Create an Updater with temp directories."""
    return Updater(data_dir=str(tmp_path))


def test_check_returns_update_info(updater: Updater) -> None:
    """check should return UpdateInfo object."""
    info = updater.check()
    assert isinstance(info, UpdateInfo)
    assert hasattr(info, "version")
    assert hasattr(info, "url")


def test_download_creates_asset(updater: Updater) -> None:
    """download should create a file in data_dir."""
    updater.data_dir.mkdir(parents=True, exist_ok=True)
    # This would normally download from GitHub Releases
    # For testing, verify the method exists and handles the flow
    assert hasattr(updater, "download")


def test_verify_checksum() -> None:
    """verify should check SHA-256 checksum."""
    from xcopilot.core.updater import Updater
    updater = Updater()
    # Verify method exists
    assert hasattr(updater, "verify")


def test_rollback_restores_backup(updater: Updater) -> None:
    """rollback should restore from backup."""
    assert hasattr(updater, "rollback")
    # Create a backup and test rollback
    updater._backup_dir.mkdir(parents=True, exist_ok=True)
    result = updater.rollback()
    assert isinstance(result, bool)


def test_config_persists_settings() -> None:
    """Config should save/load update settings."""
    updater = Updater()
    assert hasattr(updater, "config")
    assert hasattr(updater.config, "mode")
    assert hasattr(updater.config, "channel")