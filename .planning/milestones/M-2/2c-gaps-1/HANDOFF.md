# Phase 2c-gaps-1 Handoff — Tungsten + Governance Critical Gaps

**Status:** COMPLETE
**Commits:** adc62cd (T1 crash fix), 6e6472c (T2-T11 all gaps), 58cf589 (T12 panel setAppState fix)
**SOVEREIGN:** 19/19 on CC 2.1.101

## What Was Delivered

### Critical Infrastructure (G30, G35)
- **Restore flow** (`installationBackup.ts`): Three-tier contamination-safe restore. Checks backup for governance patches, falls back to virgin vault, auto-downloads if vault empty.
- **Apply flow** (`patches/index.ts`): Vault recovery when backup contaminated. Deletes stale backup, recovers from vault, creates clean backup before patching.
- Both paths verified: clean restore ✓, contaminated → vault fallback ✓.

### Crash Fix (G29)
- Panel injection IIFE was creating new component function per render → React error #185.
- Fixed: `globalThis.__tungstenPanel` caching + atomic selectors + stable `doCapture` callback.

### Verification Honesty (G31, G32)
- Check command now says "signatures present" (not "checks passed").
- Tiered reporting note: "Signature checks verify presence. Functional probes verify behavior."
- Panel entry: "present (requires live session to verify rendering)".
- Probe displays per-tool results: "Probe: Ping functional", "Probe: REPL functional".
- Tungsten listed as "Untested (requires live session)".

### FS9 Investigation (G33)
- bashProvider calls `getClaudeTmuxEnv()` (FS9) unconditionally. Ant-only gate only protects `ensureSocketInitialized()`.
- Our patch activates TMUX assignment for all Bash child processes. Feature is real and working.

### Dual Detection Documentation (G34)
- Contract documented in `applyPatchImplementations`: signature presence ≡ patch complete.
- Layer 1 (orchestrator) short-circuits; layer 2 (impl.fn) handles fresh application.

### tungsten.js Robustness (G37-G39)
- G37: `handleCreate` checks session existence before creating (no duplicate error).
- G38: `handleKill` clears AppState when killing tracked session, switches to next remaining.
- G39: `validateSessionName()` rejects empty, dot, colon, leading/trailing whitespace.

### Live Testing Guide (G36)
- 7-step guide in RESEARCH.md for verifying session isolation, FS9 chain, and panel rendering.
- Requires user to run in live CC session (not automatable).

### Panel setAppState Fix (G40 — T12)
- **Root cause:** `setAppState` expects `(prev: AppState) => AppState` function form, but tungsten.js passed bare objects. Try/catch silently swallowed the TypeError, so panel state never wrote. Selectors always returned null → panel never rendered.
- **Fix:** All 4 `setAppState` calls converted to `function(prev) { return Object.assign({}, prev, {...}) }`.
- **Verified:** Panel renders in live TUI session — cyan-bordered box with session name, last command, and terminal content.

### Live Testing Results (G36 — User Verified)
All G36 checks passed in live CC TUI session:
- Session isolation: governance socket (`claude-{PID}`) separate from user tmux
- FS9 chain: `echo $TMUX` returns governance socket via Tungsten, Bash, REPL bash(), Agent→Bash, Agent→REPL→bash()
- Kill + recreate: clean lifecycle, new server PID on recreate
- Name validation: `.bad` and `bad:name` rejected, empty defaults to `main`
- Duplicate create guard: no-op with clean message
- Panel rendering: visible after create with session name + command + terminal content

## Key Decisions

- D4: FS9 feature verified real — no code changes needed, just documentation.
- D5: "signatures present" language distinguishes from "functional" probes.
- D7: Kill cleanup switches active session to next remaining (not just clear state).
- D8: setAppState requires function form — CC Tool.ts interface takes `(prev) => newState`, not bare objects.

## Files Modified

| File | Changes |
|------|---------|
| `src/installationBackup.ts` | Contamination check, vault fallback, auto-download |
| `src/patches/index.ts` | Vault recovery in apply, REPL probe, dual detection docs |
| `src/index.tsx` | Per-tool probe display, tiered reporting |
| `src/patches/governance.ts` | Panel passDetail honest labeling |
| `data/tools/tungsten.js` | Create guard, kill cleanup, name validation |

## Known Gaps

- REPL `agent()` → subagent Bash: "O is not a function" runtime error (REPL gap, not Tungsten — logged to REPL-IMPROVEMENTS.md).
- Tungsten automated probe still requires live session (Ping + REPL probes are automated).
- No integration test suite for vault paths (tested manually this phase).

## What Comes Next

- Phase 2c-gaps-2: Tungsten adoption — prompt integration, hook enforcement, statusline clarity.
- Milestone 2 gap analysis (M-2 GAPS.md).
- M-2 retrospective.
