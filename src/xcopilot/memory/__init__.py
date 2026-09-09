"""Memory engine — facade composing all 5 memory layers."""

from __future__ import annotations

from pathlib import Path

from xcopilot.memory.episodic import EpisodicMemory
from xcopilot.memory.procedural import ProceduralMemory
from xcopilot.memory.project import ProjectMemory
from xcopilot.memory.semantic import SemanticMemory
from xcopilot.memory.session import SessionMemory


class MemoryEngine:
    """Composes all 5 memory layers: Session, Episodic, Semantic, Procedural, Project."""

    def __init__(
        self,
        project_root: str | None = None,
        session: SessionMemory | None = None,
        episodic: EpisodicMemory | None = None,
        semantic: SemanticMemory | None = None,
        procedural: ProceduralMemory | None = None,
        project: ProjectMemory | None = None,
    ) -> None:
        self.project_root = Path(project_root) if project_root else Path.cwd()

        # Session memory (in-memory, per conversation)
        self.session = session or SessionMemory()

        # Episodic memory (SQLite + JSONL)
        episodic_db = self.project_root / ".xcopilot" / "memory" / "episodic.db"
        episodic_jsonl = self.project_root / ".xcopilot" / "memory" / "episodic.jsonl"
        self.episodic = episodic or EpisodicMemory(
            db_path=str(episodic_db),
            jsonl_path=str(episodic_jsonl),
        )

        # Semantic memory (ChromaDB)
        chroma_dir = self.project_root / ".xcopilot" / "memory" / "chroma"
        self.semantic = semantic or SemanticMemory(persist_dir=str(chroma_dir))

        # Procedural memory (SKILL.md files)
        self.procedural = procedural or ProceduralMemory(project_root=str(self.project_root))

        # Project memory (AGENTS.md)
        self.project = project or ProjectMemory(project_root=str(self.project_root))
