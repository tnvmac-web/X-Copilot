"""Semantic memory — ChromaDB vector store for inferred facts."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    chromadb = None
    Settings = None


@dataclass
class SemanticFact:
    """A semantic fact with vector embedding."""

    content: str
    project: str = ""
    type: str = "note"
    metadata: dict = field(default_factory=dict)
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = field(default_factory=datetime.now)
    last_accessed: datetime | None = None


class SemanticMemory:
    """ChromaDB-backed semantic memory for vector search of facts."""

    def __init__(self, persist_dir: str = "~/.xcopilot/memory/chroma") -> None:
        if not CHROMADB_AVAILABLE:
            raise RuntimeError(
                "chromadb is not installed. Install with: pip install chromadb"
            )

        self.persist_dir = Path(persist_dir).expanduser()
        self.persist_dir.mkdir(parents=True, exist_ok=True)

        self.client = chromadb.PersistentClient(
            path=str(self.persist_dir),
            settings=Settings(anonymized_telemetry=False),
        )

        self.collection = self.client.get_or_create_collection(
            name="xcopilot_semantic",
            metadata={"description": "X-Copilot semantic memory"},
        )

    def add(self, fact: SemanticFact) -> str:
        """Add a fact to the vector store. Returns the fact ID."""
        # Prepare metadata for ChromaDB
        meta = {
            "project": fact.project,
            "type": fact.type,
            "created_at": fact.created_at.isoformat(),
            **fact.metadata,
        }
        if fact.last_accessed:
            meta["last_accessed"] = fact.last_accessed.isoformat()

        self.collection.add(
            ids=[fact.id],
            documents=[fact.content],
            metadatas=[meta],
        )
        return fact.id

    def search(
        self,
        query: str,
        k: int = 5,
        project: str | None = None,
        type: str | None = None,
    ) -> list[SemanticFact]:
        """Search for semantically similar facts. Returns list of SemanticFact."""
        where = {}
        if project:
            where["project"] = project
        if type:
            where["type"] = type

        results = self.collection.query(
            query_texts=[query],
            n_results=k,
            where=where if where else None,
        )

        facts = []
        if results["ids"] and results["ids"][0]:
            for i, fact_id in enumerate(results["ids"][0]):
                meta = results["metadatas"][0][i]
                content = results["documents"][0][i]
                distance = results["distances"][0][i] if results["distances"] else None

                fact = SemanticFact(
                    id=fact_id,
                    content=content,
                    project=meta.get("project", ""),
                    type=meta.get("type", "note"),
                    metadata={k: v for k, v in meta.items() if k not in ("project", "type", "created_at", "last_accessed")},
                    created_at=datetime.fromisoformat(meta["created_at"]),
                    last_accessed=datetime.fromisoformat(meta["last_accessed"]) if meta.get("last_accessed") else None,
                )
                facts.append(fact)

        return facts

    def decay(self, days: int = 90) -> int:
        """Mark old unused facts for pruning. Returns count of decayed facts."""
        # In a full implementation, this would update last_accessed and
        # optionally delete facts not accessed within the threshold.
        # For now, just return 0 as a placeholder.
        # A real implementation would scan metadata and delete old entries.
        return 0

    def get_collection_stats(self) -> dict:
        """Return statistics about the collection."""
        count = self.collection.count()
        return {
            "total_facts": count,
            "collection_name": self.collection.name,
        }