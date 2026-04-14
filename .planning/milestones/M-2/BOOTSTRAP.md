# Milestone 2 Bootstrap — Paste After Compaction

---

Read these files in order:

1. `.planning/VISION.md` -- Understand the intent of the project.
2. `.planning/milestones/M-2/IMPACT.md` — Milestone scope and phase impact
2. `.planning/ROADMAP.md` — Phase status and what's next at line 294.
3. `.planning/STATE.md` — Global project state
4. `.planning/FINDINGS.md` — Architecture-informing discoveries (F1-F21)
5. `.planning/milestones/M-2/2-PM-update/HANDOFF.md` — Latest handoff

Quick verify:
```bash
cd /Users/tom.kyser/dev/claude-code-patches/claude-governance
pnpm build && node dist/index.mjs check
```

**Completed:** 2a, 2a-gaps, 2b, 2b-gaps, 2b-gaps-2, 2b-gaps-3, 2c (19/19 SOVEREIGN), 2-PM-update
**Next:** 2c-gaps-1 (Tungsten gaps — visual dashboard not appearing, other gaps TBD)
**Then:** Milestone 2 Retro

**Post-Tungsten gaps (from 2b-gaps-3):** G24-G28 — functional probe in replace mode, coexist nudging, oversized labeling, CLI mode switch, coexist prompt parity.

**PM convention (from 2-PM-update):**
- Per-phase directories: `M-2/{phaseName}/` with TRACKER, CONTEXT, PLANNING, RESEARCH, TASKS, HANDOFF
- REFERENCES.md for all external URLs — cite by ID (e.g., `[tweakcc1]`)
- Milestone-level: IMPACT.md, FINDINGS.md, GAPS.md, RETROSPECTIVE.md
- TASKS.md is persistent backing store for TaskCreate — keep in sync
- PLANNING.md frames bidirectionally: phase ↔ milestone ↔ project scope
- IMPACT.md: living doc, update on cross-phase impact
