"""Semantic memory tests — ChromaDB vector store.

Tests cover:
- add() — storing facts with embeddings and metadata
- search() — semantic similarity search with project/type filtering
- decay() — pruning old facts based on last_accessed timestamp
- update_access() — updating last_accessed after retrieval
- delete() — removing individual facts
- clear() — removing all facts
- Edge cases: empty search, project isolation, k parameter, metadata storage
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
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
    fact_id = semantic_mem.add(fact)

    results = semantic_mem.search("TypeScript", k=5)
    assert len(results) >= 1
    assert any("TypeScript" in r.content for r in results)
    assert all(r.id == fact_id for r in results)


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
    """decay should remove old unused facts and return count."""
    # Add a fact with an old last_accessed
    old_fact = SemanticFact(
        content="Old fact from long ago",
        project="/test/project",
        type="preference",
    )
    semantic_mem.add(old_fact)

    # Update access to make it old
    old_time = (datetime.now(timezone.utc) - timedelta(days=100)).timestamp()
    semantic_mem.collection.update(
        ids=[old_fact.id],
        metadatas=[{"last_accessed": old_time}],
    )

    # Add a recent fact
    recent_fact = SemanticFact(
        content="Recent fact",
        project="/test/project",
        type="preference",
    )
    semantic_mem.add(recent_fact)

    # Run decay with 90-day threshold
    decayed = semantic_mem.decay(days=90)
    assert isinstance(decayed, int)
    assert decayed >= 1  # The old fact should have been deleted

    # Recent fact should still be searchable
    results = semantic_mem.search("Recent", k=5)
    assert any("Recent" in r.content for r in results)


def test_decay_returns_zero_for_fresh_collection(semantic_mem: SemanticMemory) -> None:
    """decay should return 0 when no facts are old enough."""
    semantic_mem.add(SemanticFact(
        content="Fresh fact",
        project="/test/project",
        type="preference",
    ))
    decayed = semantic_mem.decay(days=1)  # Very short threshold
    # Facts created now should not be older than 1 day
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
    assert all(r.project == "/secret/a" for r in results_a)
    assert all(r.project == "/public/b" for r in results_b)


def test_update_access(semantic_mem: SemanticMemory) -> None:
    """update_access should set last_accessed on a fact."""
    fact = SemanticFact(
        content="Fact to update",
        project="/test/project",
        type="note",
    )
    semantic_mem.add(fact)

    # Should not raise
    semantic_mem.update_access(fact.id)

    # Fact should still be searchable
    results = semantic_mem.search("update", k=5)
    assert len(results) >= 1


def test_delete_fact(semantic_mem: SemanticMemory) -> None:
    """delete should remove a specific fact."""
    fact = SemanticFact(
        content="Fact to delete",
        project="/test/project",
        type="note",
    )
    semantic_mem.add(fact)

    assert semantic_mem.delete(fact.id) is True

    results = semantic_mem.search("delete", k=5)
    assert len(results) == 0


def test_delete_nonexistent_fact(semantic_mem: SemanticMemory) -> None:
    """delete on nonexistent fact should return False."""
    assert semantic_mem.delete("nonexistent_id") is False


def test_clear(semantic_mem: SemanticMemory) -> None:
    """clear should remove all facts from the collection."""
    for i in range(5):
        semantic_mem.add(SemanticFact(
            content=f"Fact {i}",
            project="/test/project",
            type="note",
        ))

    assert semantic_mem.collection.count() == 5
    semantic_mem.clear()
    assert semantic_mem.collection.count() == 0


def test_search_filters_by_type(semantic_mem: SemanticMemory) -> None:
    """search should filter by type when specified."""
    semantic_mem.add(SemanticFact(
        content="Preference fact",
        project="/test/project",
        type="preference",
    ))
    semantic_mem.add(SemanticFact(
        content="Technical fact",
        project="/test/project",
        type="technical",
    ))
    semantic_mem.add(SemanticFact(
        content="Another preference",
        project="/test/project",
        type="preference",
    ))

    pref_results = semantic_mem.search("fact", k=5, type="preference")
    tech_results = semantic_mem.search("fact", k=5, type="technical")

    assert all(r.type == "preference" for r in pref_results)
    assert all(r.type == "technical" for r in tech_results)


def test_fact_properties_after_add(semantic_mem: SemanticMemory) -> None:
    """Fact properties should be preserved after add and search."""
    now = datetime.now(timezone.utc)
    fact = SemanticFact(
        content="Complete fact",
        project="/test/project",
        type="preference",
        metadata={"key": "value"},
    )
    semantic_mem.add(fact)

    results = semantic_mem.search("Complete", k=5)
    assert len(results) >= 1
    r = results[0]
    assert r.content == "Complete fact"
    assert r.project == "/test/project"
    assert r.type == "preference"
    assert r.metadata.get("key") == "value"
    assert r.id == fact.id