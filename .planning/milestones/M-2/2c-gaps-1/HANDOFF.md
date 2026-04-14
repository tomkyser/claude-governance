# Phase 2c-gaps-1 Handoff — Tungsten + Governance Critical Gaps

**Status:** COMPLETE
**Commits:** adc62cd (T1 crash fix), 6e6472c (T2-T11 all gaps)
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

## Key Decisions

- D4: FS9 feature verified real — no code changes needed, just documentation.
- D5: "signatures present" language distinguishes from "functional" probes.
- D7: Kill cleanup switches active session to next remaining (not just clear state).

## Files Modified

| File | Changes |
|------|---------|
| `src/installationBackup.ts` | Contamination check, vault fallback, auto-download |
| `src/patches/index.ts` | Vault recovery in apply, REPL probe, dual detection docs |
| `src/index.tsx` | Per-tool probe display, tiered reporting |
| `src/patches/governance.ts` | Panel passDetail honest labeling |
| `data/tools/tungsten.js` | Create guard, kill cleanup, name validation |

## Known Gaps

- Panel rendering untested in live session (G36 guide provided).
- Tungsten probe not automated (requires tmux + live session).
- No integration test suite for vault paths (tested manually this phase).

## What Comes Next

- User runs G36 testing guide in live CC session.
- Milestone 2 gap analysis (M-2 GAPS.md).
- Consider: automated vault integration tests, panel rendering verification.
