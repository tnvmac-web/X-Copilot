# X-Copilot — Project Architecture

> A self-growing AI agent for Windows and Linux with 5-layer memory, multi-model provider support, MCP gateway integration, automatic skill creation, and a 5-tier permission pipeline.

## Versions & Metadata
- **Version:** 0.1.1
- **Python:** >=3.11 (3.11, 3.12)
- **Node.js:** >=18 (web & desktop apps)
- **License:** MIT

## Repository Layout

```
X-Copilot-main/
├── src/xcopilot/               # Core Python package
│   ├── cli/                    # Click-based CLI + REPL
│   │   ├── main.py             # CLI groups, `start` REPL command
│   │   ├── commands.py         # Subcommand implementations (model, memory, skills, etc.)
│   │   ├── install.py          # PowerShell installer generator
│   │   └── __init__.py
│   ├── core/                   # Core engines
│   │   ├── models.py           # Model provider abstraction (ProviderRegistry, dataclasses)
│   │   ├── model_providers/    # 5 providers: OpenAI, Anthropic, Ollama, LMStudio, OpenRouter
│   │   ├── mcp_gateway.py      # MCP (Model Context Protocol) client/gateway
│   │   ├── checkpoint.py       # Checkpoint manager (snapshot/rewind/fork)
│   │   ├── compaction.py       # Token budget & context compaction (tiktoken)
│   │   ├── evaluator.py        # Output scoring (correctness/style/safety)
│   │   ├── graph.py            # Knowledge graph (NetworkX + watchdog)
│   │   ├── learner.py          # Pattern distillation from signals
│   │   ├── planner.py          # Taste profile & task planning
│   │   └── updater.py          # Auto-updater (check/download/install/rollback)
│   ├── memory/                 # 5-layer memory system
│   │   ├── __init__.py         # MemoryEngine (facade composing all layers)
│   │   ├── session.py          # In-memory session store (per conversation)
│   │   ├── episodic.py         # SQLite + JSONL event store
│   │   ├── semantic.py         # ChromaDB vector store for facts
│   │   ├── procedural.py       # SKILL.md loader & parser
│   │   └── project.py          # AGENTS.md parser & watcher
│   ├── skills/                 # Skill system
│   │   ├── __init__.py
│   │   ├── marketplace.py      # GitHub skills marketplace (4 repos)
│   │   ├── unified_marketplace.py  # Unified marketplace (6 sources)
│   │   ├── learn/              # Auto-skill creation from patterns
│   │   ├── debug/, deploy/, refactor/, test/  # Built-in skill categories
│   │   └── SKILL.md            # Skill definition per category
│   ├── tools/                  # Agent toolset
│   │   ├── __init__.py         # Exports FileTool, SearchTool, ShellTool, WebTool
│   │   ├── file.py             # File read/write/edit (permission-checked)
│   │   ├── shell.py            # Shell command execution (permission-checked)
│   │   ├── search.py           # File grep/glob + web search
│   │   └── web.py              # Web fetching & scraping
│   └── permission/
│       └── pipeline.py         # 5-tier permission pipeline (DENY→ASK→ALLOW)
├── webapp/                     # Next.js 15 web application
│   ├── src/app/                # App Router
│   │   ├── api/chat/           # Chat API endpoint
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── src/components/         # React components (chat, layout, ui)
│   ├── src/hooks/
│   ├── src/lib/                # Core libs (prisma client, utils)
│   ├── src/types/
│   ├── prisma/                 # Prisma schema (11 models)
│   │   └── schema.prisma
│   └── package.json
├── desktop/                    # Tauri desktop app
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── lib/
│   ├── src-tauri/              # Rust backend
│   │   ├── icons/
│   │   ├── tauri.conf.json
│   │   └── Cargo.toml
│   └── package.json
├── tests/                      # Test suite (pytest, ≥65% coverage gate)
│   ├── core/                   # 7 test files: checkpoint, compaction, evaluator, graph, learner, planner, updater
│   ├── memory/
│   ├── permission/
│   ├── skills/
│   └── tools/
├── installers/                 # Installers
│   ├── install.ps1             # Windows PowerShell
│   ├── install.sh              # Linux/macOS
│   └── winget.yaml             # WinGet manifest
├── .xcopilot/                  # Runtime data (git-ignored)
│   ├── config.json             # User config & model providers
│   ├── AGENTS.md               # Global agent rules (project-level overrides also)
│   ├── memory/                 # Memory store (chroma/, episodic.db, episodic.jsonl)
│   ├── skills/                 # User-installed skills
│   └── updater/                # Update downloads & backups
├── .github/workflows/ci-cd.yml  # CI/CD pipeline
├── Dockerfile
├── pyproject.toml
├── package.json (Node.js wrapper)
├── IMPLEMENTATION_PLAN.md      # 5-phase roadmap
├── AGENTS.md                   # Agent rules & architecture guidelines
└── README.md
```

