# X-Copilot Enhanced Implementation Plan

## Project Structure

```text
x-copilot/
├── src/xcopilot/
│   ├── core/                    # Agent core
│   │   ├── models.py            # Model abstraction with api_mode
│   │   ├── conversation_loop.py # Agent conversation loop
│   │   └── model_providers/     # Provider implementations (6)
│   │       ├── openai_provider.py
│   │       ├── anthropic_provider.py
│   │       ├── ollama_provider.py
│   │       ├── lmstudio_provider.py
│   │       ├── nvidia_provider.py
│   │       └── openrouter_provider.py
│   ├── cli/
│   │   ├── main.py              # Click CLI entry point (@click.group)
│   │   ├── serve.py             # xcopilot serve command
│   │   └── commands.py          # Command implementations
│   ├── skills/                  # Skills system
│   │   ├── code-review/
│   │   ├── debug/
│   │   ├── deploy/
│   │   ├── learn/
│   │   ├── refactor/
│   │   └── test/
│   ├── memory/                  # Memory engines
│   ├── tools/                   # Tool implementations
│   └── config.py                # Model configuration
├── server/                      # FastAPI + uvicorn server
│   └── main.py                  # REST + WebSocket endpoint
├── desktop/                     # Tauri 2.0 + Vite + React
├── webapp/                      # Next.js 15 App Router
├── installers/                  # winget, brew, AUR, PS1
├── tests/                       # Pytest suite
├── pyproject.toml               # fail_under=60, dependencies
└── AGENTS.md                    # Project rules
```

## Overview
Transform X-Copilot from a CLI-only agent into a full-stack AI agent platform with:
- Multi-model provider support (OpenAI, Anthropic, Ollama, local models)
- MCP gateway integration
- Integration with 6 external repositories for enhanced capabilities
- Desktop App (Tauri + Vite), WebApp (Next.js), enhanced Terminal/REPL
- Complete setup/install commands

---

## Phase 1: Core Architecture Enhancements

### 1.1 Multi-Model Provider System
**Files to create/modify:**
- `src/xcopilot/core/models.py` - Model provider abstraction with `api_mode` resolution (chat_completions / codex_responses / anthropic_messages)
- `src/xcopilot/core/model_providers/` - Provider implementations
  - `openai_provider.py` - OpenAI API (chat_completions / codex_responses)
  - `anthropic_provider.py` - Anthropic API (anthropic_messages)
  - `ollama_provider.py` - Ollama local models
  - `lmstudio_provider.py` - LM Studio
  - `nvidia_provider.py` - NVIDIA
  - `openrouter_provider.py` - OpenRouter
  - `src/xcopilot/core/conversation_loop.py` - Agent conversation loop
  - `src/xcopilot/cli/commands.py` - Add model commands
  - `src/xcopilot/cli/serve.py` - CLI serve command
  - `server/main.py` - FastAPI server with REST + WebSocket
  - `src/xcopilot/config.py` - Model configuration

**Features:**
- `api_mode` abstraction: each provider resolves to `chat_completions`, `codex_responses`, or `anthropic_messages`
- Unified interface for all providers (chat, stream, embeddings)
- Auto-discovery of local models (Ollama, LM Studio)
- Model selection via CLI/config
- Cost tracking per provider
- Fallback chain (primary → secondary → local)
- Provider credential resolution via `auth.py` pattern

### 1.2 MCP Gateway Integration
**Files to create/modify:**
- `src/xcopilot/core/mcp_gateway.py` - MCP client/gateway
- `src/xcopilot/tools/mcp_tool.py` - MCP tool wrapper
- `src/xcopilot/cli/commands.py` - MCP commands
- `src/xcopilot/cli/main.py` - Add `hermes mcp` equivalent commands

**Features:**
- Stdio transport (local MCP servers)
- SSE / StreamableHTTP transport (remote MCP servers)
- Tool discovery from MCP servers (auto-registration with `mcp_{server}_{tool}` naming)
- Permission integration for MCP tools
- Auto-reconnection with exponential backoff
- Config-based server registration (`mcp_servers` key in config.yaml)
- Environment variable filtering for stdio server security
- Sampling support (server-initiated LLM requests)

