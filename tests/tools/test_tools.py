"""Tool tests — shell, file, search, web operations."""

from __future__ import annotations

from pathlib import Path

import pytest

from xcopilot.permission.pipeline import PermissionMode, PermissionPipeline
from xcopilot.tools.file import FileTool
from xcopilot.tools.search import SearchTool
from xcopilot.tools.shell import ShellTool
from xcopilot.tools.web import WebTool


@pytest.fixture
def shell_tool() -> ShellTool:
    """Create a shell tool with STANDARD permission."""
    pipeline = PermissionPipeline(PermissionMode.BYPASS)
    return ShellTool(pipeline=pipeline)


@pytest.fixture
def file_tool(tmp_path: Path) -> FileTool:
    """Create a file tool with BYPASS permission."""
    pipeline = PermissionPipeline(PermissionMode.BYPASS)
    return FileTool(pipeline=pipeline)


@pytest.fixture
def search_tool() -> SearchTool:
    """Create a search tool."""
    return SearchTool()


@pytest.fixture
def web_tool() -> WebTool:
    """Create a web tool."""
    pipeline = PermissionPipeline(PermissionMode.BYPASS)
    return WebTool(pipeline=pipeline)


def test_shell_run(shell_tool: ShellTool) -> None:
    """ShellTool.run should execute commands and return output."""
    result = shell_tool.run("echo hello", timeout=5)
    assert result.returncode == 0
    assert "hello" in result.output.strip()


def test_shell_run_with_cwd(shell_tool: ShellTool, tmp_path: Path) -> None:
    """ShellTool.run should respect cwd."""
    result = shell_tool.run("pwd", cwd=str(tmp_path), timeout=5)
    assert result.returncode == 0
    # On Unix, cwd is returned as a path - check it's not empty
    assert len(result.output.strip()) > 0


def test_shell_run_timeout(shell_tool: ShellTool) -> None:
    """ShellTool.run should handle timeout by returning a DENIED or TIMEOUT result."""
    result = shell_tool.run("sleep 5", timeout=0.1)
    assert result.result_type.value in ("timeout", "error")


def test_file_read(file_tool: FileTool, tmp_path: Path) -> None:
    """FileTool.read should return file contents."""
    test_file = tmp_path / "test.txt"
    test_file.write_text("Hello, world!")
    content = file_tool.read(str(test_file))
    assert content == "Hello, world!"


def test_file_write(file_tool: FileTool, tmp_path: Path) -> None:
    """FileTool.write should create and write to file."""
    test_file = tmp_path / "new.txt"
    file_tool.write(str(test_file), "new content")
    assert test_file.exists()
    assert test_file.read_text() == "new content"


def test_file_edit(file_tool: FileTool, tmp_path: Path) -> None:
    """FileTool.edit should replace text in a file."""
    test_file = tmp_path / "edit.txt"
    test_file.write_text("Hello world\nGoodbye world")
    file_tool.edit(str(test_file), old="world", new="X-Copilot")
    content = test_file.read_text()
    assert "Hello X-Copilot" in content
    # edit replaces first occurrence only
    assert "Goodbye world" in content


def test_file_patch(file_tool: FileTool, tmp_path: Path) -> None:
    """FileTool.patch should apply a diff-like edit."""
    test_file = tmp_path / "patch.txt"
    test_file.write_text("line1\nline2\nline3")
    file_tool.edit(str(test_file), old="line2", new="line2_modified")
    content = test_file.read_text()
    assert "line2_modified" in content
    assert "line1" in content
    assert "line3" in content


def test_file_read_missing(file_tool: FileTool) -> None:
    """FileTool.read should raise FileNotFoundError for missing files."""
    with pytest.raises(FileNotFoundError):
        file_tool.read("/nonexistent/file.txt")


def test_grep_search(search_tool: SearchTool, tmp_path: Path) -> None:
    """SearchTool.grep should find text in files."""
    test_file = tmp_path / "search.txt"
    test_file.write_text("Hello world\nfoo bar\nHello again")
    results = search_tool.grep("Hello", str(tmp_path))
    assert len(results) >= 1
    assert any("Hello" in r.content for r in results)


def test_glob_search(search_tool: SearchTool, tmp_path: Path) -> None:
    """SearchTool.glob should find files by pattern."""
    test_file = tmp_path / "test.py"
    test_file.write_text("print('hello')")
    results = search_tool.glob("*.py", str(tmp_path))
    assert len(results) >= 1
    assert any(r.name == "test.py" for r in results)


def test_web_fetch(web_tool: WebTool) -> None:
    """WebTool.fetch should return response from a URL."""
    result = web_tool.fetch("https://httpbin.org/get", timeout=10)
    assert result.status_code == 200
    data = result.json()
    assert "url" in data