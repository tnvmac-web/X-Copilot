"""File tool — read, write, edit, patch operations."""

from __future__ import annotations

from pathlib import Path

from xcopilot.permission.pipeline import PermissionAction, PermissionResult


class FileTool:
    """File operations with permission checks."""

    def __init__(self, pipeline, base_dir: str | None = None) -> None:
        self.pipeline = pipeline
        self.base_dir = Path(base_dir) if base_dir else Path.cwd()

    def read(self, path: str) -> str:
        """Read a file's contents."""
        full_path = self._resolve_path(path)

        # Check permission
        result = self.pipeline.check(PermissionAction.READ_FILE, {"path": str(full_path)})
        if result == PermissionResult.DENY:
            raise PermissionError(f"Read denied: {path}")

        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {path}")

        return full_path.read_text(encoding="utf-8")

    def write(self, path: str, content: str) -> str:
        """Write content to a file."""
        full_path = self._resolve_path(path)

        # Check permission
        result = self.pipeline.check(PermissionAction.WRITE_FILE, {"path": str(full_path)})
        if result == PermissionResult.DENY:
            raise PermissionError(f"Write denied: {path}")

        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content, encoding="utf-8")
        return str(full_path)

    def edit(self, path: str, old: str, new: str) -> str:
        """Replace text in a file."""
        content = self.read(path)
        if old not in content:
            raise ValueError(f"Pattern not found in {path}")

        new_content = content.replace(old, new, 1)
        self.write(path, new_content)
        return str(Path(path))

    def patch(self, path: str, diff: dict) -> str:
        """Apply a diff-like edit (old/new replacements)."""
        content = self.read(path)
        old = diff.get("old", "")
        new = diff.get("new", "")
        return self.edit(path, old, new)

    def _resolve_path(self, path: str) -> Path:
        """Resolve a path relative to base_dir."""
        return self.base_dir / path