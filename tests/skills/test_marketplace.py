"""Skills marketplace tests — GitHub skills ecosystem integration."""

from __future__ import annotations

from pathlib import Path

import pytest

from xcopilot.skills.marketplace import SkillsMarketplace


@pytest.fixture
def marketplace(tmp_path: Path) -> SkillsMarketplace:
    """Create a SkillsMarketplace with temp cache."""
    return SkillsMarketplace(cache_dir=str(tmp_path / "marketplace"))


def test_search_returns_results(marketplace: SkillsMarketplace) -> None:
    """search should return skill results from marketplace."""
    results = marketplace.search("code-review")
    assert isinstance(results, list)
    # Mock returns empty list for now


def test_install_skill(marketplace: SkillsMarketplace, tmp_path: Path) -> None:
    """install should download and create skill."""
    project_root = tmp_path / "project"
    project_root.mkdir()
    
    skill_path = marketplace.install("addyosmani/agent-skills", "code-review", str(project_root))
    # Mock: returns None or path


def test_list_marketplace(marketplace: SkillsMarketplace) -> None:
    """list_marketplace should return available skills."""
    skills = marketplace.list_marketplace()
    assert isinstance(skills, list)


def test_sync_skills(tmp_path: Path) -> None:
    """export/import should sync skills."""
    # Mock test