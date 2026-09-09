"""Taste/Plan profile tests — user working style learning."""

from __future__ import annotations

from pathlib import Path

import pytest

from xcopilot.core.planner import PlannerEngine, TasteProfile
from xcopilot.memory import MemoryEngine


@pytest.fixture
def memory_engine(tmp_path: Path) -> MemoryEngine:
    """Create a MemoryEngine with temp directories."""
    return MemoryEngine(project_root=str(tmp_path))


@pytest.fixture
def planner(memory_engine: MemoryEngine) -> PlannerEngine:
    """Create a PlannerEngine with memory."""
    return PlannerEngine(memory_engine)


def test_taste_profile_defaults() -> None:
    """TasteProfile should have sensible defaults."""
    profile = TasteProfile()

    assert profile.preferred_tools == []
    assert profile.code_style == {}
    assert profile.conventions == {}
    assert profile.anti_patterns == []


def test_taste_profile_save_load(tmp_path: Path, planner: PlannerEngine) -> None:
    """TasteProfile should persist to config file."""
    # Modify profile
    planner.profile.preferred_tools = ["read_file", "write_file", "grep"]
    planner.profile.code_style = {"indent": 4, "type_hints": True}
    planner.profile.conventions = {"money_as_cents": True}
    planner.profile.anti_patterns = ["float for money", "wildcard imports"]

    planner.save()

    # Create new planner and load
    new_planner = PlannerEngine(planner.memory)
    new_planner.load()

    assert new_planner.profile.preferred_tools == ["read_file", "write_file", "grep"]
    assert new_planner.profile.code_style == {"indent": 4, "type_hints": True}
    assert new_planner.profile.conventions == {"money_as_cents": True}
    assert new_planner.profile.anti_patterns == ["float for money", "wildcard imports"]


def test_learn_from_edit_infers_preference(planner: PlannerEngine) -> None:
    """learn_from_edit should infer preferences from code changes."""
    before = "def add(a, b):\n    return a + b\n"
    after = "def add(a: int, b: int) -> int:\n    return a + b\n"

    planner.learn_from_edit(before, after, context={"project": "/test", "file": "math.py"})

    # Should infer type hints preference
    assert planner.profile.code_style.get("type_hints") is True


def test_learn_from_edit_infers_money_convention(planner: PlannerEngine) -> None:
    """learn_from_edit should detect money-as-cents pattern."""
    before = "price = 19.99\n"
    after = "price_cents = 1999\n"

    planner.learn_from_edit(before, after, context={"project": "/test", "file": "pricing.py"})

    assert planner.profile.conventions.get("money_as_cents") is True


def test_apply_profile_returns_config(planner: PlannerEngine) -> None:
    """apply_profile should return config based on learned preferences."""
    planner.profile.preferred_tools = ["read_file", "grep"]
    planner.profile.code_style = {"indent": 2}
    planner.profile.conventions = {"money_as_cents": True}
    planner.profile.anti_patterns = ["float for money"]

    config = planner.apply_profile(task_context={"task": "refactor", "project": "/test"})

    assert "preferred_tools" in config
    assert config["preferred_tools"] == ["read_file", "grep"]
    assert config["code_style"]["indent"] == 2
    assert config["conventions"]["money_as_cents"] is True
    assert "float for money" in config["anti_patterns"]


def test_profile_merges_global_and_project(tmp_path: Path) -> None:
    """Profile should merge global and project-specific preferences."""
    # Global config
    global_config = Path.home() / ".xcopilot" / "config.json"
    global_config.parent.mkdir(parents=True, exist_ok=True)
    global_config.write_text('{"preferred_tools": ["read_file"], "code_style": {"indent": 4}}')

    # Project config
    project_config = tmp_path / ".xcopilot" / "config.json"
    project_config.parent.mkdir(parents=True, exist_ok=True)
    project_config.write_text('{"preferred_tools": ["write_file"], "conventions": {"money_as_cents": true}}')

    planner = PlannerEngine(MemoryEngine(project_root=str(tmp_path)))
    planner.load()

    # Should have both global and project preferences
    assert "read_file" in planner.profile.preferred_tools
    assert "write_file" in planner.profile.preferred_tools
    assert planner.profile.code_style.get("indent") == 4
    assert planner.profile.conventions.get("money_as_cents") is True

    # Cleanup
    import shutil
    shutil.rmtree(global_config.parent, ignore_errors=True)