---

## Phase 2: External Repository Integrations

### 2.1 AgentMemory (rohitg00/agentmemory)
**Purpose**: Persistent memory backend with benchmarks
**Integration**: Replace/extend ChromaDB semantic memory
**Files:**
- `src/xcopilot/memory/agentmemory_backend.py`
- Update `src/xcopilot/memory/semantic.py` to support pluggable backends

### 2.2 OpenViking (volcengine/OpenViking)
**Purpose**: Unified memory, knowledge RAG, and skills
**Integration**: New memory layer + skill unification
**Files:**
- `src/xcopilot/memory/openviking_backend.py`
- `src/xcopilot/skills/openviking_skill_manager.py`

### 2.3 Browser-Use (browser-use/browser-use)
**Purpose**: Browser automation for web tasks
**Integration**: New tool in toolset
**Files:**
- `src/xcopilot/tools/browser_tool.py`
- `src/xcopilot/tools/__init__.py` - Export BrowserTool

### 2.4 Scientific Agent Skills (k-dense-ai/scientific-agent-skills)
**Purpose**: 165 validated scientific skills + 100+ databases
**Integration**: Skills marketplace source
**Files**:
- `src/xcopilot/skills/scientific_skills.py`
- Update marketplace to include this repo

### 2.5 LangChain Skills (langchain-ai/langchain-skills)
**Purpose**: DeepAgents quickstart, LangGraph, LangChain skills
**Integration**: Skills marketplace + agent templates
**Files**:
- `src/xcopilot/skills/langchain_skills.py`
- `src/xcopilot/templates/deepagents_quickstart/` - Agent template

### 2.6 Skills Marketplace Update
**Purpose**: Sync marketplace with actual skill repos
**Integration**: Update `src/xcopilot/skills/marketplace.py` REPOS list
**Files**:
- `src/xcopilot/skills/marketplace.py` - Update REPOS to match actual repos

**Hermes Skills Hub Integration:**
- Support `hermes skills tap add REPO` pattern for adding GitHub repos as skill sources
- Skills installable via `hermes skills install ID` (Hub identifier or direct URL)
- Skills configurable per platform (`hermes skills config`)
- Agent-managed skills with progressive disclosure

---

## Phase 3: Application Interfaces

### 3.1 Desktop App (Tauri + Vite + React)
**Location**: `desktop/`
**Stack**: Tauri 2.0, React 18, TypeScript, Tailwind CSS
**Features**:
- System tray integration
- Native notifications
- File system access (with permission)
- Auto-updater
- Settings panel
- Chat interface with markdown rendering
- Memory/skill visualization

**Files**:
- `desktop/src/` - React frontend
- `desktop/src-tauri/` - Rust backend
- `desktop/tauri.conf.json` - Config

### 3.2 WebApp (Next.js 15 App Router)
**Location**: `webapp/`
**Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS, Prisma, socket.io
**Features:**
- Real-time chat with WebSocket (socket.io)
- Multi-session management
- Project/workspace switching
- Memory browser
- Skill marketplace UI
- Settings & billing
- Collaborative sessions

**Files:**
- `webapp/src/app/` - App Router pages
- `webapp/src/components/` - React components
- `webapp/src/lib/` - Core libs
- `webapp/prisma/schema.prisma` - Database schema (12 models)
- `webapp/src/hooks/useWebSocket.ts` - WebSocket connection hook

### 3.3 Enhanced Terminal/REPL
**Files to modify**:
- `src/xcopilot/cli/main.py` - Rich REPL with:
  - Syntax highlighting (Pygments)
  - Auto-completion (prompt_toolkit)
  - Command history
  - Multi-line editing
  - Inline images (iTerm2/kitty protocols)
  - Progress spinners
  - Themes

---

## Phase 4: Setup & Install Commands

