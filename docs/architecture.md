# X-Copilot Architecture

## Overview

X-Copilot is a self-growing AI agent for Windows built on a two-process architecture:

- **Python Core** (`src/xcopilot/`): Agent loop, memory, learner, skills, permissions, model providers
- **Python CLI** (`src/xcopilot/cli/`): User-facing `xcopilot` command built with Click, including the `serve` subcommand for the FastAPI server

## System Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    X-COPILOT ENGINE                       │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────┐  ┌──────────────┐ ┌─────────────┐      │
│  │  MEMORY     │  │  LEARNER     │ │  ADAPTER     │      │
│  │  ENGINE     │  │  ENGINE      │ │  (Skills)   │      │
│  │             │  │ Observe      │ │ • Load       │      │
│  │ • Session   │  │ → Signal     │ │ • Create     │      │
│  │ • Episodic  │  │ → Distill    │ │ • Update     │      │
│  │ • Semantic  │  │ → Store      │ │ • Prune      │      │
│  │ • Procedural│  │ → Apply      │ │ • Merge      │      │
│  │ • Project   │  │              │ │              │      │
│  └─────┬──────┘  └──────┬───────┘ └──────┬──────┘      │
│        │                │                 │              │
│        │                ▼                 │              │
│  ┌─────┴─────┐  ┌──────────────┐ ┌──────┴──────┐      │
│  │ EVALUATE  │  │  TASTE/PLAN  │ │  CONVERSA-  │      │
│  │ MODULE    │◀─│  PROFILE     │─│  TION       │      │
│  │           │  │              │ │  LOOP       │      │
│  │ Score     │  │ Learn from   │ │             │      │
│  │ Improve?  │  │ every edit   │ │ • process_  │      │
│  │ Adapt     │  │ every action │ │   prompt    │      │
│  │ Prune     │  │              │ │ • context   │      │
│  └─────┬─────┘  └──────────────┘ │   fitting   │      │
│        │                         └──────┬──────┘      │
│        │________________________________│               │
│           FEEDBACK LOOP                                     │
├──────────────────────────────────────────────────────────┤
│                     SERVER LAYER                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  FastAPI Server (server/main.py)                  │   │
│  │  • REST endpoints: /api/chat, /api/models, etc.  │   │
│  │  • WebSocket (/api/ws): real-time streaming      │   │
│  │  • Auth: Bearer token management                  │   │
│  │  • Session management                            │   │
│  └──────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────┤
│                   PROVIDER LAYER                          │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌────────────┐  │
│  │ OpenAI  │ │Anthropic│ │ NVIDIA   │ │  Ollama/   │  │
│  │         │ │         │ │(Nvidia   │ │  LMStudio/ │  │
│  │         │ │         │ │Provider) │ │ OpenRouter │  │
│  └─────────┘ └─────────┘ └──────────┘ └────────────┘  │
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

### 6. Conversation Loop (`src/xcopilot/core/conversation_loop.py`)

The `ConversationLoop` class is the lightweight agent loop used by both the local API and CLI entrypoints. It orchestrates prompt processing end-to-end:

- **`process_prompt(session_id, messages, model, ...)`** — Main entry point. Validates input, appends to session history, fits context to the model's window, and delegates to `registry.chat_with_fallback()` for model inference. Returns either a single `ChatResponse` or an `AsyncIterator[ChatResponse]` when streaming.
- **`_fit_context(messages, model, max_tokens)`** — Trims conversation history to fit the selected model's context window. Preserves system messages, truncates oldest user messages first.
- **`handle_tool_call(tool_name, args)`** — Handles tool call requests from the model.
- **`handle_clarification(question, choices)`** — Returns safe clarification responses.
- **`handle_approval(command)`** — Default approval logic (requires external confirmation).

The loop maintains per-session message history (`_sessions` dict) and integrates with the `ModelProvider` registry for automatic fallback across configured providers.

### 7. Runtime

- Tool execution (shell, read, write, search)
- Permission pipeline (5 modes)
- Checkpoint/rewind before every modification
- Context budget management
- Safety guardrails

## Server

