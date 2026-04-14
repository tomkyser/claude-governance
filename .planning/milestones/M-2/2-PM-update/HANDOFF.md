# Phase 2-PM-update Handoff — Project Management Restructuring

**Completed:** 2026-04-14
**Commits:** e1e978f, 46efb66, fcfe851

## What Was Built

Project management restructuring across the entire .planning tree:

1. **REFERENCES.md** — 35 catalogued external references with camelCase IDs. All inline
   URLs extracted from CLAUDE.md and ROADMAP.md. Citation protocol: `[tweakcc1]` not raw URLs.

2. **Per-phase directories** — Every phase now has its own directory with 6 files:
   TRACKER.md, CONTEXT.md, PLANNING.md, RESEARCH.md, TASKS.md, HANDOFF.md.
   14 phases across M-1 and M-2 restructured. Old flat trackers/ and handoffs/ dirs removed.

3. **Milestone-level docs** — IMPACT.md, FINDINGS.md, GAPS.md, RETROSPECTIVE.md at each
   milestone root. IMPACT.md is a living document updated on cross-phase impact.

4. **CLAUDE.md lifecycle** — 6-step phase lifecycle (research, planning, act, verify,
   gap analysis, housekeeping) and 6-step milestone lifecycle. Reference citation protocol.
   TASKS.md + TaskCreate sync protocol. Bidirectional planning scope.

5. **Project rename** — "Claude Code Patches"/"Sovereign" → "claude-governance".
   GitHub repo: tomkyser/sovereign → tomkyser/claude-governance.

6. **Artifacts** — Milestone-level CONTEXT.md files (M-1, M-2) archived to
   `.planning/artifacts/` with origin naming.

## Key Decisions

- SOVEREIGN verification status label retained (technical term, not branding)
- Historical journals left untouched (point-in-time records, rewriting would be misleading)
- Retroactive stubs include clarifying notes about conventions and pointer to artifacts

## What's Next

Phase 2c-gaps-1: Tungsten Gaps — needs analysis. Known issue: visual dashboard not
appearing in terminal. Other gaps TBD.
