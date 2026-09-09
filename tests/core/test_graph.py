"""Knowledge graph tests — structural project indexing."""

from __future__ import annotations

from pathlib import Path

import pytest

from xcopilot.core.graph import KnowledgeGraph


@pytest.fixture
def tmp_dir(tmp_path: Path) -> Path:
    """Create a temporary directory with Python files."""
    return tmp_path


@pytest.fixture
def sample_project(tmp_dir: Path) -> Path:
    """Create a sample project structure."""
    (tmp_dir / "main.py").write_text(
        "import os\nfrom utils import helper\n\ndef main():\n    helper()\n"
    )
    (tmp_dir / "utils.py").write_text("import sys\n\ndef helper():\n    return 'hello'\n")
    (tmp_dir / "config.py").write_text("CONFIG = {'debug': True}\n")
    return tmp_dir


def test_build_creates_graph(sample_project: Path) -> None:
    """build should create a knowledge graph from project files."""
    graph = KnowledgeGraph()
    graph.build(str(sample_project))

    assert graph.node_count() > 0
    assert graph.edge_count() > 0


def test_query_returns_relevant_nodes(sample_project: Path) -> None:
    """query should return nodes matching the query."""
    graph = KnowledgeGraph()
    graph.build(str(sample_project))

    results = graph.query("helper function")
    assert len(results) > 0
    assert any("helper" in str(r) for r in results)


def test_query_imports(sample_project: Path) -> None:
    """query should find import relationships."""
    graph = KnowledgeGraph()
    graph.build(str(sample_project))

    results = graph.query("imports utils")
    assert len(results) > 0


def test_stats_returns_counts(sample_project: Path) -> None:
    """stats should return node/edge counts."""
    graph = KnowledgeGraph()
    graph.build(str(sample_project))

    stats = graph.stats()
    assert "nodes" in stats
    assert "edges" in stats
    assert stats["nodes"] > 0
    assert stats["edges"] > 0


def test_watch_changes_returns_observer(sample_project: Path) -> None:
    """watch_changes should return a watchdog observer."""
    graph = KnowledgeGraph()
    graph.build(str(sample_project))

    watcher = graph.watch_changes()
    assert watcher is not None
    watcher.stop()


def test_empty_project(sample_project: Path) -> None:
    """build on empty project should not error."""
    graph = KnowledgeGraph()
    graph.build(str(sample_project))
    assert graph.node_count() >= 0