The Python server (`server/main.py`) is a **FastAPI** application providing both REST and real-time WebSocket interfaces. It is launched via `xcopilot serve` or `python -m server`.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check |
| GET | `/ready` | Readiness status (model runtime, auth, sessions) |
| GET | `/api/status` | Server status and version |
| GET | `/api/config` | Server configuration and feature flags |
| GET | `/api/models` | List available chat models across providers |
| GET | `/api/providers` | List registered providers and their status |
| GET | `/api/settings` | User settings (auth required) |
| PUT | `/api/settings` | Update settings including provider API keys |
| POST | `/api/auth/login` | Authenticate and receive Bearer token |
| GET | `/api/sessions` | List sessions for authenticated user |
| POST | `/api/sessions` | Create a new session |
| GET | `/api/sessions/{id}` | Get session details |
| POST | `/api/chat` | Send a chat message (non-streaming) |
| POST | `/api/chat/stream` | Send a chat message (SSE streaming) |

### WebSocket (`/api/ws`)

The WebSocket endpoint provides real-time bidirectional communication:

1. Client connects and sends an auth packet: `{"token": "<bearer_token>"}`
2. Server responds with `{"type": "connected", "user": "<username>"}`
3. Client sends JSON-RPC-style messages:
   - `{"method": "prompt.submit", "params": {"session_id": "...", "messages": [...], "model": "..."}}` — Streams model response as `message.delta` events, finalized with `message.complete`
   - `{"method": "session.create", "params": {...}}` — Creates a new session
   - `{"method": "session.list", "params": {...}}` — Lists sessions for the user
4. Server sends streaming `ChatResponse` chunks over WebSocket via `conversation_loop.process_prompt(stream=True)`

### Key Server Components

- **`app`** — FastAPI instance with CORS middleware, lifespan context manager
- **`conversation_loop`** — Shared `ConversationLoop` instance for all requests
- **`register_all_providers(config)`** — Registers all configured model providers at startup
- **`ACTIVE_TOKENS`** / **`SESSIONS`** / **`USER_SETTINGS`** — In-memory stores for auth tokens, sessions, and user preferences
- **`_provider_config()`** — Builds provider configuration from `.xcopilot/config.json` and environment variables (supports `${VAR}` interpolation)

## Conversation Loop

The `ConversationLoop` (`src/xcopilot/core/conversation_loop.py`) is the central processing engine used by both the server and CLI:

```
User Messages → _fit_context() → registry.chat_with_fallback() → Model Provider
                                                         ↓
                                              ChatResponse / AsyncIterator
                                                         ↓
                                              Streaming chunks or single response
```

**Key behaviors:**
- Maintains isolated session histories keyed by `session_id`
- Auto-fits conversation to model context window when `context_mode="auto"`
- Supports both streaming and non-streaming inference
- Delegates to `registry.chat_with_fallback()` which tries providers in priority order
- Wraps all provider errors in `RuntimeError` with actionable messages

**Usage in server:**
- `POST /api/chat` calls `process_prompt()` with `stream=False`
- `POST /api/chat/stream` calls `process_prompt()` with `stream=True` and yields SSE chunks
- `WebSocket /api/ws` calls `process_prompt()` with `stream=True` and sends `message.delta` / `message.complete` events

## Model Providers

X-Copilot supports multiple model providers through a unified `ModelProviderBase` abstraction in `src/xcopilot/core/models.py`. All providers implement `chat()`, `embeddings()`, `list_models()`, and `health_check()`.

### Provider Registry

`ModelProvider` enum + `registry` singleton manages all registered providers. `chat_with_fallback()` tries providers in priority order. `register_all_providers(config)` reads from `.xcopilot/config.json` and environment variables.

### NVIDIA Provider

The NVIDIA provider (`src/xcopilot/core/model_providers/nvidia_provider.py`) implements OpenAI-compatible API access to NVIDIA's model endpoints:

- **Base URL**: `https://integrate.api.nvidia.com/v1` (configurable via `NVIDIA_BASE_URL`)
- **API Key**: From `NVIDIA_API_KEY` env var or config
- **Models**: Nemotron 3 Ultra, Nemotron 4 340B, Llama 3.1 (405B/70B/8B), Mistral Large, Mixtral 8x22B, Gemma 2 (27B/9B)
- **Capabilities**: Chat, Streaming, Function Calling, Reasoning
- **Context Window**: 128,000 tokens
- **Max Output**: 8,192 tokens
- **Features**:
  - Async chat completion with streaming support
  - Embeddings generation
  - Model listing with caching
  - Health check endpoint
  - OpenAI SDK client (`openai.AsyncOpenAI`) for compatibility

