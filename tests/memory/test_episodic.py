"""Episodic memory tests — SQLite + JSONL."""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path

import pytest

from xcopilot.memory.episodic import EpisodicEvent, EpisodicMemory


@pytest.fixture
def tmp_dir(tmp_path: Path) -> Path:
    """Create a temporary directory for the database."""
    return tmp_path


@pytest.fixture
def episodic_mem(tmp_dir: Path) -> EpisodicMemory:
    """Create an EpisodicMemory instance with a temp database."""
    db_path = tmp_dir / "episodic.db"
    jsonl_path = tmp_dir / "episodic.jsonl"
    return EpisodicMemory(db_path=str(db_path), jsonl_path=str(jsonl_path))


def test_append_event(episodic_mem: EpisodicMemory) -> None:
    """append should store an event in SQLite and JSONL."""
    event = EpisodicEvent(
        type="tool_call",
        payload={"tool": "read_file", "path": "test.py"},
        project="/test/project",
        session_id="sess_123",
    )
    episodic_mem.append(event)

    events = episodic_mem.query(project="/test/project", limit=10)
    assert len(events) == 1
    assert events[0].type == "tool_call"
    assert events[0].payload == {"tool": "read_file", "path": "test.py"}
    assert events[0].project == "/test/project"
    assert events[0].session_id == "sess_123"


def test_query_filters_by_project(episodic_mem: EpisodicMemory) -> None:
    """query should filter by project."""
    episodic_mem.append(EpisodicEvent(type="tool_call", payload={}, project="/proj/a", session_id="s1"))
    episodic_mem.append(EpisodicEvent(type="tool_call", payload={}, project="/proj/b", session_id="s1"))
    episodic_mem.append(EpisodicEvent(type="tool_call", payload={}, project="/proj/a", session_id="s2"))

    proj_a = episodic_mem.query(project="/proj/a", limit=10)
    assert len(proj_a) == 2
    assert all(e.project == "/proj/a" for e in proj_a)

    proj_b = episodic_mem.query(project="/proj/b", limit=10)
    assert len(proj_b) == 1
    assert proj_b[0].project == "/proj/b"


def test_query_filters_by_type(episodic_mem: EpisodicMemory) -> None:
    """query should filter by event type."""
    episodic_mem.append(EpisodicEvent(type="tool_call", payload={}, project="/test", session_id="s1"))
    episodic_mem.append(EpisodicEvent(type="user_edit", payload={}, project="/test", session_id="s1"))
    episodic_mem.append(EpisodicEvent(type="error", payload={}, project="/test", session_id="s1"))

    tool_calls = episodic_mem.query(project="/test", type="tool_call", limit=10)
    assert len(tool_calls) == 1
    assert tool_calls[0].type == "tool_call"


def test_query_limit(episodic_mem: EpisodicMemory) -> None:
    """query should respect limit."""
    for i in range(5):
        episodic_mem.append(EpisodicEvent(type="tool_call", payload={"i": i}, project="/test", session_id="s1"))

    limited = episodic_mem.query(project="/test", limit=3)
    assert len(limited) == 3


def test_query_orders_by_timestamp_desc(episodic_mem: EpisodicMemory) -> None:
    """query should return newest events first."""
    base = datetime(2026, 1, 1, 12, 0, 0)
    for i in range(3):
        event = EpisodicEvent(
            type="tool_call",
            payload={"i": i},
            project="/test",
            session_id="s1",
            timestamp=base + timedelta(seconds=i),
        )
        episodic_mem.append(event)

    events = episodic_mem.query(project="/test", limit=10)
    assert len(events) == 3
    assert events[0].payload["i"] == 2  # newest first
    assert events[1].payload["i"] == 1
    assert events[2].payload["i"] == 0


def test_prune_removes_old_events(episodic_mem: EpisodicMemory) -> None:
    """prune should remove events older than specified days."""
    old_ts = datetime.now() - timedelta(days=100)
    recent_ts = datetime.now() - timedelta(days=10)

    episodic_mem.append(EpisodicEvent(type="tool_call", payload={"old": True}, project="/test", session_id="s1", timestamp=old_ts))
    episodic_mem.append(EpisodicEvent(type="tool_call", payload={"recent": True}, project="/test", session_id="s1", timestamp=recent_ts))

    # Prune events older than 90 days
    removed = episodic_mem.prune(days=90)
    assert removed == 1

    remaining = episodic_mem.query(project="/test", limit=10)
    assert len(remaining) == 1
    assert remaining[0].payload.get("recent") is True


def test_prune_no_events_returns_zero(episodic_mem: EpisodicMemory) -> None:
    """prune should return 0 when no events to remove."""
    episodic_mem.append(EpisodicEvent(type="tool_call", payload={}, project="/test", session_id="s1"))
    removed = episodic_mem.prune(days=90)
    assert removed == 0


def test_jsonl_backup_created(episodic_mem: EpisodicMemory, tmp_dir: Path) -> None:
    """append should also write to JSONL backup."""
    episodic_mem.append(EpisodicEvent(type="tool_call", payload={"key": "val"}, project="/test", session_id="s1"))

    jsonl_path = tmp_dir / "episodic.jsonl"
    assert jsonl_path.exists()
    lines = jsonl_path.read_text().strip().split("\n")
    assert len(lines) == 1
    data = json.loads(lines[0])
    assert data["type"] == "tool_call"
    assert data["payload"] == {"key": "val"}


def test_multiple_sessions_isolated(episodic_mem: EpisodicMemory) -> None:
    """Events from different sessions should be queryable."""
    episodic_mem.append(EpisodicEvent(type="tool_call", payload={"a": 1}, project="/test", session_id="sess_a"))
    episodic_mem.append(EpisodicEvent(type="tool_call", payload={"b": 2}, project="/test", session_id="sess_b"))

    sess_a = episodic_mem.query(project="/test", session_id="sess_a", limit=10)
    sess_b = episodic_mem.query(project="/test", session_id="sess_b", limit=10)

    assert len(sess_a) == 1
    assert sess_a[0].payload == {"a": 1}
    assert len(sess_b) == 1
    assert sess_b[0].payload == {"b": 2}


def test_query_with_session_id_filter(episodic_mem: EpisodicMemory) -> None:
    """query should filter by session_id when provided."""
    episodic_mem.append(EpisodicEvent(type="tool_call", payload={}, project="/test", session_id="sess_a"))
    episodic_mem.append(EpisodicEvent(type="tool_call", payload={}, project="/test", session_id="sess_b"))

    filtered = episodic_mem.query(project="/test", session_id="sess_a", limit=10)
    assert len(filtered) == 1
    assert filtered[0].session_id == "sess_a"