"""Memory engine — facade composing all 5 memory layers."""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from xcopilot.memory.session import SessionMemory
from xcopilot.memory.episodic import EpisodicMemory
from xcopilot.memory.semantic import SemanticMemory
from xcopilot.memory.procedural import ProceduralMemory
from xcopilot.memory.project import ProjectMemory


class MemoryEngine:
    """Composes all 5 memory layers: Session, Episodic, Semantic, Procedural, Project."""

    def __init__(
        self,
        project_root: Optional[str] = None,
        session: Optional[SessionMemory] = None,
        episodic: Optional[EpisodicMemory] = None,
        semantic: Optional[SemanticMemory] = None,
        procedural: Optional[ProceduralMemory] = None,
        project: Optional[ProjectMemory] = None,
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