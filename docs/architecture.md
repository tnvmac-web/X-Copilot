# X-Copilot Architecture

## Overview

X-Copilot is a self-growing AI agent for Windows built on a two-process architecture:

- **Python Core** (`src/xcopilot/`): Agent loop, memory, learner, skills, permissions
- **Node.js CLI** (`cli/`): User-facing `xcopilot` command, installer, plugin loader

## System Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    X-COPILOT ENGINE                       │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────┐  ┌──────────────┐ ┌─────────────┐      │
│  │  MEMORY     │  │  LEARNER     │ │  ADAPTER     │      │
│  │  ENGINE     │  │  ENGINE      │ │  (Skills)   │      │
│  │             │  │              │ │              │      │
│  │ • Session   │  │ Observe      │ │ • Load       │      │
│  │ • Episodic  │  │ → Signal     │ │ • Create     │      │
│  │ • Semantic  │  │ → Distill    │ │ • Update     │      │
│  │ • Procedural│  │ → Store      │ │ • Prune      │      │
│  │ • Project   │  │ → Apply      │ │ • Merge      │      │
│  └─────┬──────┘  └──────┬───────┘ └──────┬──────┘      │
│        │                │                 │              │
│        │                ▼                 │              │
│  ┌─────┴─────┐  ┌──────────────┐ ┌──────┴──────┐      │
│  │ EVALUATE  │  │  TASTE/PLAN  │ │  EXECUTE    │      │
│  │ MODULE    │◀─│  PROFILE     │─│  RUNTIME    │      │
│  │           │  │              │ │              │      │
│  │ Score     │  │ Learn from   │ │ • Tools      │      │
│  │ Improve?  │  │ every edit   │ │ • Shell      │      │
│  │ Adapt     │  │ every action │ │ • Read       │      │
│  │ Prune     │  │              │ │ • Write      │      │
│  └─────┬─────┘  └──────────────┘ └──────┬──────┘      │
│        │                                │              │
│        │_________ FEEDBACK _____________│              │
│           LOOP                                     │
└──────────────────────────────────────────────────────────┘
```

## Component Layers

### 1. Memory Engine (5 Layers)

| Layer | Type | Storage | Persistence | Content |
|-------|------|---------|-------------|---------|
| **Session** | Conversational | In-memory | Current task only | Current context, task progress |
| **Episodic** | What happened | SQLite/JSONL | Per-project | "Last time we used PostgreSQL" |
| **Semantic** | Inferred facts | ChromaDB | User-level | "Prefers TypeScript over JS" |
| **Procedural** | How to work | SKILL.md files | Global | "Always check logs first when debugging" |
| **Project** | Architecture rules | AGENTS.md | Project-level | "Use cents for money, never floats" |

**Memory decay**: Patterns older than 90 days with no activity are marked for pruning. Active patterns are reinforced.

### 2. Learner Engine

The core self-improving loop:

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  ACT      │───▶│ EVALUATE │───▶│  ADAPT   │
│ Execute   │    │ Score    │    │ Modify   │
│ Task      │    │ Output   │    │ Behavior │
└────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │
     │               ▼               │
     │          ┌──────────┐          │
     │          │ OBSERVE  │          │
     │          │ Signal   │          │
     │          └────┬─────┘          │
     │               │               │
     │               ▼               │
     │          ┌──────────┐          │
     │          │  STORE   │          │
     │          │ Memory   │          │
     │          └──────────┘          │
     │                               │
     └───────────────────────────────┘
           FEEDBACK LOOP
```

**Step 1 — Observe**: Every tool call, accept, reject, edit, error is captured as a signal
**Step 2 — Distill**: Signal is classified: preference, mistake, pattern, workflow
**Step 3 — Store**: Saved to the appropriate memory layer
**Step 4 — Evaluate**: Check if new patterns improved the next output
**Step 5 — Adapt**: Modify skills, preferences, or behavior accordingly

### 3. Adapter (Skills)

Skills are stored as `SKILL.md` files:
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

Skills auto-created when:
- A task requires multiple steps
- Tool call errors resolved through iteration
- User correction improves the approach
- A meaningful task repeated 3+ times

### 4. Taste/Plan Profile

Personal working style profile:
- Preferred tools, patterns, conventions
- Learned from every accept/reject/edit
- Updated continuously
- Shared across sessions automatically

### 5. Evaluate Module

- Scores output against criteria
- Checks if new patterns improved results
- Triggers adaptation if score below threshold
- Tracks improvement over time

### 6. Runtime

- Tool execution (shell, read, write, search)
- Permission pipeline (5 modes)
- Checkpoint/rewind before every modification
- Context budget management
- Safety guardrails

## Permission Pipeline

Every action passes through this check:

```
DENY (always blocks) → ASK (always prompts) → ALLOW (auto-approve)
```

### Permission Modes

| Mode | Behavior | When to Use |
|------|----------|-------------|
| **standard** | Prompt before edits/commands | Default mode |
| **auto-ask** | Always prompts | Sensitive projects |
| **plan** | Read-only, no side effects | Exploration |
| **bypass** | Skip all prompts | Testing, trusted environments |
| **dont-ask** | Auto-allow (denies in bypass) | Automation scripts |

### What Never Happens Without Permission

- File deletion in production directories
- Shell commands with destructive flags (`rm`, `format`, `del`)
- Network requests to unknown endpoints
- Installation of new packages without confirmation
- Git push operations

## Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Runtime** | Python 3.11 | Cross-version compatible, rich ecosystem |
| **CLI** | Node.js | Fast, npm ecosystem |
| **Memory** | SQLite + JSONL | Lightweight, offline-first, cross-version |
| **Vector DB** | ChromaDB | Embedded, no server needed |
| **Skill Format** | SKILL.md | Standard, portable, human-readable |
| **Install** | PowerShell + winget | Built into Windows |
| **Models** | OpenAI-compatible API | Any provider works |
| **Build** | npm + pip | Standard package managers |
| **Platform** | Windows 10 19041+ | Same minimum as CommandCode |

## Development Workflow

```bash
# Local Development
npm run dev          # Start Node CLI in dev mode
pytest tests/ -v     # Run Python tests
npm test             # Run Node tests

# Build
npm run build        # Build TypeScript
python -m build      # Build Python package

# Test
pytest tests/ -v     # Full test suite
npm test             # Node test suite

# Install
pip install -e .     # Editable install
npm install          # Node dependencies
```

## Deployment to Windows

1. Build locally: `python -m build && npm run build`
2. Create installer: Package Python + Node bundle
3. Distribute via winget or PowerShell installer
4. User runs: `irm https://xcopilot.ai/install.ps1 | iex`