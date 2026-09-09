"""Tests for SessionMemory (in-memory dict layer)."""

import pytest
from xcopilot.memory.session import SessionMemory


def test_session_basic():
    mem = SessionMemory()
    mem.set("key", "value")
    assert mem.get("key") == "value"
    mem.clear()
    assert mem.get("key") is None


def test_session_set_overwrite():
    mem = SessionMemory()
    mem.set("key", "first")
    mem.set("key", "second")
    assert mem.get("key") == "second"


def test_session_get_missing():
    mem = SessionMemory()
    assert mem.get("nonexistent") is None


def test_session_clear_empty():
    mem = SessionMemory()
    mem.set("a", 1)
    mem.set("b", 2)
    mem.clear()
    assert mem.get("a") is None
    assert mem.get("b") is None


def test_session_different_types():
    mem = SessionMemory()
    mem.set("str", "hello")
    mem.set("int", 42)
    mem.set("list", [1, 2, 3])
    assert mem.get("str") == "hello"
    assert mem.get("int") == 42
    assert mem.get("list") == [1, 2, 3]
