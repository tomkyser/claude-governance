# Milestone 3.5 Bootstrap — Wire Inter-Session Communication

---

**Status:** Phases 3.5a-c COMPLETE — Phase 3.5d ACT IN PROGRESS (P0 verified, P1 next, 24/24 SOVEREIGN)
**Baseline:** 24/24 SOVEREIGN on CC 2.1.101
**Previous milestone:** M-3 (System Prompt Control) — COMPLETE

## Read These Files (In This Order)

1. `.planning/milestones/M-3.5/3.5d-message-components/TASKS.md` — **P0 complete, T7-T10 next (P1 Thinking Restoration)**
2. `.planning/milestones/M-3.5/3.5d-message-components/PLANNING.md` — Approach per deliverable
3. `.planning/milestones/M-3.5/3.5d-message-components/CONTEXT.md` — Phase context + key binary offsets
4. `.planning/milestones/M-3.5/CONTEXT.md` — Milestone-level shared state

## What Was Built (P0 — Tool Visibility)

### PATCH 14: Tool Visibility (T1-T6 complete, verified)
- **T1**: Default `renderToolUseMessage` returns visible React element (cyan text)
- **T2**: `globalThis.__govReactRefs` captures React/Ink refs in tool loader scope
- **T3**: REPL-specific renderer — shows "REPL — {description}"
- **T4**: Tungsten-specific renderer — shows "Tungsten {action} [{session}]: {command}"
- **T5**: Binary patch removes `if(i==="")return null` empty-name suppression
- **T6**: Verified in live TUI — tools render visibly, no crash

### P0 Gap Analysis Results
- 9 built-in CC tools still have `renderToolUseMessage(){return null}` — by design (TaskCreate, TaskGet, TaskList, TestingPermission, etc.)
- `isTransparentWrapper` has 3 references — separate mechanism, P2 scope
- No regressions in patched binary

## What's Next — P1: Thinking Restoration (T7-T10)

### T7: Binary patch SystemTextMessage thinking dispatch
- Offset 8193543 is the thinking null-return
- SystemTextMessage dispatches: thinking → null, tool_result → ToolResultMessage, etc.
- Patch the thinking case to render instead of returning null

### T8: Identify ThinkingMessage minified function name
- Find the thinking block renderer in the binary
- Needed to wire T7's dispatch to the correct component

### T9: Binary patch streaming thinking auto-hide
- 30-second timeout causes thinking to auto-hide during streaming
- Remove or extend this timeout

### T10: Binary patch AssistantThinkingMessage for full thinking
- Skip the Ctrl+O collapsed/expanded toggle
- Show full thinking content by default

### T11: Phase steps 4-6 for P1
- Verify thinking blocks visible in live TUI
- Gap analysis
- Housekeeping + bootstrap for P2

### Build
- `cd claude-governance && pnpm build` → full project build
- `node claude-governance/dist/index.mjs -a` → apply patches
- `node claude-governance/dist/index.mjs check` → 24/24 SOVEREIGN
