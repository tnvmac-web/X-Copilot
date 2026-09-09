# X-Copilot Skills System

## Overview

Skills are portable, reusable capabilities stored as `SKILL.md` files with YAML frontmatter. They can be created automatically from patterns, installed from the marketplace, or written manually.

## SKILL.md Format

```markdown
---
name: skill-name
description: What this skill does
triggers: [keyword1, keyword2, keyword3]
compatible_agents: [xcopilot, claude-code, codex, cursor, windsurf]
version: 1.0.0
author: optional
tags: [tag1, tag2]
---
# Skill Name

## Overview
Description of what this skill does and when to use it.

## Prerequisites
- Required tools
- Required permissions
- Environment setup

## Steps
1. First step
2. Second step
3. ...

## Examples
```bash
# Example usage
```

## Related Skills
- skill-name-1
- skill-name-2

## Configuration
Optional configuration options.
```

## Built-in Skills

### code-review
**Triggers**: `review`, `code-review`, `PR review`
**Description**: Review code for bugs, security, best practices

### debug
**Triggers**: `bug`, `error`, `fix`
**Description**: Debugging workflow for errors and issues

### deploy
**Triggers**: `deploy`, `ship`, `release`
**Description**: Build and deploy applications

### test
**Triggers**: `test`, `verify`
**Description**: Run tests and verify functionality

### learn
**Triggers**: `learn`, `study`
**Description**: Understand new codebase or technology

### refactor
**Triggers**: `refactor`, `clean`
**Description**: Code cleanup and improvement

## Creating Skills

### Auto-creation from Patterns

The learner engine automatically creates skills when a pattern is repeated 3+ times with high confidence:

```python
# In learner.py - store() method
if pattern.confidence > 0.8:
    self._create_skill_from_pattern(pattern)
```

### Manual Creation

```python
from xcopilot.memory import ProceduralMemory

mem = ProceduralMemory(project_root="/my/project")

skill_path = mem.create_skill(
    name="my-skill",
    description="Custom skill description",
    instructions="Step-by-step instructions...",
    triggers=["my-skill", "custom"],
    compatible_agents=["xcopilot"]
)
```

## Skills Marketplace

X-Copilot connects to the agent-skills ecosystem:

- **anthropics/skills** (~173K★) — Official Anthropic skills for Claude
- **addyosmani/agent-skills** (~87K★) — 24 production-grade engineering skills
- **vercel-labs/agent-skills** (~29K★) — Vercel's official collection
- **voltagent/awesome-agent-skills** (~31K★) — 1000+ curated skills

### CLI Commands

```bash
# Browse marketplace
xcopilot skills marketplace

# Install a skill
xcopilot skills install addyosmani/agent-skills --skill code-review

# List all marketplace skills
xcopilot skills find <query>

# Sync skills across machines
xcopilot skills export
xcopilot skills import
```

### Python API

```python
from xcopilot.skills import SkillsMarketplace

marketplace = SkillsMarketplace(cache_dir="~/.xcopilot/marketplace")

# Search
results = marketplace.search("code-review")

# Install to project
skill_path = marketplace.install("addyosmani/agent-skills", "code-review", "/my/project")

# List all
skills = marketplace.list_marketplace()
```

## Skill Discovery

Skills are loaded from two locations:
1. **Global**: `~/.xcopilot/skills/`
2. **Project**: `<project>/.xcopilot/skills/`

```python
from xcopilot.memory import ProceduralMemory

mem = ProceduralMemory(project_root="/my/project")
skills = mem.list_skills()  # Returns skills from both locations
```

## Skill Structure

```
.xcopilot/skills/
└── code-review/
    ├── SKILL.md
    ├── scripts/
    │   └── review.py
    └── templates/
        └── checklist.md
```

## Best Practices

1. **Keep skills focused** — One skill, one purpose
2. **Use clear triggers** — Keywords that naturally invoke the skill
3. **Include examples** — Show real usage
4. **Version skills** — Track changes with semantic versioning
5. **Test skills** — Verify they work in isolation
6. **Document prerequisites** — Tools, permissions, environment