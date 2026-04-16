# Phase 3.5d Tasks — Message Components Control

Status: IN PROGRESS — Repack pipeline fixed (7e540a9). Pattern migration needed for 13 patches.

---

## P0: Tool Visibility ✅ COMPLETE

- [x] T1: Update tool-injection.ts renderToolUseMessage default to create visible React elements
- [x] T2: Capture React/Ink references in tool loader scope for element creation
- [x] T3: Implement REPL-specific renderToolUseMessage (show script description + operations)
- [x] T4: Implement Tungsten-specific renderToolUseMessage (show action + session)
- [x] T5: Binary patch to override empty-userFacingName suppression check
- [x] T6: Verify all external tools visible in live TUI session

## P1: Thinking Restoration — PATCHES WRITTEN, BLOCKED ON PATTERN MIGRATION

- [x] T7: Binary patch SystemTextMessage thinking dispatch
- [x] T8: Identify ThinkingMessage minified function name in binary
- [x] T9: Binary patch streaming thinking auto-hide (30s timeout)
- [x] T10: Binary patch AssistantThinkingMessage for full thinking by default
- [ ] T11: Verify thinking blocks visible in live TUI (BLOCKED — patterns don't match esbuild output)

## P1.5: Binary Patch Pattern Migration — NEXT (inserted 2026-04-16)

The repack pipeline now uses esbuild ESM→CJS transform instead of Bun's bytecode.
All 13 failing governance patch regexes were written against Bun's minified output
and must be re-derived against esbuild's CJS bundled code. Patterns must anticipate
future esbuild version changes and be resilient to variable name variations.

**Context:**
- The esbuild CJS output is at `~/.claude-governance/native-claudejs-patched.js`
  (17.1M chars, 334k lines)
- Original Bun bytecode stubs are at `~/.claude-governance/native-claudejs-orig.js`
- esbuild output uses different variable names, statement ordering, and code structure
- Patches should match structural features (function signatures, string literals, API calls)
  rather than generated variable identifiers

**Tasks:**
- [ ] T25: Research esbuild CJS output structure — map the 13 failing patches to new code locations
- [ ] T26: Migrate Tool Registry Injection pattern
- [ ] T27: Migrate REPL Tool Guidance, Tungsten Tool Guidance, Tungsten bashProvider (3 patches)
- [ ] T28: Migrate Channel Dialog Bypass pattern
- [ ] T29: Migrate Tool Visibility + Client Data Cache Preservation patterns
- [ ] T30: Migrate Thinking patches (Dispatch, FullShow, AssistantGuard — 3 patches)
- [ ] T31: Migrate Tungsten Live Panel + Explore + Glob/Grep patterns (3 patches)
- [ ] T32: Full SOVEREIGN check — target 27/29+
- [ ] T11: Verify thinking blocks visible in live TUI (unblocked by T30)

## P2: Override System (Extended, after P1.5)

- [ ] T12: Design and implement globalThis.__govMessageOverrides registry
- [ ] T13: Binary patch override check injection points in SystemTextMessage
- [ ] T14: Binary patch override check injection in AssistantToolUseMessage
- [ ] T15: Implement null-rendered attachment visibility toggle
- [ ] T16: Add override system to verification registry