## Architecture Overview

### 5-Layer Memory System
| Layer | Storage | Purpose |
|---|---|---|
| **Session** | In-memory dict | Current conversation context |
| **Episodic** | SQLite + JSONL | Event history, corrections, mistakes |
| **Semantic** | ChromaDB vector store | Vector-searchable facts & notes |
| **Procedural** | SKILL.md files | Step-by-step skill instructions |
| **Project** | AGENTS.md | Architecture rules, parsed by watchdog |

All layers are composed by `MemoryEngine` (in `memory/__init__.py`), which initializes each layer pointing at `.xcopilot/` in the project root.

### Core Engine Pipeline
```
User Input → PermissionPipeline → Tool Execution → Memory Update
    → LearnerEngine (observe signals) → Pattern Distillation → Skill Creation
```

**LearnerEngine** (`core/learner.py`):
- Observes signals: TOOL_CALL, TOOL_RESULT, USER_EDIT, USER_ACCEPT/REJECT, ERROR, CORRECTION
- Distills patterns: PREFERENCE, MISTAKE, PATTERN, WORKFLOW
- Stores patterns to memory layers with confidence scoring

**PlannerEngine** (`core/planner.py`):
- Manages `TasteProfile` (preferred tools, code style, conventions, anti-patterns)
- Learns from code edits (type hints, money-as-cents, indentation)
- Reads config from `.xcopilot/config.json`

**Evaluator** (`core/evaluator.py`):
- Scores output against criteria: correctness (0.4), style (0.2), safety (0.4)
- Threshold default: 0.7
- Maintains history per criterion

### Model Providers
- **Abstraction:** `ModelProviderBase` (ABC) in `core/models.py` with abstract methods: `chat()`, `embeddings()`, `list_models()`, `health_check()`
- **5 Providers:** OpenAI, Anthropic, Ollama, LMStudio, OpenRouter
- **ProviderRegistry:** Global registry with fallback chain support (`chat_with_fallback`)
- **Config:** `.xcopilot/config.json` → model providers with API keys/base URLs
- **Auto-discovery:** Ollama (localhost:11434) and LM Studio (localhost:1234) auto-detected

### MCP Gateway
- Supports stdio and SSE transports
- Manages MCP server processes (`subprocess.Popen`)
- Tool discovery with caching (`_tools_cache`)
- Permission integration for MCP tools
- Auto-reconnection with exponential backoff

### Permission Pipeline (5-tier)
| Mode | Behavior |
|---|---|
| `standard` | Prompt before edits/commands (default) |
| `auto-ask` | Always prompts |
| `plan` | Read-only, no side effects |
| `bypass` | Skip all prompts |
| `dont-ask` | Auto-allow (denies in bypass) |

**DENY** always wins — destructive patterns (rm -rf /, format, shutdown, mkfs, dd to /dev) and production paths (/etc/, /usr/, C:\Windows\*, etc.) are hard-blocked.

### Skills System
- **Built-in skill categories:** code-review, debug, deploy, learn, refactor, test
- **Marketplace:** 6 external sources integrated via `UnifiedMarketplace`
  1. GitHub repos (addyosmani, anthropics, vercel-labs, voltagent)
  2. AgentMemory (rohitg00/agentmemory) — persistent memory backend
  3. OpenViking (volcengine/OpenViking) — unified memory, RAG, skills
  4. Browser-Use (browser-use/browser-use) — browser automation tool
  5. Anthropic Cybersecurity Skills (mukul975/anthropic-cybersecurity-skills) — 818 structured skills
  6. Scientific Agent Skills (k-dense-ai/scientific-agent-skills) — 165 validated skills
- **Auto-skill creation:** Learner distills patterns → generates SKILL.md files

