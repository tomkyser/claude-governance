# Milestone 3.75 Bootstrap — RALPH

---

**Status:** NOT STARTED — milestone initiation required
**SOVEREIGN:** 32/32
**Previous:** M-3.5 COMPLETE (Wire + Message Components Control)

## Milestone Initiation Checklist

This is a NEW milestone. Before any implementation, complete the milestone lifecycle steps:

### Step 1: Research (Phase Step 1)
- [ ] Read `VISION.md` — ground in project intent
- [ ] Read `.planning/STATE.md` and `.planning/ROADMAP.md` — verify global state
- [ ] Read M-3.5 `RETROSPECTIVE.md` — carry forward lessons and pinned items
- [ ] Read the two RALPH research docs (design + implementation plan)
- [ ] Create `M-3.75/IMPACT.md` — scope impact to project and vision
- [ ] Assess: does RALPH require binary patching? Hook-only? Config changes?
- [ ] Identify dependencies on existing governance infrastructure

### Step 2: Phase Planning (Phase Step 2)
- [ ] Break Phase 1 into tasks in `M-3.75/P1-cognitive-redirect/TASKS.md`
- [ ] Create phase directory structure (TRACKER, CONTEXT, PLANNING, RESEARCH, TASKS)
- [ ] Update ROADMAP.md with refined task list from planning
- [ ] Create tasks via TaskCreate mirroring TASKS.md

### Step 3: Execute Phase 1, then iterate through phases 2-5

## What This Milestone Is

RALPH (Reasoning-Anchored Loop for Planning and Hypothesizing) is a cognitive
redirect framework implemented via CC hooks. It interrupts the default
forward-chaining behavior and enforces backward reasoning from the end state.

**Not a binary patch project.** RALPH is entirely hook-based:
- `UserPromptSubmit` hook: Layer 0 cognitive redirect (HALT → END → HERE → DELTA)
- `PreToolUse` hook: RALPH enforcement before REPL calls (R → A → L → P → H)
- Agent dispatch patterns within REPL for unknown resolution
- Execution scaffold codified as reusable patterns

**Core insight:** Don't classify the request — classify the gap. A request that
sounds complex might have a tiny delta; a simple-sounding request might hide
enormous unknowns. Backward reasoning from END catches what forward-chaining misses.

## Read First
`.planning/VISION.md`
`.planning/STATE.md`
`.planning/ROADMAP.md` (M-3.75 section)

THEN — the research that defines this milestone:
1. `.planning/research/2026-04-17-ralph-framework-design.md` (the WHY — 4-layer architecture)
2. `.planning/research/2026-04-17-ralph-implementation-plan.md` (the HOW — 5 phases, acceptance criteria)

THEN — previous milestone context:
3. `.planning/milestones/M-3.5/RETROSPECTIVE.md` (lessons, pinned items)

## 5 Phases (from ROADMAP.md)

### Phase 1: UserPromptSubmit Hook — Layer 0 Cognitive Redirect
The foundation. Fires on every user message. Injects HALT → END → HERE → DELTA.
- 1A: Hook registration in settings.json
- 1B: Layer 0 prompt injection (cognitive redirect scaffold)
- 1C: Adaptive depth — trivial request bypass (Tier 1 fast path)
- 1D: Acceptance testing

### Phase 2: PreToolUse Hook — RALPH Enforcement for REPL
Fires before REPL calls. Tier 2/3 operations must complete RALPH before executing.
- 2A: Hook registration (toolName: REPL)
- 2B: RALPH checkpoint prompt (R → A → L → P → H)
- 2C: Acceptance testing

### Phase 3: Agent Dispatch Patterns for Unknown Resolution
Reusable patterns for spawning scoped research agents within REPL.
- 3A: Research agent template
- 3B: Agent scoping rules
- 3C: Acceptance testing

### Phase 4: Execution Pattern Library
Codify preflight → read → transform → verify as reusable REPL framework.
- 4A: Execution scaffold
- 4B: Acceptance testing

### Phase 5: Integration Testing
End-to-end validation across all tiers.
- 5A: Test cases (trivial through ambiguous)
- 5B: Metrics (Tier 1 <5s overhead, >90% unknown detection, >85% first-pass success)

## Key Differences from Prior Milestones

| Aspect | M-2/M-3/M-3.5 | M-3.75 |
|--------|----------------|--------|
| Primary mechanism | Binary patching | CC hooks (prompt injection) |
| Verification | SOVEREIGN count | Behavioral observation (does the model reason backward?) |
| Testing | TUI rendering, tool calls | Response quality, reasoning structure |
| Artifacts | Patches, tools, overrides | Hook prompts, agent templates, execution patterns |

## Open Questions (from implementation plan)

1. **Hook injection size vs context cost:** Layer 0 adds ~200 tokens per message.
   Should it shrink for follow-ups in ongoing tasks?
2. **RALPH output format:** Structured (JSON-like) or prose? Structured is parseable
   but mechanical. Prose is natural but harder to validate.
3. **Agent dispatch latency:** Research agents add wall-clock time. Is there a
   "fast RALPH" mode for time-sensitive tasks?
4. **Interaction with Clawback hooks:** RALPH must compose with existing
   PostToolUse formatting hooks. Layer 4 should expect Clawback's auto-formatting.
5. **Training effect:** Does repeated RALPH injection train the model to internalize
   the pattern over a session? Could the hook reduce to a reminder after N messages?

## Build & Verify (unchanged)
```bash
cd claude-governance && pnpm build
node claude-governance/dist/index.mjs check   # Target: 32/32 SOVEREIGN
```
