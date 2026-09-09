"""Evaluator tests — output scoring and improvement detection."""

from __future__ import annotations

from xcopilot.core.evaluator import Evaluator


def test_evaluator_default_criteria() -> None:
    """Evaluator should have default criteria."""
    evaluator = Evaluator()
    criteria = evaluator.default_criteria()

    assert "correctness" in criteria
    assert "style" in criteria
    assert "safety" in criteria
    assert all(0 <= w <= 1 for w in criteria.values())
    assert abs(sum(criteria.values()) - 1.0) < 0.001


def test_score_returns_0_to_1() -> None:
    """score should return a value between 0 and 1."""
    evaluator = Evaluator()
    score = evaluator.score("print('hello')", {"correctness": 1.0})

    assert 0.0 <= score <= 1.0


def test_score_penalizes_safety_issues() -> None:
    """score should penalize unsafe code patterns."""
    evaluator = Evaluator()

    unsafe_code = "import os; os.system('rm -rf /')"
    safe_code = "print('hello')"

    unsafe_score = evaluator.score(unsafe_code, {"safety": 1.0})
    safe_score = evaluator.score(safe_code, {"safety": 1.0})

    assert unsafe_score < safe_score


def test_score_rewards_correctness() -> None:
    """score should reward correct code patterns."""
    evaluator = Evaluator()

    correct_code = "def add(a: int, b: int) -> int:\n    return a + b"
    incorrect_code = "def add(a, b):\n    return a - b  # wrong operation"

    correct_score = evaluator.score(correct_code, {"correctness": 1.0})
    incorrect_score = evaluator.score(incorrect_code, {"correctness": 1.0})

    assert correct_score > incorrect_score


def test_improved_detects_improvement() -> None:
    """improved should return True when new score is higher."""
    evaluator = Evaluator()

    assert evaluator.improved("old_pattern", 0.6, 0.8) is True
    assert evaluator.improved("old_pattern", 0.8, 0.6) is False
    assert evaluator.improved("old_pattern", 0.7, 0.7) is False


def test_should_adapt_below_threshold() -> None:
    """should_adapt should return True when score below threshold."""
    evaluator = Evaluator()

    assert evaluator.should_adapt(0.5, threshold=0.7) is True
    assert evaluator.should_adapt(0.7, threshold=0.7) is False
    assert evaluator.should_adapt(0.9, threshold=0.7) is False


def test_custom_criteria_weights() -> None:
    """Evaluator should accept custom criteria weights."""
    evaluator = Evaluator(criteria={"correctness": 0.5, "style": 0.3, "safety": 0.2})

    # Safety-heavy code should score differently
    code = "print('hello')"
    score = evaluator.score(code)
    assert 0.0 <= score <= 1.0


def test_evaluation_result_contains_details() -> None:
    """evaluate should return detailed results."""
    evaluator = Evaluator()
    result = evaluator.evaluate("print('hello')", {"correctness": 1.0})

    assert hasattr(result, "score")
    assert hasattr(result, "breakdown")
    assert hasattr(result, "passed")
    assert isinstance(result.breakdown, dict)
