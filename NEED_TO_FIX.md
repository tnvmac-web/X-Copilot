# X-Copilot — Needs Fix

Auto-generated from full codebase review (2026-09-12).

---

## Critical / Correctness Bugs

### 1. PlannerEngine — broken regex for type hint detection (`src/xcopilot/core/planner.py:55`)
Pattern `r":\s*\w+"` matches any `: word` (dict values, string literals), not just type hints. Causes false-positive "type hints added" detections.

### 2. PlannerEngine — money-as-cents detection too narrow (`src/xcopilot/core/planner.py:63`)
Only matches `variable_cents = int`. Misses `price_cents = int(price * 100)` and other common patterns.

### 3. SemanticMemory.search — `decayed` filter uses string instead of bool (`src/xcopilot/memory/semantic.py:91`)
Hardcodes `{"decayed": "False"}` (string). `decayed` is stored as Python `bool`. ChromaDB v1 xfilters on bools may not match the string, causing decayed facts to leak into search results.

### 4. SemanticMemory.decay — no pagination (`src/xcopilot/memory/semantic.py:159`)
`collection.get(where=...)` returns ALL facts then deletes by ID list. Will OOM on large collections.

### 5. CompactionManager — hardcoded tiktoken encoding (`src/xcopilot/core/compaction.py:27`)
`import tiktoken` at module level fails if tiktoken isn't installed. Encoding `cl100k_base` is wrong for non-OpenAI models. Should be optional/configurable.

---

## Architecture / Design Issues

### 6. ModelCapability enum unused (`src/xcopilot/core/models.py`)
Dead code — never referenced by any provider implementation.

### 7. ChatMessage tool fields untyped (`src/xcopilot/core/models.py`)
`tool_calls: list | None` lacks type params; `tool_call_id: str | None` declared but never used by providers.

### 8. ProviderRegistry.get_default — silent fallback (`src/xcopilot/core/models.py:174`)
Returns first registered provider when no default set. Wrong provider used without user knowledge. Should raise or log explicitly.

### 9. MCPGateway — hardcoded request IDs (`src/xcopilot/core/mcp_gateway.py:157`)
Uses `id: 1, 2, 3, 4, 5` for every request. Overlapping requests get mismatched responses. Needs incrementing IDs or pending-requests map.

### 10. MCPGateway — SSE transport incomplete (`src/xcopilot/core/mcp_gateway.py:127`)
Only POST `/mcp` for init, never establishes SSE event stream (`/sse`). Cannot receive server-to-client notifications.

### 11. CheckpointManager.rewind — stub, no restore (`src/xcopilot/core/checkpoint.py:88`)
Reads checkpoint JSON but never restores file content from backup. `after_hash` saved but no snapshot data persisted.

### 12. Updater — all stubs/mocks (`src/xcopilot/core/updater.py`)
`check()` returns hardcoded version, `download()` writes mock string, `verify()` always True, `install()` writes marker file. No real update capability.

### 13. Global singletons break test isolation
`unified_marketplace` (`unified_marketplace.py:937`) and `registry` (`models.py:217`) are module-level globals. No dependency injection possible.

---

## Async / Concurrency Problems

### 14. ShellTool.run — sync subprocess in async context (`src/xcopilot/tools/shell.py:62`)
Uses `subprocess.run()` directly. AGENTS.md mandates `asyncio.create_subprocess_exec`. Blocks event loop.

### 15. WebTool.fetch — sync urllib in async context (`src/xcopilot/tools/web.py:60`)
Uses `urllib.request.urlopen`. Should use `httpx.AsyncClient`.

### 16. FileTool — sync Path I/O (`src/xcopilot/tools/file.py`)
`read_text()` / `write_text()` are synchronous. Should be async or offer async variants.

### 17. SearchTool.web_search — sync DuckDuckGo scrape (`src/xcopilot/tools/search.py:82`)
Calls sync `self.web.fetch()` from async context. Regex HTML parsing is also fragile.

---

## Missing Error Handling / Edge Cases

### 18. CheckpointManager._gen_id — counter not persisted (`src/xcopilot/core/checkpoint.py:42`)
Counter resets on restart; duplicate IDs possible if timestamps collide.

### 19. PlannerEngine.save — no error handling (`src/xcopilot/core/planner.py:95`)
`write_text` can fail (permissions, disk full) with no fallback.

### 20. PlannerEngine.load — silent JSON decode failure (`src/xcopilot/core/planner.py:124`)
Catches `JSONDecodeError` and passes, hiding file corruption.

### 21. SemanticMemory.add — no deduplication (`src/xcopilot/memory/semantic.py:55`)
Same content added twice creates two entries with different UUIDs.

### 22. EpisodicMemory.append — no batching (`src/xcopilot/memory/episodic.py:79`)
Every event writes to both SQLite and JSONL immediately. High-frequency signals (tool calls) will degrade performance.

---

## Test Quality

### 23. Tests cover happy path only
No edge cases, no error paths, no concurrent access tests.

### 24. Updater tests test a mock that always returns True
`test_updater.py` — tests nothing meaningful.

### 25. No integration tests
Memory layers, learner+planner+evaluator together, full CLI REPL — none covered.

---

## Documentation / Polish

### 26. No logging — print() everywhere
`mcp_gateway.py:124,154`, `unified_marketplace.py:98,100,242,245,355,357,445`, and others. Should use `logging` module with levels.

### 27. No config validation
`UpdateConfig`, `MCPServerConfig` accept any value — invalid transport strings pass silently.

### 28. AGENTS.md compliance — verify `__future__.annotations`
Check all 50 files actually have it (most do, but verify `tools/search.py`, `tools/web.py`).

---

## Priority Order

| Priority | Items | Reason |
|----------|-------|--------|
| Fix now  | 1–5, 14–17 | Correctness bugs + blocking async violations |
| Fix soon | 6–13, 18–22 | Architecture debt + robustness |
| Track    | 23–28 | Test coverage, logging, docs |
