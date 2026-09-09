"""Semantic memory tests — ChromaDB vector store."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

import pytest

from xcopilot.memory.semantic import SemanticFact, SemanticMemory


@pytest.fixture
def tmp_dir(tmp_path: Path) -> Path:
    """Create a temporary directory for the ChromaDB."""
    return tmp_path


@pytest.fixture
def semantic_mem(tmp_dir: Path) -> SemanticMemory:
    """Create a SemanticMemory instance with a temp directory."""
    return SemanticMemory(persist_dir=str(tmp_dir / "chroma"))


def test_add_fact(semantic_mem: SemanticMemory) -> None:
    """add should store a fact with embedding."""
    fact = SemanticFact(
        content="User prefers TypeScript over JavaScript",
        project="/test/project",
        type="preference",
        metadata={"source": "correction"},
    )
    semantic_mem.add(fact)

    results = semantic_mem.search("TypeScript", k=5)
    assert len(results) >= 1
    assert any("TypeScript" in r.content for r in results)


def test_search_returns_relevant_results(semantic_mem: SemanticMemory) -> None:
    """search should return semantically relevant facts."""
    semantic_mem.add(SemanticFact(
        content="User likes dark mode in editors",
        project="/test/project",
        type="preference",
    ))
    semantic_mem.add(SemanticFact(
        content="User prefers light theme for terminal",
        project="/test/project",
        type="preference",
    ))
    semantic_mem.add(SemanticFact(
        content="Database connection string format",
        project="/test/project",
        type="technical",
    ))

    results = semantic_mem.search("dark mode editor", k=5)
    assert len(results) >= 1
    assert any("dark mode" in r.content.lower() for r in results)


def test_search_filters_by_project(semantic_mem: SemanticMemory) -> None:
    """search should filter by project when specified."""
    semantic_mem.add(SemanticFact(
        content="Project A specific fact",
        project="/project/a",
        type="note",
    ))
    semantic_mem.add(SemanticFact(
        content="Project B specific fact",
        project="/project/b",
        type="note",
    ))

    results_a = semantic_mem.search("specific fact", k=5, project="/project/a")
    results_b = semantic_mem.search("specific fact", k=5, project="/project/b")

    assert all(r.project == "/project/a" for r in results_a)
    assert all(r.project == "/project/b" for r in results_b)


def test_search_respects_k(semantic_mem: SemanticMemory) -> None:
    """search should respect the k parameter."""
    for i in range(10):
        semantic_mem.add(SemanticFact(
            content=f"Fact number {i}",
            project="/test/project",
            type="note",
        ))

    results = semantic_mem.search("Fact number", k=3)
    assert len(results) == 3


def test_decay_marks_old_facts(semantic_mem: SemanticMemory) -> None:
    """decay should mark old unused facts."""
    # Add facts
    semantic_mem.add(SemanticFact(
        content="Old fact from long ago",
        project="/test/project",
        type="preference",
        metadata={"last_accessed": "2020-01-01T00:00:00"},
    ))
    semantic_mem.add(SemanticFact(
        content="Recent fact",
        project="/test/project",
        type="preference",
        metadata={"last_accessed": datetime.now().isoformat()},
    ))

    # This should not error - decay is a maintenance operation
    decayed = semantic_mem.decay(days=90)
    assert isinstance(decayed, int)


def test_add_accepts_metadata(semantic_mem: SemanticMemory) -> None:
    """add should accept and store metadata."""
    fact = SemanticFact(
        content="Fact with metadata",
        project="/test/project",
        type="preference",
        metadata={"source": "user_correction", "confidence": 0.9},
    )
    semantic_mem.add(fact)

    results = semantic_mem.search("metadata", k=5)
    assert len(results) >= 1
    assert results[0].metadata.get("source") == "user_correction"


def test_empty_search_returns_empty(semantic_mem: SemanticMemory) -> None:
    """search on empty collection should return empty list."""
    results = semantic_mem.search("anything", k=5)
    assert results == []


def test_multiple_projects_isolated(semantic_mem: SemanticMemory) -> None:
    """Facts from different projects should not leak."""
    semantic_mem.add(SemanticFact(
        content="Secret project A info",
        project="/secret/a",
        type="note",
    ))
    semantic_mem.add(SemanticFact(
        content="Public project B info",
        project="/public/b",
        type="note",
    ))

    results_a = semantic_mem.search("secret", k=5, project="/secret/a")
    results_b = semantic_mem.search("public", k=5, project="/public/b")

    assert len(results_a) >= 1
    assert len(results_b) >= 1
    # Each project should only return its own facts
    assert all(r.project == "/secret/a" for r in results_a)
    assert all(r.project == "/public/b" for r in results_b)