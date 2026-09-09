"""Search tool — grep, glob, web search."""

from __future__ import annotations

import os
import re
from pathlib import Path

from xcopilot.tools.web import WebTool


class SearchResult:
    """Search result with file path and matched content."""

    def __init__(self, path: str, content: str, line: int = 0) -> None:
        self.path = path
        self.content = content
        self.line = line

    def __repr__(self) -> str:
        return f"SearchResult(path={self.path}, line={self.line})"


class SearchTool:
    """Search files and web with permission checks."""

    def __init__(self) -> None:
        self.web = WebTool()

    def grep(
        self,
        pattern: str,
        path: str,
        max_results: int = 50,
    ) -> list[SearchResult]:
        """Search for pattern in files under path."""
        results = []
        search_path = Path(path)

        if not search_path.exists():
            return results

        regex = re.compile(pattern)
        for root, dirs, files in os.walk(str(search_path)):
            # Skip hidden directories
            dirs[:] = [d for d in dirs if not d.startswith(".")]
            for filename in files:
                if filename.endswith((".pyc", ".node_modules", "__pycache__")):
                    continue
                try:
                    filepath = Path(root) / filename
                    content = filepath.read_text(encoding="utf-8", errors="ignore")
                    for i, line in enumerate(content.split("\n"), 1):
                        if regex.search(line):
                            results.append(SearchResult(
                                path=str(filepath),
                                content=line.strip(),
                                line=i,
                            ))
                            if len(results) >= max_results:
                                return results
                except (PermissionError, UnicodeDecodeError):
                    continue
        return results

    def glob(
        self,
        pattern: str,
        path: str,
    ) -> list[Path]:
        """Find files matching pattern."""
        search_path = Path(path)
        if not search_path.exists():
            return []
        return list(search_path.glob(pattern))

    def web_search(self, query: str, limit: int = 5) -> list[dict]:
        """Search the web using DuckDuckGo HTML."""
        try:
            results = self.web.fetch(
                f"https://html.duckduckgo.com/html/?q={query}"
            )
            # Parse HTML results
            import re
            items = re.findall(
                r'<a class="result__snippet".*?>(.*?)</a>',
                results.text,
                re.DOTALL,
            )
            return [{"snippet": item.strip()} for item in items[:limit]]
        except Exception:
            return []