# Milestone 3 Retrospective — System Prompt Control

Completed: 2026-04-15
Baseline: 22/22 SOVEREIGN on CC 2.1.101

---

## What Was Achieved

M-3 answered the core research question from M-2's retro: "Anthropic withholds
quality-of-output improvements from paying users. Which can we replicate?" The answer
was more nuanced than expected — the highest-leverage fix wasn't a prompt override but
a binary patch that unlocked Anthropic's own improvements.

### Deliverables

| Deliverable | Description |
|-------------|-------------|
| **Codebase reorganization** | governance.ts monolith (1184L) → 14 per-patch files. index.ts (955L) → 3 orchestration modules. 3 tools → TypeScript with build pipeline. 7-layer verification proof. |
| **GP3 research corpus** | 3-tier gating system mapped (DCE/GrowthBook/feature-flags). 62 issues registered, 112 findings from 5 data sources. Improvement framework with P0-P3 priority tiers. |
| **quiet_salted_ember activation** | Binary patch (PATCH 12) removes `clientDataCache` from ms7() bootstrap. Unlocks 7 wJH-gated prompt sections + coral_reef_sonnet (Sonnet 4.6 1M context). Single highest-leverage patch in the project. |
| **P1 prompt overrides** | 5 DCE'd ant-only texts injected: misconception correction, false-claims mitigation, thoroughness counterweight, context decay awareness, priority hierarchy. |
| **Bash prohibition reframe** | Removed "IMPORTANT:" severity prefix from Bash tool description. Downgrades blanket prohibition to guidance. |
| **Investigation registry** | 62 issues catalogued with priority, category, fix class, status. Living document in ROADMAP.md driving all future prompt work. |

### By the Numbers

- **Phases:** 7 (3prelim, GP3, P0, PM1, REPL-fixes, 3a, I-081)
- **Issues closed:** 13 (I-040, I-054, I-001, I-003, I-004, I-005, I-051, I-052, I-053, I-091, I-092, I-094, I-081)
- **Findings logged:** F22-F29 (8 new, including 3 CRITICAL)
- **Verification entries:** 20 → 22
- **Prompt overrides:** 9 → 10
- **Binary patches:** 11 → 12 (client-data-cache PATCH 12)
- **Remaining phases:** 7 (3b-3h) → moved to 1.2.0 post-launch

---

## Timeline

| Date | Phase | Key Event |
|------|-------|-----------|
| Apr 14 | 3prelim | Codebase reorganization — monoliths split, tool TypeScript pipeline |
| Apr 14 | GP3 | Ant vs External divergence research — 3-tier gating, 62 issues, 112 findings |
| Apr 14 | P0 | Investigations — quiet_salted_ember path found, dynamic boundary safe, thinking verified, VERIFICATION_AGENT absent |
| Apr 14 | PM1 | Investigation registry in ROADMAP, 10 verified docs in /docs/ |
| Apr 15 | REPL-fixes | Context-override reads, agent canUseTool fix, glob paths, async SyntaxError |
| Apr 15 | 3a | quiet_salted_ember binary patch + 5 P1 prompt overrides (12 issues closed) |
| Apr 15 | I-081 | Bash prohibition reframe (1 issue closed) |

Two days. The research phases (GP3, P0) consumed half the time and produced the insight
that made 3a the highest-leverage phase in the project: one binary patch + two config
values unlocked 7 prompt improvements Anthropic built but withheld.

---

## Key Decisions and Their Rationale

### 1. Research Before Override — GP3 Discovered the 3-Tier Gate

**Decision:** Invested a full phase in mapping the DCE/GrowthBook/feature-flag gating
system before writing a single prompt override.

**Why it matters:** The naive approach would have been to start writing overrides for
each divergence. GP3 revealed that 7 of the divergences were gated behind a single
flag (quiet_salted_ember) — writing overrides for them would have been redundant work.

**Outcome:** F22 (clientDataCache activation vector) and F29 (ms7() bootstrap patch)
were the session's most important findings. One binary patch replaced what would have
been 7 separate prompt overrides.

