# Milestone 3.5 Bootstrap — Wire Inter-Session Communication

---

**Status:** BLOCKED — Repack crash. P1 patches correct (27/27 SOVEREIGN) but binary crashes after repack.
**Baseline:** 24/24 SOVEREIGN working, 27/27 SOVEREIGN patched-but-broken
**Blocking Issue:** `rebuildBunData()` in nativeInstallation.ts reorders module strings, breaking Bun bytecode validation

## CRITICAL: Read This First

1. `.planning/journals/session-2026-04-16-d.md` — **Full root cause analysis and fix plan**
2. `.planning/milestones/M-3.5/3.5d-message-components/TASKS.md` — Task status
3. `claude-governance/src/nativeInstallation.ts` — File that needs fixing (rebuildBunData ~line 786)

## Current State

- **Binary**: Unpatched 2.1.101 (restored via manual cp from backup)
- **Shim**: ENABLED — will auto-reapply broken patches on next `claude` invocation!
  - To bypass: `mv ~/.claude-governance/bin/claude ~/.claude-governance/bin/claude.bak`
  - To restore: `mv ~/.claude-governance/bin/claude.bak ~/.claude-governance/bin/claude`
- **Code**: HEAD at commit 3d374e6 with thinking patches
- **Thinking patches**: Implementation correct, 27/27 SOVEREIGN verified against extracted JS
- **Repack**: Broken — produces binary that Bun rejects

## The Fix

### Root Cause
`rebuildBunData()` writes module strings in a fixed order: name, contents, sourcemap, bytecode.
The ORIGINAL binary has bytecode BEFORE contents (offset 120 vs 111,477,232).
This reordering breaks Bun's bytecode-to-source position validation.
At 24/24 (7.1KB added) Bun tolerates it. At 27/27 (7.5KB) it doesn't.

### Fix: Preserve Original String Ordering
Modify `rebuildBunData()` to sort strings by their ORIGINAL offsets before writing.
This preserves the bytecode→content layout that Bun expects.

See journal for full implementation plan (Option A).

### After Fix
1. Build: `cd claude-governance && pnpm build`
2. Restore binary: `/bin/cp ~/.claude-governance/native-binary.backup ~/.local/share/claude/versions/2.1.101`
3. Apply: `node claude-governance/dist/index.mjs -a`
4. Verify: `/Users/tom.kyser/.local/share/claude/versions/2.1.101 --version` should output `2.1.101 (Claude Code)`
5. Full check: `node claude-governance/dist/index.mjs check` → 27/27 SOVEREIGN

### Then Continue P1 Verify
- T11: Interactive TUI verification of thinking blocks
- Gap analysis for P1
- Housekeeping + bootstrap for P2

## Build
- `cd claude-governance && pnpm build` → full project build
- `node claude-governance/dist/index.mjs -a` → apply patches
- `node claude-governance/dist/index.mjs check` → SOVEREIGN check
