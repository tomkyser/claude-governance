# Phase 2b Tracker — Clean-Room REPL

**Status:** COMPLETE
**Started:** 2026-04-13
**Completed:** 2026-04-13

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | Auto-Discovery Loader + Tool Deployment | COMPLETE |
| 2 | REPL Core — VM Engine + Tool Handlers | COMPLETE |
| 3 | Configuration — Modes + Loader Filtering | COMPLETE |
| 4 | Prompt — Tool Prompt + Replace Override | COMPLETE |
| 5 | Verification + Testing + Housekeeping | COMPLETE |

## Decisions

- **Option B (tool delegation) confirmed:** All 9 inner handlers delegate to CC's native tools via `context.options.tools`. No reimplementation of file I/O.
- **Auto-discovery loader:** Generic `index.js` scans tools dir for `.js` files. Future tools (Tungsten, etc.) just drop a file in.
- **Replace mode prompt override not possible via pieces pipeline:** "Using your tools" section is runtime-generated, not in prompt data files. Model naturally follows REPL prompt when primitives are filtered.
- **Grep/Glob route through Bash:** Not in tool registry when embedded tools active (F7). REPL constructs shell commands that auto-dispatch to embedded ugrep/bfs.

## Test Results

| Test | Result |
|------|--------|
| Basic execution (return 1+1) | PASS |
| File read (delegation to Read.call) | PASS |
| Multi-op batch (read + bash) | PASS |
| Write + read round-trip | PASS |
| Edit + read verification | PASS |
| Grep through Bash | PASS |
| Console capture (stdout + stderr) | PASS |
| Error handling (thrown errors) | PASS |
| Timeout safety (120s, clean kill) | PASS |
| Coexist mode (REPL + primitives visible) | PASS |
| Replace mode (primitives filtered) | PASS |
| Tool deployment checks in `check` | PASS |

## Files Changed

| File | Change |
|------|--------|
| `data/tools/index.js` | NEW: auto-discovery loader |
| `data/tools/ping.js` | NEW: Ping extracted from inline |
| `data/tools/repl.js` | NEW: REPL implementation (18KB) |
| `src/patches/index.ts` | ADD: `deployTools()`, wired into apply flow |
| `src/patches/governance.ts` | ADD: `TOOL_REPLACE_FILTER_CODE`, wired into `writeToolInjection` |
| `src/index.tsx` | ADD: Tool Deployment section in `handleCheck` |
| `package.json` | ADD: `data/tools/*.js` to files array |
