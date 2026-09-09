# X-Copilot Memory System

## Overview

X-Copilot implements a 5-layer memory system that persists across sessions and learns from every interaction.

## Layer 1: Session Memory

**Location**: In-memory dictionary
**Persistence**: Current conversation only
**Content**: Temporary context, task progress, intermediate results

```python
from xcopilot.memory import SessionMemory

mem = SessionMemory()
mem.set("current_task", "refactor auth module")
mem.get("current_task")  # "refactor auth module"
mem.clear()  # End of session
```

## Layer 2: Episodic Memory

**Location**: SQLite database + JSONL backup
**Persistence**: Per-project, permanent
**Schema**:

```sql
CREATE TABLE events (
    id INTEGER PRIMARY KEY,
    timestamp TEXT NOT NULL,      -- ISO8601
    type TEXT NOT NULL,           -- tool_call, edit, accept, reject, error
    payload TEXT NOT NULL,        -- JSON
    project TEXT,                 -- project root path
    session_id TEXT NOT NULL
);
CREATE INDEX idx_events_project_time ON events(project, timestamp);
```

**Usage**:
```python
from xcopilot.memory import EpisodicMemory, EpisodicEvent
from datetime import datetime

mem = EpisodicMemory(db_path="episodic.db", jsonl_path="episodic.jsonl")

mem.append(EpisodicEvent(
    type="tool_call",
    payload={"tool": "read_file", "path": "auth.py"},
    project="/my/project",
    session_id="sess_123"
))

events = mem.query(project="/my/project", limit=10)
mem.prune(days=90)  # Remove old events
```

## Layer 3: Semantic Memory

**Location**: ChromaDB vector database
**Persistence**: User-level, permanent
**Content**: Inferred facts, preferences, patterns with embeddings

```python
from xcopilot.memory import SemanticMemory, SemanticFact

mem = SemanticMemory(persist_dir="~/.xcopilot/memory/chroma")

mem.add(SemanticFact(
    content="User prefers TypeScript over JavaScript",
    project="/my/project",
    type="preference",
    metadata={"source": "correction", "confidence": "0.9"}
))

results = mem.search("TypeScript", k=5)
results = mem.search("TypeScript", k=5, project="/my/project")
```

## Layer 4: Procedural Memory

**Location**: SKILL.md files in `~/.xcopilot/skills/` and `.xcopilot/skills/`
**Persistence**: Global and per-project
**Format**: YAML frontmatter + Markdown instructions

```python
from xcopilot.memory import ProceduralMemory, SkillData

mem = ProceduralMemory(project_root="/my/project")

# Load a skill
skill = mem.load_skill("/my/project/.xcopilot/skills/code-review/SKILL.md")

# List all skills
skills = mem.list_skills()

# Create a new skill
skill_path = mem.create_skill(
    name="deploy",
    description="Deploy to production",
    instructions="Steps to deploy...",
    triggers=["deploy", "release"],
    compatible_agents=["xcopilot"]
)
```

**SKILL.md format**:
```markdown
---
name: code-review
description: Review code for bugs, security, best practices
triggers: [review, code-review, PR review]
compatible_agents: [xcopilot, claude-code, codex, cursor]
---
# Instructions
Step-by-step guidance here...
```

## Layer 5: Project Memory

**Location**: AGENTS.md in project root and `.xcopilot/AGENTS.md`
**Persistence**: Project-level
**Content**: Architecture rules, conventions, coding standards

```python
from xcopilot.memory import ProjectMemory, ProjectRule

mem = ProjectMemory(project_root="/my/project")
mem.load()

rule = mem.get_rule("Money Handling")
# Returns ProjectRule with title, content, level, source_file, line_start, line_end

# Watch for changes
watcher = mem.watch_changes()
# ... do work ...
watcher.stop()

# Reload after changes
mem.reload()
```

## Memory Engine Facade

```python
from xcopilot.memory import MemoryEngine

# Compose all 5 layers
engine = MemoryEngine(project_root="/my/project")

engine.session.set("key", "value")
engine.episodic.append(event)
engine.semantic.add(fact)
engine.procedural.list_skills()
engine.project.get_rule("Code Style")
```

## Configuration

Memory directories:
```
~/.xcopilot/
├── memory/
│   ├── episodic.db
│   ├── episodic.jsonl
│   └── chroma/          # ChromaDB
├── skills/              # Global skills
├── checkpoints/         # Session checkpoints
├── graph/               # Knowledge graph
├── updater/             # Auto-updater data
└── config.json          # Global config
```

Project-specific:
```
<project>/
├── .xcopilot/
│   ├── memory/
│   ├── skills/          # Project skills
│   ├── checkpoints/
│   ├── graph/
│   ├── AGENTS.md        # Project rules
│   └── config.json      # Project config
```

## Decay & Pruning

- Episodic: `prune(days=90)` removes events older than 90 days
- Semantic: `decay(days=90)` marks unused facts for review
- Checkpoints: Auto-prune older than 30 days, max 1000 per session
- Patterns: Reinforced by usage, decay without activity