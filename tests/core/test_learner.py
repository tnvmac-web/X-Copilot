"""Learner engine tests — signal observation, distillation, storage."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

import pytest

from xcopilot.core.learner import LearnerEngine, Pattern, PatternType, Signal, SignalType
from xcopilot.memory import MemoryEngine


@pytest.fixture
def memory_engine(tmp_path: Path) -> MemoryEngine:
    """Create a MemoryEngine with temp directories."""
    return MemoryEngine(project_root=str(tmp_path))


@pytest.fixture
def learner(memory_engine: MemoryEngine) -> LearnerEngine:
    """Create a LearnerEngine with memory."""
    return LearnerEngine(memory_engine)


def test_observe_captures_signal(learner: LearnerEngine) -> None:
    """observe should capture and store a signal."""
    signal = Signal(
        type=SignalType.TOOL_CALL,
        payload={"tool": "read_file", "path": "test.py"},
        context={"project": "/test", "session_id": "sess_1"},
    )
    learner.observe(signal)

    # Signal should be stored in episodic memory
    events = learner.memory.episodic.query(project="/test", limit=10)
    assert len(events) >= 1
    assert events[0].type == "tool_call"


def test_observe_different_signal_types(learner: LearnerEngine) -> None:
    """observe should handle all signal types."""
    for sig_type in SignalType:
        signal = Signal(type=sig_type, payload={}, context={"project": "/test", "session_id": "s1"})
        learner.observe(signal)

    events = learner.memory.episodic.query(project="/test", limit=20)
    assert len(events) >= len(SignalType)


def test_distill_classifies_preference(learner: LearnerEngine) -> None:
    """distill should classify user preferences from accept/reject signals."""
    # Simulate user accepting TypeScript suggestion multiple times
    for _ in range(3):
        signal = Signal(
            type=SignalType.USER_ACCEPT,
            payload={"suggestion": "use TypeScript", "context": "code_style"},
            context={"project": "/test", "session_id": "s1"},
        )
        learner.observe(signal)

    patterns = learner.distill()
    pref_patterns = [p for p in patterns if p.type == PatternType.PREFERENCE]
    assert len(pref_patterns) >= 1
    assert any("TypeScript" in p.description for p in pref_patterns)


def test_distill_classifies_mistake(learner: LearnerEngine) -> None:
    """distill should classify repeated errors as mistakes."""
    for _ in range(3):
        signal = Signal(
            type=SignalType.ERROR,
            payload={"error": "float for money", "context": "money_handling"},
            context={"project": "/test", "session_id": "s1"},
        )
        learner.observe(signal)

    patterns = learner.distill()
    mistake_patterns = [p for p in patterns if p.type == PatternType.MISTAKE]
    assert len(mistake_patterns) >= 1
    assert any("float" in p.description.lower() or "money" in p.description.lower() for p in mistake_patterns)


def test_distill_classifies_workflow(learner: LearnerEngine) -> None:
    """distill should identify repeated workflow patterns."""
    # Simulate a repeated workflow: edit -> test -> commit
    workflow_steps = ["edit_file", "run_tests", "git_commit"]
    for _ in range(3):
        for step in workflow_steps:
            signal = Signal(
                type=SignalType.TOOL_CALL,
                payload={"tool": step},
                context={"project": "/test", "session_id": "s1"},
            )
            learner.observe(signal)

    patterns = learner.distill()
    workflow_patterns = [p for p in patterns if p.type == PatternType.WORKFLOW]
    assert len(workflow_patterns) >= 1


def test_store_saves_to_procedural_memory(learner: LearnerEngine, tmp_path: Path) -> None:
    """store should save patterns as skills to procedural memory."""
    pattern = Pattern(
        id="pat_1",
        type=PatternType.PREFERENCE,
        description="Use TypeScript for new files",
        evidence=[],
        confidence=0.9,
        created_at=datetime.now(),
        last_reinforced=datetime.now(),
    )
    learner.store(pattern)

    # Should create a skill
    skills = learner.memory.procedural.list_skills()
    assert len(skills) >= 1


def test_decay_old_patterns(learner: LearnerEngine) -> None:
    """decay_old_patterns should mark old patterns for pruning."""
    # This is a maintenance operation - should not error
    decayed = learner.decay_old_patterns(days=90)
    assert isinstance(decayed, int)