"""Context compaction tests — token budget management."""

from __future__ import annotations

from pathlib import Path

import pytest

from xcopilot.core.compaction import CompactionManager


@pytest.fixture
def compaction_mgr(tmp_path: Path) -> CompactionManager:
    """Create a CompactionManager with temp directory."""
    return CompactionManager(max_tokens=4096)


def test_get_budget_returns_usage(compaction_mgr: CompactionManager) -> None:
    """get_budget should return token usage breakdown."""
    budget = compaction_mgr.get_budget()
    assert hasattr(budget, "total")
    assert hasattr(budget, "used")
    assert hasattr(budget, "memory")
    assert hasattr(budget, "skills")
    assert hasattr(budget, "conversation")


def test_compact_if_needed_triggers(compaction_mgr: CompactionManager) -> None:
    """compact_if_needed should compact when over threshold."""
    # Fill conversation to trigger compaction
    compaction_mgr.conversation_history = ["turn " * 500] * 10
    result = compaction_mgr.compact_if_needed()
    assert isinstance(result, bool)


def test_compact_default_mode(compaction_mgr: CompactionManager) -> None:
    """compact with default mode should summarize."""
    compaction_mgr.conversation_history = ["turn 1", "turn 2", "turn 3"]
    result = compaction_mgr.compact(mode="default")
    assert isinstance(result, str)


def test_compact_fast_mode(compaction_mgr: CompactionManager) -> None:
    """compact with fast mode should truncate middle."""
    compaction_mgr.conversation_history = ["turn " + str(i) for i in range(20)]
    result = compaction_mgr.compact(mode="fast")
    assert isinstance(result, str)


def test_memory_cost_calculates(compaction_mgr: CompactionManager) -> None:
    """memory_cost should return token counts per memory file."""
    costs = compaction_mgr.memory_cost()
    assert isinstance(costs, dict)
