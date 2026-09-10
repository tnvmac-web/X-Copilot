# X-Copilot Enhanced Implementation Plan

## Overview
Transform X-Copilot from a CLI-only agent into a full-stack AI agent platform with:
- Multi-model provider support (OpenAI, Anthropic, Ollama, local models)
- MCP gateway integration
- Integration with 6 external repositories for enhanced capabilities
- Desktop App (Tauri), WebApp (Next.js), enhanced Terminal/REPL
- Complete setup/install commands

---

## Phase 1: Core Architecture Enhancements

### 1.1 Multi-Model Provider System
**Files to create/modify:**
- `src/xcopilot/core/models.py` - New model provider abstraction
- `src/xcopilot/core/model_providers/` - Provider implementations
  - `openai_provider.py` - OpenAI API
  - `anthropic_provider.py` - Anthropic API
  - `ollama_provider.py` - Ollama local models
  - `lmstudio_provider.py` - LM Studio
  - `foundry_provider.py` - Foundry Local
  - `openrouter_provider.py` - OpenRouter
- `src/xcopilot/cli/commands.py` - Add model commands
- `src/xcopilot/config.py` - Model configuration

**Features:**
- Unified interface for all providers (chat, stream, embeddings)
- Auto-discovery of local models (Ollama, LM Studio)
- Model selection via CLI/config
- Cost tracking per provider
- Fallback chain (primary → secondary → local)

### 1.2 MCP Gateway Integration
**Files to create/modify:**
- `src/xcopilot/core/mcp_gateway.py` - MCP client/gateway
- `src/xcopilot/tools/mcp_tool.py` - MCP tool wrapper
- `src/xcopilot/cli/commands.py` - MCP commands

**Features:**
- stdio transport (local MCP servers)
- SSE transport (remote MCP servers)
- Tool discovery from MCP servers
- Permission integration for MCP tools
- Auto-reconnection with exponential backoff

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

### 2.4 Anthropic Cybersecurity Skills (mukul975/anthropic-cybersecurity-skills)
**Purpose**: 818 structured cybersecurity skills
**Integration**: Skills marketplace source
**Files:**
- `src/xcopilot/skills/cybersecurity_skills.py`
- Update marketplace to include this repo

### 2.5 Diagram Design (cathrynlavery/diagram-design)
**Purpose**: 38 editorial diagram types (HTML+SVG)
**Integration**: Visualization skill + web UI component
**Files:**
- `src/xcopilot/skills/diagram_design.py`
- WebApp: React components for diagram rendering

### 2.6 Scientific Agent Skills (k-dense-ai/scientific-agent-skills)
**Purpose**: 165 validated scientific skills + 100+ databases
**Integration**: Skills marketplace source
**Files:**
- `src/xcopilot/skills/scientific_skills.py`
- Update marketplace to include this repo

### 2.7 LangChain Skills (langchain-ai/langchain-skills)
**Purpose**: DeepAgents quickstart, LangGraph, LangChain skills
**Integration**: Skills marketplace + agent templates
**Files:**
- `src/xcopilot/skills/langchain_skills.py`
- `src/xcopilot/templates/deepagents_quickstart/` - Agent template

---

## Phase 3: Application Interfaces

### 3.1 Desktop App (Tauri + React)
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
**Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS, Prisma
**Features**:
- Real-time chat with WebSocket
- Multi-session management
- Project/workspace switching
- Memory browser
- Skill marketplace UI
- Settings & billing
- Collaborative sessions

**Files**:
- `webapp/src/app/` - App Router pages
- `webapp/src/components/` - React components
- `webapp/src/lib/` - Core libs
- `webapp/prisma/schema.prisma` - Database schema

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
**Files to modify/create**:
- `src/xcopilot/cli/commands.py` - Add:
  - `xcopilot init` - Initialize project
  - `xcopilot config` - View/edit config
  - `xcopilot doctor` - Diagnose issues
  - `xcopilot setup` - Guided setup wizard
  - `xcopilot model` - Manage model providers
  - `xcopilot mcp` - Manage MCP servers
  - `xcopilot skill` - Skill management
  - `xcopilot memory` - Memory management

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
xcopilot start --test-mode

# WebApp
cd webapp && npm run dev

# Desktop
cd desktop && npm run tauri dev

# Docker (all services)
docker-compose up -d
```

---

## Dependency Matrix

| Component | Dependencies | Purpose |
|-----------|-------------|---------|
| Model Providers | openai, anthropic, ollama-python, openai>=1.30 (for OpenRouter) | LLM access |
| MCP Gateway | mcp, mcp[cli], anyio | MCP protocol |
| AgentMemory | agentmemory (if pip installable) | Memory backend |
| OpenViking | openviking (if pip installable) | Unified memory/skills |
| Browser-Use | browser-use, playwright | Browser automation |
| Desktop | @tauri-apps/api, @tauri-apps/cli, rust | Native app |
| WebApp | next@15, react@19, prisma, next-auth, socket.io | Web interface |

---

## Testing Strategy

1. **Unit Tests** - Each provider, tool, memory backend
2. **Integration Tests** - Full agent loops with mock providers
3. **E2E Tests** - Desktop app (Playwright), WebApp (Cypress)
4. **Benchmark Tests** - Memory performance, model latency
5. **Security Tests** - Permission pipeline, input validation

---

## Rollout Order

1. ✅ Core model provider abstraction + OpenAI/Ollama
2. ✅ MCP gateway + stdio transport
3. ✅ AgentMemory + OpenViking backends
4. ✅ Browser-Use tool
4. ✅ Skills marketplace integration (all 4 repos)
5. ✅ Enhanced REPL
6. ✅ Setup/doctor/init commands
7. ⏳ WebApp (Next.js)
8. ⏳ Desktop App (Tauri)
9. ⏳ Installers & packaging
10. ⏳ Full local build & test