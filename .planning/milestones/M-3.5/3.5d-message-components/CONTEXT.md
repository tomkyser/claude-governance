# Phase 3.5d Context — Message Components Control

Date: 2026-04-17
Status: P3 INCOMPLETE — two gap phases blocking closure
Previous: P3 partial (T17/T19/T21 done, T18/T20 marked in error)
SOVEREIGN: 30/30

## Scope
Complete user-facing customization layer for message component overrides.

## Critical Findings This Session

### REPL TUI Visibility (confirmed 2026-04-17)
- User set CLAUDE_CODE_REPL=1 in settings.json — enables REPL mode
- REPL mode alone does NOT fix TUI visibility
- Root cause: isAbsorbedSilently=true in collapseReadSearch (zJ6/getToolSearchOrReadInfo)
- REPL wrapper absorbed into collapsed group with zero count — renders as nothing
- Binary patch required: change isAbsorbedSilently from true to false for REPL
- Transcript stripping also present: transformMessagesForExternalTranscript removes REPL pairs

### Component Override System State
- Architecture is sound: intercept at renderer dispatch, user JS gets React refs + data
- CC source components (389 files, 50 dirs, 9.3MB) too coupled for extract-and-edit
- Override system deployed but NEVER tested end-to-end
- defaults.js returns empty override registries — no actual overrides
- Handler signature in docs/README.md unverified against binary injection code
- Existing patches (thinking, render-tree, etc.) not migrated to override system

### Erroneously Completed Tasks
- T18: data/components/defaults.js is empty IIFE, no override logic
- T20: Docs describe handler signature never verified against actual injection

## Gap Phases Required
1. P3-GAP-REPL: Fix REPL TUI visibility (4 tasks after T-REPL-2 skip)
2. P3-GAP: Verify and complete component override system (6 tasks)
3. T23: Full TUI sweep (blocked until both gaps close)
