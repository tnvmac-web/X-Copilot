"""Procedural memory tests — SKILL.md loader."""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from xcopilot.memory.procedural import ProceduralMemory

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def tmp_dir(tmp_path: Path) -> Path:
    """Create a temporary directory with a .xcopilot/skills/ subdir."""
    skills_dir = tmp_path / ".xcopilot" / "skills"
    skills_dir.mkdir(parents=True)
    return tmp_path


@pytest.fixture
def sample_skill_yaml() -> str:
    """Return a minimal valid SKILL.md content string."""
    return (
        "---\n"
        "name: code-review\n"
        "description: Review code for bugs, security, best practices\n"
        "triggers: [review, code-review, PR review]\n"
        "compatible_agents: [xcopilot, claude-code, codex, cursor]\n"
        "---\n"
        "# Instructions\n"
        "Step-by-step guidance here...\n"
    )


@pytest.fixture
def write_sample_skill(tmp_dir: Path, sample_skill_yaml: str) -> Path:
    """Write a sample SKILL.md to the temp skills dir and return its path."""
    skill_path = tmp_dir / ".xcopilot" / "skills" / "code-review" / "SKILL.md"
    skill_path.parent.mkdir(parents=True)
    skill_path.write_text(sample_skill_yaml)
    return skill_path


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_load_skill_parses_frontmatter(tmp_dir: Path, sample_skill_yaml: str) -> None:
    """load_skill should parse YAML frontmatter and return a SkillData object."""
    skill_path = tmp_dir / ".xcopilot" / "skills" / "code-review" / "SKILL.md"
    skill_path.parent.mkdir(parents=True)
    skill_path.write_text(sample_skill_yaml)

    mem = ProceduralMemory(project_root=str(tmp_dir))
    skill = mem.load_skill(str(skill_path))

    assert skill.name == "code-review"
    assert skill.description == "Review code for bugs, security, best practices"
    assert skill.triggers == ["review", "code-review", "PR review"]
    assert skill.compatible_agents == ["xcopilot", "claude-code", "codex", "cursor"]
    assert skill.instructions.startswith("# Instructions")
    assert skill.path == str(skill_path)


def test_list_skills_returns_all_skills(tmp_dir: Path, write_sample_skill: Path) -> None:
    """list_skills should discover all SKILL.md files under the skills dirs."""
    mem = ProceduralMemory(project_root=str(tmp_dir))
    skills = mem.list_skills()
    names = {s.name for s in skills}
    assert "code-review" in names


def test_list_skills_empty_when_no_skills(tmp_dir: Path) -> None:
    """list_skills should return only built-in skills when no project/global skills exist."""
    mem = ProceduralMemory(project_root=str(tmp_dir))
    skills = mem.list_skills()
    # Should have built-in skills even when no project skills exist
    names = {s.name for s in skills}
    assert "code-review" in names
    assert "debug" in names
    assert "deploy" in names
    assert "test" in names
    assert "learn" in names
    assert "refactor" in names


def test_create_skill_writes_file(tmp_dir: Path) -> None:
    """create_skill should write a SKILL.md with proper YAML frontmatter."""
    mem = ProceduralMemory(project_root=str(tmp_dir))
    skill_path = mem.create_skill(
        name="deploy",
        description="Deploy to production",
        triggers=["deploy", "release"],
        compatible_agents=["xcopilot"],
        instructions="Steps to deploy.",
    )

    assert skill_path is not None
    assert Path(skill_path).exists()

    # Re-read and verify
    mem2 = ProceduralMemory(project_root=str(tmp_dir))
    loaded = mem2.load_skill(skill_path)
    assert loaded.name == "deploy"
    assert loaded.description == "Deploy to production"
    assert loaded.triggers == ["deploy", "release"]
    assert loaded.compatible_agents == ["xcopilot"]


def test_load_skill_missing_file_raises(tmp_dir: Path) -> None:
    """load_skill should raise FileNotFoundError for a non-existent path."""
    mem = ProceduralMemory(project_root=str(tmp_dir))
    with pytest.raises(FileNotFoundError):
        mem.load_skill(str(tmp_dir / "nonexistent" / "SKILL.md"))


def test_load_skill_invalid_yaml_raises(tmp_dir: Path) -> None:
    """load_skill should raise ValueError for SKILL.md with invalid YAML."""
    skill_path = tmp_dir / ".xcopilot" / "skills" / "bad" / "SKILL.md"
    skill_path.parent.mkdir(parents=True)
    skill_path.write_text("---\nname: broken\n- invalid yaml: [\n---\nbody")

    mem = ProceduralMemory(project_root=str(tmp_dir))
    with pytest.raises((ValueError, yaml.YAMLError)):
        mem.load_skill(str(skill_path))


def test_load_skill_missing_frontmatter_raises(tmp_dir: Path) -> None:
    """load_skill should raise ValueError when YAML frontmatter is missing."""
    skill_path = tmp_dir / ".xcopilot" / "skills" / "nofm" / "SKILL.md"
    skill_path.parent.mkdir(parents=True)
    skill_path.write_text("Just some markdown without frontmatter.")

    mem = ProceduralMemory(project_root=str(tmp_dir))
    with pytest.raises(ValueError):
        mem.load_skill(str(skill_path))


def test_list_skills_scans_global_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """list_skills should also scan ~/.xcopilot/skills/ (global dir)."""
    global_skills = Path.home() / ".xcopilot" / "skills"
    global_skills.mkdir(parents=True, exist_ok=True)
    test_skill_dir = global_skills / "test-skill"
    test_skill_dir.mkdir(parents=True, exist_ok=True)
    (test_skill_dir / "SKILL.md").write_text(
        "---\nname: test-skill\ndescription: A test skill\n---\nBody\n"
    )

    try:
        mem = ProceduralMemory(project_root=str(tmp_path))
        skills = mem.list_skills()
        names = {s.name for s in skills}
        assert "test-skill" in names
    finally:
        import shutil

        shutil.rmtree(global_skills, ignore_errors=True)


def test_load_skill_returns_skill_data_model(tmp_dir: Path, sample_skill_yaml: str) -> None:
    """load_skill should return a SkillData pydantic model."""
    from pydantic import BaseModel

    skill_path = tmp_dir / ".xcopilot" / "skills" / "code-review" / "SKILL.md"
    skill_path.parent.mkdir(parents=True)
    skill_path.write_text(sample_skill_yaml)

    mem = ProceduralMemory(project_root=str(tmp_dir))
    skill = mem.load_skill(str(skill_path))
    assert isinstance(skill, BaseModel)
    assert hasattr(skill, "name")
    assert hasattr(skill, "description")
    assert hasattr(skill, "triggers")
    assert hasattr(skill, "compatible_agents")
    assert hasattr(skill, "instructions")


def test_create_skill_with_minimal_data(tmp_dir: Path) -> None:
    """create_skill should work with minimal required fields."""
    mem = ProceduralMemory(project_root=str(tmp_dir))
    skill_path = mem.create_skill(
        name="minimal-skill",
        description="Minimal skill",
        instructions="Do minimal things.",
    )
    assert skill_path is not None
    assert Path(skill_path).exists()

    mem2 = ProceduralMemory(project_root=str(tmp_dir))
    loaded = mem2.load_skill(skill_path)
    assert loaded.name == "minimal-skill"
    assert loaded.instructions == "Do minimal things."
