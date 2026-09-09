"""Project memory tests — AGENTS.md parser."""

from __future__ import annotations

from pathlib import Path

import pytest

from xcopilot.memory.project import ProjectMemory, ProjectRule


@pytest.fixture
def tmp_dir(tmp_path: Path) -> Path:
    """Create a temporary directory with AGENTS.md."""
    return tmp_path


@pytest.fixture
def sample_agents_md() -> str:
    """Return a sample AGENTS.md content."""
    return """# AGENTS.md - Project Architecture Rules

## Overview
This project follows specific conventions.

## Code Style
- Use 4 spaces for indentation
- Type hints required on all functions
- No wildcard imports

## Money Handling
- Always use cents (integers) for money
- Never use floats for currency

## API Rules
- All endpoints require authentication
- Use Zod for validation

## Database
- Use Prisma ORM
- Migrations are mandatory
"""


@pytest.fixture
def write_agents_md(tmp_dir: Path, sample_agents_md: str) -> Path:
    """Write AGENTS.md to temp dir."""
    agents_path = tmp_dir / "AGENTS.md"
    agents_path.write_text(sample_agents_md)
    return agents_path


def test_load_parses_sections(tmp_dir: Path, write_agents_md: Path) -> None:
    """load should parse AGENTS.md into sections."""
    mem = ProjectMemory(project_root=str(tmp_dir))
    mem.load()

    assert "Code Style" in mem.sections
    assert "Money Handling" in mem.sections
    assert "API Rules" in mem.sections
    assert "Database" in mem.sections


def test_get_rule_returns_section_content(tmp_dir: Path, write_agents_md: Path) -> None:
    """get_rule should return content for a section."""
    mem = ProjectMemory(project_root=str(tmp_dir))
    mem.load()

    rule = mem.get_rule("Money Handling")
    assert rule is not None
    assert "cents" in rule.content
    assert "integers" in rule.content
    assert "floats" in rule.content


def test_get_rule_returns_none_for_missing(tmp_dir: Path, write_agents_md: Path) -> None:
    """get_rule should return None for non-existent section."""
    mem = ProjectMemory(project_root=str(tmp_dir))
    mem.load()

    assert mem.get_rule("Non Existent Section") is None


def test_load_creates_rule_objects(tmp_dir: Path, write_agents_md: Path) -> None:
    """load should create ProjectRule objects with metadata."""
    mem = ProjectMemory(project_root=str(tmp_dir))
    mem.load()

    rule = mem.get_rule("Code Style")
    assert isinstance(rule, ProjectRule)
    assert rule.title == "Code Style"
    assert "indentation" in rule.content
    assert rule.level == 2  # ## level


def test_multiple_agents_files(tmp_dir: Path) -> None:
    """Should handle .xcopilot/AGENTS.md as well as root AGENTS.md."""
    # Create both
    (tmp_dir / "AGENTS.md").write_text("# Root\n## Rule A\nContent A")
    xcopilot_dir = tmp_dir / ".xcopilot"
    xcopilot_dir.mkdir()
    (xcopilot_dir / "AGENTS.md").write_text("# XCopilot\n## Rule B\nContent B")

    mem = ProjectMemory(project_root=str(tmp_dir))
    mem.load()

    # Should merge both
    assert mem.get_rule("Rule A") is not None
    assert mem.get_rule("Rule B") is not None


def test_watch_changes_returns_watcher(tmp_dir: Path, write_agents_md: Path) -> None:
    """watch_changes should return a watchdog observer."""
    mem = ProjectMemory(project_root=str(tmp_dir))
    mem.load()

    watcher = mem.watch_changes()
    assert watcher is not None
    # Should be an Observer instance
    from watchdog.observers import Observer
    assert isinstance(watcher, Observer)

    watcher.stop()


def test_reload_on_change(tmp_dir: Path, write_agents_md: Path) -> None:
    """Should detect and reload when AGENTS.md changes."""
    mem = ProjectMemory(project_root=str(tmp_dir))
    mem.load()

    # Initial state
    assert mem.get_rule("Money Handling") is not None

    # Modify file
    write_agents_md.write_text("# Updated\n## Money Handling\nNew rule: use dollars")

    # Trigger reload
    mem.reload()

    rule = mem.get_rule("Money Handling")
    assert rule is not None
    assert "dollars" in rule.content