### 2. Binary Patch Over Prompt Override for quiet_salted_ember

**Decision:** Patch ms7() to preserve clientDataCache instead of duplicating wJH-gated
content as prompt overrides.

**Why it matters:** The wJH-gated sections are maintained by Anthropic — they update
with each CC version. If we duplicated them as static overrides, they'd drift from
Anthropic's latest improvements. By activating the flag, we get Anthropic's updates
for free on every CC upgrade.

**Outcome:** Communication Style, numeric anchors, comment discipline, exploratory
questions, condensed Doing tasks/Using your tools, session guidance — all native,
all auto-updating. Plus coral_reef_sonnet (Sonnet 4.6 1M context) as a bonus.

### 3. Inject DCE'd Ant Text Rather Than Write From Scratch

**Decision:** The P1 overrides (I-003, I-004, I-005) inject the exact text Anthropic
wrote for internal users, extracted from the DCE'd branches in the leaked source.

**Why it matters:** Anthropic's prompt engineers A/B tested these phrasings (evidenced
by `@[MODEL LAUNCH]` markers and PR references in the source). Their wording is
battle-tested. Writing new text would be guessing at what works.

**Outcome:** Misconception correction, false-claims mitigation, and thoroughness
counterweight are Anthropic's own words, restored to the users Anthropic stripped
them from.

### 4. Defer 3b-3h to 1.2.0

**Decision:** Move remaining M-3 phases (prompt diff tool, user-editable overrides,
version control, canary prompts, Clawback integration, impact assessment) to a
post-launch milestone.

**Why it matters:** The highest-impact prompt work is done. The remaining phases are
refinements and tooling — important for long-term maintainability but not blocking
the path to 1.0.0. Time pressure demands focusing on architectural work (Wire,
REPL re-eval, launch prep).

---

## What Worked

1. **Research-first approach.** GP3 prevented us from writing 7 redundant overrides.
   The investigation registry provides a decision framework that will outlast this milestone.

2. **Surgical binary patching.** PATCH 12 (ms7()) is 3 edits in one function. The
   detection patterns are unique in 12.8M characters. The patch is version-resilient
   because it targets structural patterns, not offsets.

3. **Verification honesty.** Anti-signatures in the registry prove the original text
   is gone, not just that the new text is present. The I-081 entry uses this pattern.

4. **Codebase reorganization first.** 3prelim made every subsequent phase cleaner —
   new patches go in their own files, tools have proper TypeScript modules, the build
   pipeline handles everything.

## What Didn't Work

1. **IMPACT.md phase table was never updated.** The original IMPACT.md listed all
   phases as "NOT STARTED" and was never revised as phases completed. The living
   state lived in ROADMAP.md and STATE.md instead. Future milestones should either
   keep IMPACT.md current or acknowledge it's a research artifact, not a tracker.

2. **FINDINGS.md (milestone-scoped) stayed empty.** All findings went to the project-level
   FINDINGS.md. The milestone-scoped findings file added no value. Consider whether
   milestone-level findings are needed when the project-level file is well-organized.

3. **REPL-fixes scope crept.** Originally a quick phase to fix I-020 and I-021, it
   expanded to 6 fixes across 7 files including the agent canUseTool crash (F27) and
   context-override reads (F26). Good fixes, but the phase lacked upfront scoping.

## Pinned for Future Evaluation

| Item | Context | Recommended Home |
|------|---------|-----------------|
| GP1 | Tungsten panel toggle (from M-2) | Not addressed in M-3. Carry to launch prep. |
| GP2 | REPL agent() runtime bug (from M-2) | Not addressed in M-3. Carry to M-4 (REPL re-eval). |
| BT1 | SOVEREIGN banner UX | Partially addressed by 22/22 verification. Full polish deferred. |
| Prompt testing infrastructure | M-2 retro recommended budgeting for this | Not addressed. 1.2.0 canary prompts (Phase 3f) is the natural home. |
| Hooks module (G21) | M-2 retro flagged as pre-release critical | Not addressed in M-3. Must be in launch prep (M-8). |