### CLI Commands
```
xcopilot start [--test-mode]          # Launch agent REPL
xcopilot init                         # Initialize project (.xcopilot/config.json, AGENTS.md)
xcopilot config                       # View/edit config
xcopilot doctor                       # Diagnose environment issues
xcopilot setup                        # Guided setup wizard
xcopilot model list [--provider X]    # List available models
xcopilot mcp                          # Manage MCP server connections
xcopilot skill                        # Install/manage skills
xcopilot skills                       # List installed skills
xcopilot skills-marketplace           # Browse marketplace skills
xcopilot memory                       # Show memory status
xcopilot graph                        # Build project knowledge graph
xcopilot checkpoints                  # List checkpoints
xcopilot tree                         # Show checkpoint tree
xcopilot rewind <CHECKPOINT_ID>       # Restore a checkpoint
xcopilot fork <ID> <BRANCH>           # Create checkpoint branch
xcopilot compact [--mode fast]        # Compact conversation history
xcopilot context                      # Show token budget usage
xcopilot permissions                  # Show permission modes
xcopilot update                       # Check for updates
```

### Checkpoint System
- Auto-snapshots before every file modification
- SHA-256 content hashing for before/after states
- Session-scoped checkpoint tree with parent/branch relationships
- `rewind` restores a checkpoint; `fork` creates a new branch

### Context Compaction
- Token counting via `tiktoken` (cl100k_base encoding)
- Budget tracking: total, used, memory, skills, conversation
- Auto-compaction at 80% threshold
- Modes: `default` (summarize), `fast` (head/tail), `smart` (semantic)

### Knowledge Graph
- NetworkX `DiGraph` indexing Python project structure
- AST-based parsing of files (classes, functions, imports)
- Watchdog file system watcher for real-time updates
- Used for code navigation and structural queries

## Testing Strategy
- **Unit tests:** `tests/core/` (7 test files covering checkpoint, compaction, evaluator, graph, learner, planner, updater)
- **Coverage gate:** ≥65% (`pytest --cov=src/xcopilot --cov-fail-under=65`)
- **CI checks:** `ruff check`, `mypy src/`, `ruff format --check`
- Planned: integration tests (mock providers), E2E tests (Playwright for desktop, Cypress for webapp)

## CI/CD (.github/workflows/ci-cd.yml)
- **Push to `main` / PRs:** tests, coverage, lint, type checks, formatting, package build
- **Push to `develop`:** publishes to TestPyPI
- **GitHub Release:** publishes to PyPI + Docker image
- **Weekly:** dependency update checks
- **workflow_dispatch:** manual `publish_test`, `publish_prod`, `publish_docker`

## Build & Run

### Python Package
```bash
python -m venv .venv
# source .venv/bin/activate  (Linux/macOS)
# .venv\Scripts\Activate.ps1 (Windows)
pip install -e ".[dev]"
xcopilot --help
xcopilot start --test-mode
```

### Node.js CLI Wrapper
```bash
npm install
npm run dev       # ts-node cli/bin/xcopilot.ts
npm run build     # tsc
```

### WebApp (Next.js)
```bash
cd webapp
npm install
npm run dev       # localhost:3000
npm run build
```

### Desktop (Tauri)
```bash
cd desktop
npm install
npm run tauri dev
npm run tauri build  # requires Rust toolchain
```

### Docker
```bash
docker build -t x-copilot:local .
docker run --rm -it -v "$(pwd):/workspace" -w /workspace x-copilot:local --project /workspace start --test-mode
```

## Dependencies (Python)
- **Core:** click, pydantic, rich, httpx, networkx, watchdog, tiktoken, pyyaml
- **Models:** openai, anthropic (provider SDKs)
- **Memory:** chromadb (semantic), sqlite3 (episodic)
- **MCP:** mcp, mcp[cli]
- **Dev:** pytest, pytest-asyncio, ruff, mypy, pytest-cov

## Data Persistence
- `.xcopilot/config.json` — user config, model providers, taste profile
- `.xcopilot/memory/episodic.db` — SQLite episodic event store
- `.xcopilot/memory/episodic.jsonl` — JSONL backup of episodic events
- `.xcopilot/memory/chroma/` — ChromaDB vector store
- `.xcopilot/skills/` — user-installed SKILL.md files
- `.xcopilot/updater/` — update downloads & rollback backups
- `webapp/prisma/dev.db` — SQLite for webapp (Prisma)
