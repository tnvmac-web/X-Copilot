# X-Copilot — Agent Rules & Architecture Guidelines

## Project Overview

X-Copilot is a self-growing AI agent for Windows with:
- 5-layer memory system (Session, Episodic, Semantic, Procedural, Project)
- Multi-model provider support (OpenAI, Anthropic, Ollama, LM Studio, OpenRouter)
- MCP (Model Context Protocol) gateway integration
- Unified skills marketplace with 6 external sources
- Automatic skill creation from observed patterns

---

## Architecture

### Core Components

| Layer | Module | Responsibility |
|-------|--------|----------------|
| **CLI** | `src/xcopilot/cli/` | Click-based commands, REPL |
| **Core** | `src/xcopilot/core/` | Models, MCP, Memory engines, Learner, Planner, Evaluator |
| **Memory** | `src/xcopilot/memory/` | 5-layer memory system |
| **Skills** | `src/xcopilot/skills/` | SKILL.md loader, marketplace integration |
| **Tools** | `src/xcopilot/tools/` | Shell, File, Search, Web operations |
| **Permission** | `src/xcopilot/permission/` | 5-tier permission pipeline |

### Data Flow

```
User Input → Permission Pipeline → Tool Execution → Memory Update → Learner Observation → Pattern Distillation → Skill Creation
```

---

## Coding Standards

### Type Hints (Required)

```python
# Use modern union syntax
def func(x: int | None) -> str | None:
    ...

# Async iterators from collections.abc
from collections.abc import AsyncIterator

async def stream() -> AsyncIterator[str]:
    ...
```

### Async/Await for I/O

All I/O operations must be async:
- HTTP requests: `httpx.AsyncClient`
- Subprocess: `asyncio.create_subprocess_exec`
- File operations: Use async where possible

### Error Handling

```python
# Specific exceptions, not bare Exception
try:
    await client.get(url)
except (httpx.HTTPError, httpx.TimeoutException) as e:
    logger.error(f"Request failed: {e}")
    raise
```

### Imports

```python
# Order: stdlib → third-party → local
import asyncio
import json
from pathlib import Path

import httpx
import openai
from rich.console import Console

from xcopilot.core.models import ModelProvider
from xcopilot.memory import MemoryEngine
```

### Import Style

- Group stdlib, third-party, local
- Sort within groups alphabetically
- Use absolute imports for local modules
- `__future__.annotations` at top of every file

---

## Project Conventions

### Money Handling

- **Never use floats for money**
- Store as integer cents: `price_cents: int = 1999` ($19.99)
- Convert on input/output only

### Configuration

- Environment variables for secrets: `${OPENAI_API_KEY}`
- JSON config files in `.xcopilot/config.json`
- Never hardcode credentials

### File Paths

- Use `pathlib.Path` exclusively
- Resolve relative to project root: `project_root / ".xcopilot" / "config.json"`
- Never use string concatenation for paths

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Classes | PascalCase | `ModelProvider` |
| Functions/variables | snake_case | `list_models` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_TIMEOUT` |
| Private attrs | `_leading_underscore` | `_models_cache` |
| Type vars | PascalCase with `_T` suffix | `ModelT` |

---

## Testing

### Requirements

- All new code must have tests
- Target coverage: ≥ 65%
- Run: `pytest tests/ -v --tb=short`

### Test Structure

```
tests/
├── core/           # Core engine tests
├── memory/         # Memory layer tests
├── permission/     # Permission pipeline tests
├── skills/         # Skill system tests
└── tools/          # Tool tests
```

### Test Patterns

```python
# Use fixtures for setup
@pytest.fixture
def tmp_dir(tmp_path: Path) -> Path:
    return tmp_path

# Descriptive test names
def test_list_models_returns_cached_when_available() -> None:
    ...
```

---

## Git Workflow

### Branch Naming

- `feat/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code improvements
- `docs/` - Documentation

### Commit Messages

```
type(scope): short description

Longer description if needed.

Types: feat, fix, refactor, docs, test, chore
```

### Quality Gates (Pre-push)

```bash
# Must pass locally before push
ruff check src/ tests/
mypy src/
pytest tests/ --cov=src/xcopilot --cov-fail-under=65
```

---

## Security

### Permissions

- **Never** bypass permission pipeline in production code
- Use `PermissionMode.PLAN` for read-only exploration
- Destructive operations always require explicit approval

### Secrets Management

```python
# ✅ Good - from environment
api_key = os.environ.get("OPENAI_API_KEY")

# ❌ Bad - hardcoded
api_key = "sk-..."
```

### Input Validation

- Validate all external inputs (file paths, URLs, user input)
- Use Pydantic models for structured data
- Sanitize shell commands before execution

---

## Performance

### Caching

- Cache model lists with `_models_cache: list[ModelInfo] = []`
- Invalidate on explicit refresh only
- Use `functools.lru_cache` for pure functions

### Async Patterns

```python
# Run independent operations concurrently
results = await asyncio.gather(
    provider1.list_models(),
    provider2.list_models(),
    provider3.list_models(),
)
```

---

## Documentation

### Docstrings

```python
async def list_models(self) -> list[ModelInfo]:
    """List available models from the provider.

    Returns cached models if available, otherwise fetches from API.

    Returns:
        List of ModelInfo objects with capabilities and pricing.
    """
```

### Type Documentation

- All public APIs must have type hints
- Use `TypedDict` for complex dict structures
- Document async return types: `-> ChatResponse | AsyncIterator[ChatResponse]`

---

## Extending the System

### Adding a Model Provider

1. Create `src/xcopilot/core/model_providers/new_provider.py`
2. Subclass `ModelProviderBase`
3. Implement: `chat()`, `embeddings()`, `list_models()`, `health_check()`
4. Register in `src/xcopilot/core/model_providers/__init__.py`
5. Add tests in `tests/core/test_new_provider.py`

### Adding a Skill Source

1. Create subclass of `SkillSource` in `unified_marketplace.py`
2. Implement: `search()`, `sync()`, `install()`
3. Register in `UnifiedMarketplace.__init__()`
4. Add CLI command if needed

### Adding a Tool

1. Create in `src/xcopilot/tools/`
2. Implement permission checks via `PermissionPipeline`
3. Export in `src/xcopilot/tools/__init__.py`
4. Add to agent toolset in `cli/main.py`

---

## Anti-Patterns to Avoid

| Anti-Pattern | Correct Approach |
|--------------|------------------|
| `except Exception:` | Catch specific exceptions |
| `time.sleep()` in async | Use `asyncio.sleep()` |
| `subprocess.run()` in async | Use `asyncio.create_subprocess_exec()` |
| Float for money | Use integer cents |
| Hardcoded paths | Use `Path` with project root |
| Mutable default args | Use `None` and assign inside |
| Bare `return` in async | Explicit `return None` |

---

## Version & Release

- Semantic versioning: `MAJOR.MINOR.PATCH`
- Pre-release: `0.x.y` for alpha
- Changelog in `CHANGELOG.md`
- Tag releases: `git tag v0.1.0`

---

*This document is the source of truth for X-Copilot development. All agents must follow these rules.*