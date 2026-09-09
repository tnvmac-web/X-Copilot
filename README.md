# X-Copilot — Self-Growing AI Agent for Windows

Self-growing AI agent for Windows — a Python 3.11 + Node.js CLI tool with 5-layer memory, auto skill creation, permission pipeline, and Windows-native installer.

## Quick Install

```powershell
irm https://xcopilot.ai/install.ps1 | iex
```

Or build from source:

```bash
pip install -e .
npm install
```

## Architecture

- **Memory Engine**: 5-layer memory (Session, Episodic, Semantic, Procedural, Project)
- **Learner Engine**: Observes signals → distills patterns → stores to memory
- **Adapter**: SKILL.md-based skills with auto-creation
- **Taste/Plan**: Learns user working style preferences
- **Evaluator**: Scores output against criteria
- **Permission Pipeline**: 5-tier DENY → ASK → ALLOW system
- **Runtime**: Tools (shell, file, search, web) with permission checks

## Development

```bash
# Run tests
pytest tests/ -v

# Start agent
python -m xcopilot.cli.main start

# Install
pip install -e .
```