### 4.1 CLI Setup Commands
**Files to modify/create:**
- `src/xcopilot/cli/main.py` - Main entry point with `@click.group()`
- `src/xcopilot/cli/commands.py` - Command implementations
- `src/xcopilot/cli/serve.py` - `xcopilot serve` command

**Commands (implemented):**
| Command | Status | Description |
|---------|--------|-------------|
| `xcopilot init` | ✅ | Initialize project |
| `xcopilot config` | ✅ | View/edit config |
| `xcopilot doctor` | ✅ | Diagnose issues |
| `xcopilot model` | ✅ | Manage model providers (list, chat, set-default, test) |
| `xcopilot mcp` | ✅ | Manage MCP servers (list) |
| `xcopilot skill` / `xcopilot skills` | ✅ | Skill management (search, list) |
| `xcopilot memory` | ✅ | Memory management |
| `xcopilot serve` | ✅ | Start FastAPI + WebSocket server |
| `xcopilot start` | ✅ | Start REPL agent |
| `xcopilot update` | ✅ | Check for updates |
| `xcopilot graph` | ✅ | Build knowledge graph |
| `xcopilot checkpoints` | ✅ | List checkpoints |
| `xcopilot run` | ✅ | Run WebApp/Desktop |

**Implemented:**
- `xcopilot setup` - Guided setup wizard (interactive CLI)
- `xcopilot skills install` - Install from Hub

### 4.2 Windows Installer Enhancements
**Files to modify**:
- `installers/install.ps1` - Add:
  - Model provider selection
  - MCP server auto-discovery
  - Desktop app install option
  - WebApp Docker compose option

### 4.3 Cross-Platform Installers
**Files to create**:
- `installers/install.sh` - Linux/macOS
- `installers/brew.rb` - Homebrew formula
- `installers/winget.yaml` - WinGet manifest
- `installers/aur/` - Arch AUR package

---

## Phase 5: Build & Run Locally

### 5.1 Development Environment
```bash
# Python
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\Activate.ps1
pip install -e ".[dev]"

# Node (WebApp)
cd webapp && npm install

# Desktop
cd desktop && npm install
cargo build  # via Tauri
```

### 5.2 Build Commands
```bash
# Python package
python -m build

# CLI
npm run build

# WebApp
cd webapp && npm run build

# Desktop
cd desktop && npm run tauri build
```

