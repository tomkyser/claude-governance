# Milestone 3 Bootstrap — System Prompt Control [COMPLETE]

---

**Status:** M-3 COMPLETE — 13 issues closed, 22/22 SOVEREIGN
**Retro:** RETROSPECTIVE.md, GAPS.md complete
**Deferred:** 3b-3h moved to 1.2.0 post-launch milestone

Read these files for context on what was accomplished:

1. `.planning/milestones/M-3/RETROSPECTIVE.md` — What worked, key decisions, pinned items
2. `.planning/milestones/M-3/GAPS.md` — 7 outstanding gaps + 1.2.0 deferrals
3. `.planning/ROADMAP.md` — Investigation Registry (top) + 1.2.0 milestone (bottom)

## M-3 Summary

| Phase | What | Issues Closed |
|-------|------|---------------|
| 3prelim | Codebase reorganization (monolith split, tool TS pipeline) | — |
| GP3 | Ant vs External divergence research (3-tier gating, 62 issues, 112 findings) | — |
| P0 | Investigations (quiet_salted_ember path, boundary audit, thinking, VERIFICATION_AGENT) | — |
| PM1 | Investigation registry + 10 verified docs in /docs/ | — |
| REPL-fixes | Context-override reads, agent canUseTool, glob paths, async SyntaxError | I-020, I-021 |
| 3a | quiet_salted_ember binary patch + 5 P1 prompt overrides | I-040, I-054, I-001, I-003, I-004, I-005, I-051, I-052, I-053, I-091, I-092, I-094 |
| I-081 | Bash prohibition reframe | I-081 |

## Pinned Items Carrying Forward

- **GP1:** Tungsten panel toggle → launch prep (M-8)
- **GP2:** REPL agent() nested delegation bug → M-4 (REPL re-eval)
- **G21:** Hooks module → launch prep (M-8), critical for public release
- **BT1:** SOVEREIGN banner UX → launch prep
- **Prompt testing infrastructure** → 1.2.0 canary prompts (Phase 3f)

## Next Milestone

User deciding — architectural work is priority. Candidates:
- M-3.5 (Wire — inter-session communication)
- M-4 (REPL re-eval)
- Whichever milestone the user directs
