# X-Copilot Security

## Overview

X-Copilot implements a defense-in-depth security model with a 5-tier permission pipeline, automatic checkpointing, and safe defaults.

## Permission Pipeline

Every action passes through a DENY → ASK → ALLOW chain:

```
DENY (always blocks) → ASK (always prompts) → ALLOW (auto-approve)
```

### Permission Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| **standard** | Prompt before edits/commands | Default, interactive use |
| **auto-ask** | Always prompt for any action | Maximum safety |
| **plan** | Read-only, no side effects | Code exploration, analysis |
| **bypass** | Skip all prompts | Automation, CI/CD |
| **dont-ask** | Auto-allow non-destructive | Trusted environments |

### Destructive Operations (Always DENIED in standard/auto-ask/plan)

```python
# Shell commands
"rm -rf /", "format c:", "del /s /q", "shutdown /s", "mkfs."

# File deletion in production
/var/www/, /etc/, /usr/, C:\Windows\, C:\Program Files\

# Network requests
Unknown domains (not in SAFE_DOMAINS)

# Package management
pip install, npm install, winget install

# Git operations
git push
```

### Safe Domains (Auto-ALLOW for network)

- `api.github.com`
- `api.openai.com`
- `api.anthropic.com`
- `api.nvidia.com`
- `localhost`, `127.0.0.1`
- `raw.githubusercontent.com`

## Checkpoint & Rewind

Every modification creates an automatic snapshot:

```json
{
  "id": "cp_abc123",
  "timestamp": "2026-09-08T22:55:00Z",
  "action": "write_file",
  "target": "src/main.py",
  "before_hash": "sha256...",
  "after_hash": "sha256...",
  "session_id": "sess_xyz",
  "parent": "cp_prev"
}
```

- **Checkpoints**: `.xcopilot/checkpoints/{session_id}/`
- **Rewind**: Restore to any previous checkpoint
- **Fork**: Create new branch from checkpoint
- **Tree**: Browse session history

## Context Compaction

Prevents token overflow:

- Auto-compact at 80% context usage
- `/compact` — manual compression
- `/context` — show budget breakdown
- Modes: `default` (summarize), `fast` (truncate middle)

## Input Validation

All external inputs validated:

- **File paths**: Normalized, checked against base directory
- **Shell commands**: Parsed for destructive patterns
- **Network URLs**: Validated against allowlist
- **JSON/YAML**: Schema validation with Pydantic

## Model API Security

- OpenAI-compatible API only
- API keys stored in config (not code)
- Supports local models (Ollama, Foundry Local, LM Studio)
- No hardcoded credentials

## Data Privacy

- **No telemetry** by default
- **Local-first**: All memory stored locally
- **Optional cloud**: Only for model API calls
- **Export/Delete**: Full control over data

## Dependency Security

- Pinned versions in `pyproject.toml` and `package.json`
- `ruff` for Python linting
- `npm audit` for Node dependencies
- GitHub Dependabot for automated updates

## CI/CD Security

- Tests run in isolated containers
- No secrets in logs
- Signed releases
- SBOM generation

## Best Practices for Users

1. **Use `plan` mode** for exploration
2. **Review checkpoints** before major changes
3. **Set `auto-ask`** for sensitive projects
4. **Regular `xcopilot memory prune`** to clean old data
5. **Keep dependencies updated** via CI/CD

## Reporting Security Issues

Email: security@xcopilot.ai
Or: GitHub Security Advisory