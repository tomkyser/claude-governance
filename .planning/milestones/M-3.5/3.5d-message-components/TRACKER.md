# Phase 3.5d Tracker — Message Components Control

## Status: P3-GAP-ENV COMPLETE — component override verification remaining (P3-GAP)

## Phase Progress
- [x] Research — CC source analysis, binary patterns, rendering pipeline
- [x] Planning — PLANNING.md with implementation approach per deliverable
- [~] Act — P0-P2 complete. P3 partially complete (T17/T19/T21 done, T18/T20 marked in error)
- [~] Verify — SOVEREIGN 32/32 but behavioral gaps found: REPL invisible, components untested
- [~] Gap Analysis — TWO gap phases identified (REPL visibility, component verification)
- [ ] Housekeeping — blocked until gap phases resolve

## Decisions
- REPL env flag (CLAUDE_CODE_REPL=1) does NOT fix TUI visibility — binary patch required
- T-REPL-2 skipped: env flag handles isReplModeEnabled(), patch unnecessary
- CC source components (389 files, 9.3MB) too coupled to extract/edit — override system is correct architecture
- T18/T20 were marked complete without behavioral verification — corrected

## Blockers
- ~~REPL tool calls invisible in TUI~~ RESOLVED: repl-visibility.ts + repl-transcript.ts
- Component override system never tested end-to-end
- Handler signature in docs unverified against binary injection

## Decisions (P3-GAP-ENV)
- Env vars exported at 3 layers: settings.json, spawn env (launchEnv), shell exports (shim)
- RECOMMENDED_ENV is the single source of truth — shim generates exports dynamically
- CLAUDE_CODE_REPL=1 added to RECOMMENDED_ENV
- All 7 vars verified present in running CC process via live TUI
