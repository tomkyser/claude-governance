# Milestone 3 Gaps — System Prompt Control

Last updated: 2026-04-15

## Summary

M-3 closed 13 issues across 7 phases, delivering quiet_salted_ember activation,
P1 prompt overrides, Bash prohibition reframe, and a 62-issue investigation registry.
22/22 SOVEREIGN on CC 2.1.101.

Remaining M-3 scope (3b-3h) moved to 1.2.0 post-launch milestone. Gaps below are
items discovered during M-3 that need attention in future milestones.

---

## Outstanding Gaps

### Carried from M-2 (Not Addressed in M-3)

| ID | Description | Origin | Recommendation |
|----|-------------|--------|----------------|
| GP1 | **Tungsten panel toggle** — No user toggle to show/hide live Tungsten panel. | M-2 2c-gaps-2 | Launch prep (M-8). Config flag + potential keybind. |
| GP2 | **REPL agent() runtime bug** — "O is not a function" in REPL→Agent→Bash path. Fixed for direct agent() calls (F27) but nested delegation still has edge cases. | M-2 2c-gaps-1 | M-4 (REPL re-eval). |
| G21 | **Hooks module** — Design exists, not built. Users manually copy hook files. | M-2 2b-gaps-3 | Launch prep (M-8). Critical for public release. |
| BT1 | **SOVEREIGN banner UX** — Degraded-state messaging needs polish. | M-2 BUGTRACKER | Launch prep. |

### New Gaps from M-3

| ID | Description | Origin | Recommendation |
|----|-------------|--------|----------------|
| MG1 | **IMPACT.md never updated** — Phase table stayed at "NOT STARTED" for all phases. Living state was in ROADMAP/STATE only. | M-3 retro | Process: either keep IMPACT.md current or drop it from milestone lifecycle. |
| MG2 | **Milestone FINDINGS.md empty** — All findings went to project-level. Milestone-scoped file added no value. | M-3 retro | Process: evaluate whether milestone-scoped findings are needed. |
| MG3 | **I-081 behavioral verification** — Signature confirms text change but model behavior (fewer tool calls for pipeline operations) not yet verified in live session. | I-081 | Verify in current session before closing M-3. |

### Deferred to 1.2.0

See ROADMAP.md 1.2.0 milestone for full list. Key items:
- Prompt diff tool (3b)
- Targeted degradation fixes (3c): I-002, I-009, I-012, I-090, I-093, I-095, I-080, I-082
- User-editable overrides with merge-on-update (3d)
- Prompt version control (3e)
- Canary prompts (3f)
- Clawback integration (3g)
- Monitoring hooks: I-065, I-070, I-096

---

## Gap Statistics

| Category | Count |
|----------|-------|
| Carried from M-2 | 4 |
| New from M-3 | 3 |
| Deferred to 1.2.0 | 7 phases + 11 issues |
| **Total outstanding** | **7** (non-deferred) |