### Other Providers

| Provider | Module | Notes |
|----------|--------|-------|
| OpenAI | `openai_provider.py` | Standard OpenAI API |
| Anthropic | `anthropic_provider.py` | Claude models |
| Ollama | `ollama_provider.py` | Local models, auto-detected |
| LM Studio | `lmstudio_provider.py` | Local models, auto-detected |
| OpenRouter | `openrouter_provider.py` | Multi-model router |
| NVIDIA | `nvidia_provider.py` | NVIDIA API (OpenAI-compatible) |

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
| **Runtime** | Python 3.11+ | Cross-version compatible, rich ecosystem |
| **CLI** | Python Click | `xcopilot` command, subcommands, REPL |
| **Server** | FastAPI + uvicorn | REST + WebSocket API server |
| **Memory** | SQLite + JSONL | Lightweight, offline-first, cross-version |
| **Vector DB** | ChromaDB | Embedded, no server needed |
| **Skill Format** | SKILL.md | Standard, portable, human-readable |
| **Install** | pip + PowerShell | `pip install -e .` |
| **Models** | OpenAI-compatible API | Any provider works (NVIDIA, OpenAI, Anthropic, etc.) |
| **WebSocket** | FastAPI WebSocket | Real-time streaming chat |
| **Platform** | Windows 10 19041+ | Same minimum as CommandCode |

## Development Workflow

```bash
# Local Development
pip install -e .          # Editable install
xcopilot serve            # Start FastAPI server (uvicorn)
xcopilot start            # Start agent REPL
pytest tests/ -v          # Run Python tests

# Build
python -m build           # Build Python package

# Server directly
python -m server          # Run server on 0.0.0.0:8000

# Test
pytest tests/ -v          # Full test suite (includes test_server.py for FastAPI)
```

## Deployment

```bash
# Build locally
python -m build
pip install -e .

# Start server
xcopilot serve --host 0.0.0.0 --port 8000
# or
python -m server

# Verify
curl http://localhost:8000/health
curl http://localhost:8000/api/models
```

## Project Structure

```
X-Copilot/
├── server/                     # FastAPI server
│   ├── main.py               # App, routes, WebSocket endpoint
│   ├── __init__.py
│   └── __main__.py           # uvicorn entry point
├── src/xcopilot/               # Core Python package
│   ├── cli/                    # Click-based CLI
│   │   ├── main.py           # CLI groups, `start` REPL, `serve` command
│   │   ├── commands.py       # Subcommand implementations
│   │   └── serve.py          # `xcopilot serve` command (uvicorn)
│   ├── core/                   # Core engines
│   │   ├── conversation_loop.py  # Agent prompt processing loop
│   │   ├── models.py         # Model provider abstraction + registry
│   │   ├── model_providers/  # 6 providers: OpenAI, Anthropic, NVIDIA, Ollama, LMStudio, OpenRouter
│   │   │   └── nvidia_provider.py  # NVIDIA API provider
│   │   ├── mcp_gateway.py    # MCP client/gateway
│   │   ├── checkpoint.py     # Checkpoint manager
│   │   ├── compaction.py     # Token budget & context compaction
│   │   ├── evaluator.py      # Output scoring
│   │   ├── graph.py          # Knowledge graph
│   │   ├── learner.py        # Pattern distillation
│   │   ├── planner.py        # Taste profile & task planning
│   │   └── updater.py        # Auto-updater
│   ├── memory/                 # 5-layer memory system
│   │   ├── session.py        # In-memory session store
│   │   ├── episodic.py       # SQLite + JSONL event store
│   │   ├── semantic.py       # ChromaDB vector store
│   │   ├── procedural.py     # SKILL.md loader
│   │   └── project.py        # AGENTS.md parser
│   ├── skills/                 # Skill system
│   ├── tools/                  # Agent toolset
│   └── permission/
│       └── pipeline.py       # 5-tier permission pipeline
├── tests/                      # Test suite (pytest)
│   ├── test_server.py        # FastAPI server tests (REST + WebSocket)
│   ├── core/
│   ├── memory/
│   └── ...
├── webapp/                     # Next.js 15 web application
├── desktop/                    # Tauri desktop app
├── pyproject.toml
├── .xcopilot/                  # Runtime data
└── docs/
    └── architecture.md
```
