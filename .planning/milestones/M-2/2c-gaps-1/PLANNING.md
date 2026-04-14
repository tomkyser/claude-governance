# Phase 2c-gaps-1 Planning — Tungsten + Governance Critical Gaps

## Phase Scope

Close 7 critical failures documented in the ROADMAP post-mortem, plus 3 code robustness gaps discovered during research. The crash (G29) is already fixed.

## Milestone Scope Connection

M-2 delivers ant-only tools via clean-room reimplementation. These gaps threaten the integrity of the entire patching system — contaminated restores, false SOVEREIGN claims, and unverified features undermine user trust. Per VISION.md: "Full visibility. No silent degradation."

## Project Scope Connection

G30 (broken restore) directly violates Non-Negotiable #1: "Reversible. Every change can be undone with claude-governance --restore." G31/G32 (false verification) violate #4: "Full visibility." These aren't Tungsten-specific — they're governance infrastructure failures exposed by Tungsten.

## Task Breakdown

### T1: Panel Crash Fix (DONE) — G29
- `globalThis.__tungstenPanel` caching in IIFE
- Atomic selectors + stable doCapture callback
- **Committed:** adc62cd

### T2: Restore Flow — Virgin Vault Fallback — G30
- In `restoreNativeBinaryFromBackup()`: extract JS from backup, check `isContentPatched()`
- If contaminated: log warning, fall back to virgin vault via `deployToInstallPath(version, installPath)`
- If no virgin binary in vault: attempt `downloadVirginBinary(version)` then deploy
- If all fails: error with clear message ("No clean binary available — download failed")
- **Files:** src/installationBackup.ts, possibly src/index.tsx

### T3: Apply Flow — Virgin Vault Recovery — G35
- In `applyCustomization()` contamination branch (L607-634): after deleting contaminated backup, use virgin vault instead of installed binary
- Flow: `createWorkingCopy(version)` → extract JS from working copy → patch → repack into installed path
- Backup the working copy as the new clean backup before patching
- **Files:** src/patches/index.ts

### T4: Verification Honesty — Tiered Reporting — G31
- Check output distinguishes "present" (signature found) from "functional" (probe passed)
- SOVEREIGN status requires all signatures present. Functional status reported separately.
- Panel check: add note "requires live session to verify rendering"
- **Files:** src/patches/index.ts (check command output)

### T5: Functional Probe Expansion — G32
- Rename "tools functional" to "Ping: functional" when only Ping tested
- Add REPL probe: `claude -p "use REPL to evaluate 2+2"` → check for "4" in output
- Tungsten probe: more complex (needs tmux), defer to separate probe or mark "untested"
- At minimum: honest labeling of what's actually probed
- **Files:** src/patches/index.ts runFunctionalProbe()

### T6: FS9 bashProvider Investigation — G33
- Read cc-source bashProvider to understand what FS9's return value enables
- Determine: does TMUX env inheritance produce user-visible behavior?
- Document findings in RESEARCH.md. Fix if broken, document if cosmetic.
- **Files:** Research only (external source), update RESEARCH.md

### T7: Dual Detection Documentation — G34
- Add code comments explaining the two-layer design
- Orchestrator: "signature presence = skip, delegates never called"
- Individual functions: "pattern detection for fresh application only"
- Document the contract in a comment block
- **Files:** src/patches/index.ts (comment only)

### T8: tungsten.js Code Fixes — G37-G39
- G37: handleCreate checks session existence via ensureSession pattern
- G38: handleKill clears AppState when killing tracked session, switches to remaining session if any
- G39: Session name validation — reject `.`, `:`, empty/whitespace
- **Files:** data/tools/tungsten.js

### T9: Build, Deploy, Verify
- `pnpm build && node dist/index.mjs --apply`
- Verify 19/19 SOVEREIGN
- Test `--restore` with contaminated and clean states
- Test handleCreate with duplicate session

### T10: Live Verification Guide — G36
- Document testing steps for panel rendering, FS9 chain, REPL inheritance
- Include expected pass/fail output
- User runs these manually in fresh CC session

### T11: Housekeeping
- TRACKER, CONTEXT, HANDOFF, ROADMAP, STATE updates

## Execution Order

1. T6 first (research — informs whether FS9 needs code changes)
2. T2 + T3 (backup/restore/vault — the critical infrastructure)
3. T4 + T5 (verification honesty)
4. T7 (documentation)
5. T8 (tungsten.js fixes)
6. T9 (build + verify)
7. T10 + T11 (docs + housekeeping)

## Risks

- **Virgin vault binary may not exist locally.** downloadVirginBinary requires network access to GCS. If offline, restore fallback fails. Mitigated: clear error message.
- **REPL probe may be flaky.** Model behavior in `-p` mode varies. Mitigated: Check for REPL tool call in output, not specific answer.
- **bashProvider behavior may be version-specific.** FS9 chain might work differently across CC versions. Mitigated: document for 2.1.101, version-gate if needed.

## Files Touched

| Task | Files |
|------|-------|
| T1 | governance.ts, tungsten-panel.js (DONE) |
| T2 | installationBackup.ts |
| T3 | patches/index.ts |
| T4 | patches/index.ts |
| T5 | patches/index.ts |
| T6 | RESEARCH.md only |
| T7 | patches/index.ts (comments) |
| T8 | data/tools/tungsten.js |
| T9 | Build/test only |
| T10 | HANDOFF.md |
| T11 | TRACKER, CONTEXT, ROADMAP, STATE |