### 5.3 Run Locally
```bash
# Terminal REPL
xcopilot start                              # Start agent REPL
xcopilot start --test-mode                  # Test mode (no model API)

# API Server
xcopilot serve                              # Start FastAPI + WebSocket server (127.0.0.1:8000)
xcopilot serve --host 0.0.0.0 --port 8000   # All interfaces

# WebApp
cd webapp && npm run dev                    # Next.js dev server

# Desktop
cd desktop && npm run tauri dev             # Tauri + Vite dev mode

# Python package
python -m build                             # Build package
pip install -e ".[dev]"                     # Install with dev extras

# Tests
pytest tests/ --cov=src/xcopilot --cov-fail-under=60

# Docker
docker-compose up -d                        # All services

---

## Dependency Matrix

|| Component | Dependencies | Purpose |
||-----------|-------------|---------|
|| Model Providers | openai, anthropic, ollama-python, openai>=1.30 (for OpenRouter) | LLM access |
|| MCP Gateway | mcp, mcp[cli], anyio | MCP protocol (stdio + HTTP/SSE) |
|| AgentMemory | agentmemory (if pip installable) | Memory backend |
|| OpenViking | openviking (if pip installable) | Unified memory/skills |
|| Browser-Use | browser-use, playwright | Browser automation |
|| NVIDIA | nvidia | NVIDIA GPU inference |
|| Desktop | @tauri-apps/api, @tauri-apps/cli, rust | Native app (Tauri 2.0 + Vite) |
|| WebApp | next@15, react@19, prisma, socket.io | Web interface (Next.js 15 App Router) |
|| Server | fastapi>=0.110, uvicorn>=0.30 | REST + WebSocket API server |

---

## Testing Strategy

Based on [Hermes Agent contributor guide](https://hermes-agent.nousresearch.com/docs/developer-guide/contributing):

1. **Unit Tests** - Each provider, tool, memory backend
2. **Integration Tests** - Full agent loops with mock providers
3. **E2E Tests** - Desktop app (Playwright), WebApp (Cypress)
4. **Benchmark Tests** - Memory performance, model latency
5. **Security Tests** - Permission pipeline, input validation

**Test runner:**
```bash
pytest tests/ --cov=src/xcopilot --cov-fail-under=60
```

**Hermes test conventions:**
- Tests auto-redirect `HERMES_HOME` to temp dirs
- Use `scripts/run_tests.sh` with hermetic `env -i` (CI parity)
- Cross-platform test guards: `@pytest.mark.skipif(sys.platform == "win32", ...)` for POSIX-only syscalls
- Patch `sys.platform`, `platform.system()`, `platform.release()` together for Windows tests
- Use `pathlib.Path` / `os.path.join` — never manually concat with `/`
- Open files with explicit `encoding="utf-8"`
- Use `get_hermes_home()` for all paths (profile-safe)

---

## Rollout Order

1. ✅ Core model provider abstraction + OpenAI/Ollama + `api_mode` resolution
2. ✅ MCP gateway + stdio + HTTP/SSE transport
3. ✅ AgentMemory + OpenViking backends
4. ✅ Browser-Use tool
5. ✅ Skills marketplace integration (all repos)
6. ✅ Enhanced REPL
7. ✅ Setup/doctor/init commands
8. ✅ Conversation loop (`core/conversation_loop.py`) + CLI serve command
9. ✅ API server (`server/` via `cli/serve.py`) with FastAPI + WebSocket
10. ✅ NVIDIA provider + 6 providers total
11. ✅ WebApp (Next.js 15 + socket.io + Prisma 12 models)
12. ✅ Desktop App (Tauri 2.0 + Vite + React 18)
13. ✅ Installers & packaging (winget, brew, AUR, PS1)
14. ✅ Full local build & test



---

## References

Based on the [Hermes Agent Developer Guide](https://hermes-agent.nousresearch.com/docs/developer-guide/) and [Contributing Guide](https://hermes-agent.nousresearch.com/docs/developer-guide/contributing/).

Key design patterns adopted from Hermes:

- **`api_mode` provider abstraction** - Three API modes (`chat_completions`, `codex_responses`, `anthropic_messages`) resolved per provider
- **Native MCP client** - Stdio + HTTP/StreamableHTTP transports with `mcp_{server}_{tool}` naming convention
- **Skills Hub** - `skills tap`, `skills install`, `skills config` command patterns
- **Config-based MCP** - `mcp_servers` key in `config.yaml` with env var filtering
- **Provider credential resolution** - `auth.py` pattern with `PROVIDER_REGISTRY`
- **Cross-platform testing** - `env -i` hermetic tests, POSIX guard markers

### Hermes Developer Guide Topics

- [Contributing](https://hermes-agent.nousresearch.com/docs/developer-guide/contributing) - Dev setup, code style, PR process
- [Architecture](https://hermes-agent.nousresearch.com/docs/developer-guide/architecture) - Codebase ownership map, subsystems
- [Agent Loop](https://hermes-agent.nousresearch.com/docs/developer-guide/agent-loop) - AIAgent execution, API modes, tools
- [Adding Providers](https://hermes-agent.nousresearch.com/docs/developer-guide/adding-providers) - Provider implementation guide
- [Native MCP](https://hermes-agent.nousresearch.com/docs/developer-guide/native-mcp) - MCP client configuration
- [Adding Tools](https://hermes-agent.nousresearch.com/docs/developer-guide/adding-tools) - Tool schema and registration
- [CLI Internals](https://hermes-agent.nousresearch.com/docs/developer-guide/cli-internals) - CLI architecture
- [Creating Skills](https://hermes-agent.nousresearch.com/docs/developer-guide/creating-skills) - SKILL.md format

