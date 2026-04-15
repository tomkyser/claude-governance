# Improvement Framework — What's Holding Claude Code Back

**Date:** 2026-04-14
**Methodology:** Abductive reasoning from binary analysis, source analysis, self-observation,
web research (pending), and introspective probe (pending)
**Status:** Framework established; all data sources collected and cross-referenced

---

## Analytical Parameters

### P1: Quality Dimensions

Each improvement opportunity is evaluated against these measurable quality dimensions:

| Dimension | ID | Description | Measurement |
|-----------|-----|-------------|-------------|
| Output Accuracy | QD-1 | Correctness of code, claims, and analysis | Error rate in delivered work |
| Output Completeness | QD-2 | Does the work fully address the request | % of requirements met |
| Output Relevance | QD-3 | Signal-to-noise ratio in responses | Useful tokens / total tokens |
| Reasoning Depth | QD-4 | Quality of analytical reasoning shown | Levels of causal inference |
| Context Retention | QD-5 | Ability to maintain coherent state across turns | Accuracy after N tool calls |
| Tool Efficiency | QD-6 | Optimal tool selection and usage | Tool calls per task unit |
| Autonomy Level | QD-7 | Ability to make judgment calls independently | Unnecessary confirmations / total |
| Recovery Speed | QD-8 | Speed of error detection and correction | Turns to recover from error |

### P2: Degradation Categories

Each issue belongs to one or more degradation categories:

| Category | ID | Root Cause Layer |
|----------|-----|------------------|
| Prompt-Induced | DC-P | System prompt instructions that degrade output |
| Architecture-Induced | DC-A | Tool/platform limitations that force suboptimal behavior |
| Model-Induced | DC-M | Base model behavioral tendencies (laziness, over-caution, etc.) |
| Context-Induced | DC-C | Context window management, compaction, state loss |
| Configuration-Induced | DC-F | Settings, flags, environment that reduce capability |
| Interaction-Induced | DC-I | User-facing friction that wastes time or tokens |

### P3: Fix Classes

Each issue maps to a fix approach:

| Fix Class | ID | Implementation Effort |
|-----------|-----|----------------------|
| Prompt Override | FX-O | LOW — add/replace prompt text via governance |
| Binary Patch | FX-B | MEDIUM — pattern match and modify binary JS |
| Flag Manipulation | FX-G | LOW — set GrowthBook flag in cache |
| Tool Enhancement | FX-T | HIGH — modify REPL/Tungsten/Ping tool code |
| Hook Addition | FX-H | MEDIUM — add session hooks |
| CLAUDE.md Directive | FX-C | NONE — user-space, immediate |
| Architecture Change | FX-X | HIGH — requires structural work |

---

## Issue Registry

### TIER 1: Prompt-Induced Degradation (verified from binary + source)

| ID | Issue | Quality Dims | Category | Fix | Severity |
|----|-------|-------------|----------|-----|----------|
| I-001 | "Lead with the answer, not the reasoning" actively suppresses reasoning chains | QD-1, QD-4 | DC-P | FX-O | CRITICAL |
| I-002 | "Be extra concise" / "short and concise" compound to produce unhelpful brevity | QD-2, QD-3 | DC-P | FX-O | HIGH |
| I-003 | No misconception correction — model won't flag user errors proactively | QD-1, QD-7 | DC-P | FX-O | HIGH |
| I-004 | No false-claims mitigation — model can fabricate success reports | QD-1 | DC-P | FX-O | HIGH |
| I-005 | No thoroughness counterweight — model declares "done" without verification | QD-1, QD-2 | DC-P | FX-O | HIGH |
| I-006 | CLAUDE.md wrapped in dismissive framing, deprioritized | QD-7 | DC-P | FX-B | CRITICAL |
| I-007 | Subagent CLAUDE.md stripping — child agents lose user instructions | QD-5 | DC-P, DC-F | FX-B | HIGH |
| I-008 | system-reminder tags described as "bear no direct relation" — undermines hook feedback | QD-7 | DC-P | FX-B | HIGH |
| I-009 | "Your responses should be short and concise" in Tone section — redundant brevity pressure | QD-2, QD-3 | DC-P | FX-O | MEDIUM |
| I-010 | "Doing tasks" section has instruction duplication ("do not propose changes" appears twice) | QD-6 | DC-P | FX-O | LOW |
| I-011 | "Avoid giving time estimates" — sometimes users genuinely need estimates | QD-7 | DC-P | FX-O | LOW |
| I-012 | EnterPlanMode prompt is over-cautious — triggers planning for simple tasks | QD-7 | DC-P | FX-O | MEDIUM |

### TIER 2: Architecture-Induced Degradation (observed in session)

| ID | Issue | Quality Dims | Category | Fix | Severity |
|----|-------|-------------|----------|-----|----------|
| I-020 | REPL read() 256KB limit prevents large file analysis | QD-6 | DC-A | FX-T | HIGH |
| I-021 | REPL glob() path resolution ambiguity (relative vs absolute) | QD-6 | DC-A | FX-T | MEDIUM |
| I-022 | Parallel Bash call cascade cancellation — one error kills siblings | QD-6 | DC-A | FX-X | MEDIUM |
| I-023 | WebFetch only returns summaries — useless for exact text research | QD-2, QD-4 | DC-A | FX-T | HIGH |
| I-024 | Large Bash output persisted to unreadable JSONL files | QD-5, QD-6 | DC-A | FX-X | MEDIUM |
| I-025 | Agent results are summarized, not queryable — detail loss | QD-2, QD-5 | DC-A | FX-X | MEDIUM |
| I-026 | No diff between virgin and patched binary in session awareness | QD-1 | DC-A, DC-I | FX-H | HIGH |
| I-027 | TaskCreate system reminders inject noise during research work | QD-3, QD-6 | DC-A | FX-X | LOW |

### TIER 3: Context-Induced Degradation

| ID | Issue | Quality Dims | Category | Fix | Severity |
|----|-------|-------------|----------|-----|----------|
| I-030 | Post-compaction context rebuild costs 15-30 tool calls | QD-5, QD-6 | DC-C | FX-H | HIGH |
| I-031 | Read hook caches truncated reads as "already read" — blocks re-reads | QD-5 | DC-C | FX-H | MEDIUM |
| I-032 | CLAUDE.md ~800 lines present every turn regardless of relevance | QD-6 | DC-C | FX-C | MEDIUM |
| I-033 | "Don't trust compaction summaries" vs compaction being primary context source | QD-5, QD-7 | DC-C, DC-P | FX-C | MEDIUM |
| I-034 | Context decay after 10+ tool calls without re-reads | QD-1, QD-5 | DC-C | FX-C | HIGH |

### TIER 4: Configuration-Induced Degradation

| ID | Issue | Quality Dims | Category | Fix | Severity |
|----|-------|-------------|----------|-----|----------|
| I-040 | quiet_salted_ember flag disabled — entire wJH prompt experience locked | QD-1..QD-4 | DC-F | FX-G | CRITICAL |
| I-041 | tengu_hive_evidence flag disabled — VERIFICATION_AGENT locked | QD-1, QD-2 | DC-F | FX-G | HIGH |
| I-042 | REPL/Tungsten tools absent from base binary — require injection | QD-6 | DC-F | FX-B | CRITICAL |
| I-043 | EMBEDDED_SEARCH_TOOLS undocumented for external users | QD-6 | DC-F | FX-C | HIGH |

### TIER 5: Missing Capabilities (from GP3 research)

| ID | Issue | Quality Dims | Category | Fix | Severity |
|----|-------|-------------|----------|-----|----------|
| I-050 | No adversarial verification before completion claims | QD-1, QD-2 | DC-P, DC-F | FX-G/FX-O | HIGH |
| I-051 | No numeric conciseness anchors (≤25/≤100 words) | QD-3, QD-6 | DC-P | FX-O | MEDIUM |
| I-052 | No exploratory-question protocol (2-3 sentence response) | QD-3, QD-7 | DC-P | FX-O | MEDIUM |
| I-053 | No comment discipline (default no-comments, WHY-only) | QD-1 | DC-P | FX-O | MEDIUM |
| I-054 | No Communication Style section (professional prose guidance) | QD-3 | DC-P | FX-O | HIGH |

---

## Priority Ranking (by compound impact)

### P0 — Fix immediately (unlocks multiple improvements)

1. **I-040: Investigate quiet_salted_ember activation** — If achievable, unlocks I-051, I-052, I-053, I-054 and partially addresses I-001, I-002, I-009. Single flag potentially resolves 7 issues.
2. **I-006: CLAUDE.md authority** — ALREADY FIXED by governance patches. Validates approach.
3. **I-042: REPL/Tungsten injection** — ALREADY FIXED by governance. Validates approach.

### P1 — High-impact prompt overrides (low effort)

4. **I-001: Reasoning suppression fix** — Replace "Output efficiency" with Communication Style (G1)
5. **I-003: Misconception correction** — Add P1 text to Doing tasks section
6. **I-004: False-claims mitigation** — Add P2 text to Doing tasks section
7. **I-005: Thoroughness counterweight** — Add P4 text to Doing tasks section

### P2 — Strategic improvements (medium effort)

8. **I-041: VERIFICATION_AGENT activation** — Flag manipulation or governance injection
9. **I-020: REPL read() limit increase** — Tool enhancement
10. **I-030: Post-compaction rebuild** — Hook-based state restoration

### P3 — Quality refinements (low effort, medium impact)

11. **I-051: Numeric length anchors** — Prompt override
12. **I-012: EnterPlanMode prompt** — Prompt override
13. **I-052: Exploratory question protocol** — Prompt override

---

## Data Collection Status

| Source | Status | Expected Findings |
|--------|--------|-------------------|
| Binary analysis (virgin) | COMPLETE | Tier 1-4 issues identified |
| Leaked source analysis | COMPLETE | Tier 1, 5 issues identified |
| Self-analysis (this session) | COMPLETE | 20 friction points documented |
| Web research: friction points | COMPLETE | 41 findings (F-001..F-041), 25 HIGH severity |
| Web research: prompt analysis | IN PROGRESS (agent) | Published prompt critiques |
| Introspective Claude probe | COMPLETE | 5 findings + honorable mention |

---

## Cross-Reference: Community Research → Issue Registry

The friction research agent (41 findings) maps to our issue registry as follows:

### New Issues from Community Research (not in original registry)

| ID | From | Issue | Quality Dims | Category | Severity |
|----|------|-------|-------------|----------|----------|
| I-060 | F-002 | "Simplest approach" usage up 642% — prompt-induced laziness | QD-1, QD-4 | DC-P, DC-M | HIGH |
| I-061 | F-011 | Read:Edit ratio collapsed 6.6→2.0 — 70% less research before editing | QD-1, QD-6 | DC-M | HIGH |
| I-062 | F-012 | Write overuse doubled — full file rewrites instead of surgical Edit | QD-6 | DC-M | HIGH |
| I-063 | F-015 | MCP tool definitions consume 25K+ tokens per server | QD-6 | DC-A | HIGH |
| I-064 | F-031 | Adaptive thinking + effort level reduction = 67% thinking depth drop | QD-1, QD-4 | DC-M, DC-F | CRITICAL |
| I-065 | F-033 | Silent model downgrade after 3x 529 errors — no notification | QD-1 | DC-A | HIGH |
| I-066 | F-008 | Compaction summarizer can hallucinate fabricated instructions | QD-1, QD-5 | DC-C | HIGH |
| I-067 | F-022 | Permission fatigue — 93% approval rate trains reflexive "yes" | QD-7 | DC-I | HIGH |
| I-068 | F-032 | Thinking loops — 5-22 min circular reasoning, 100K+ tokens wasted | QD-6 | DC-M | HIGH |
| I-069 | F-034 | Hallucination of package names, APIs, commit SHAs | QD-1 | DC-M | HIGH |
| I-070 | F-040 | GrowthBook flags silently change features server-side | QD-7 | DC-F | HIGH |
| I-071 | F-016 | System prompt bloat — 40-50% token increase v2.1.92→v2.1.100 | QD-6 | DC-A | MEDIUM |

### Reinforced Issues (community evidence strengthens existing entries)

| Existing ID | Community Finding | New Evidence |
|------------|-------------------|--------------|
| I-001 | F-001 | "Output Efficiency" confirmed as root cause of superficial output |
| I-006 | F-004 | CLAUDE.md dismissal confirmed via 3 GitHub issues (#7571, #18560, #15443) |
| I-007 | F-020 | Subagent stripping confirmed; already patched |
| I-020 | F-014 | Bash tool 30x slower than terminal — compounds REPL limit issues |
| I-030 | F-006 | Compaction destroys 70-80% of context detail — confirmed by issue #13919 |
| I-042 | F-041 | Tool gating confirmed; already addressed |

### Cross-Cutting Patterns (from community research)

**Pattern A: Thinking depth is the root cause.** F-001, F-002, F-005, F-011, F-012,
F-031, F-032, F-034 are all downstream of reduced thinking. When the model has
insufficient reasoning budget: simplest approach, no read before edit, full file
rewrites, hallucinations, thinking loops. The Feb-Mar 2026 adaptive thinking + effort
level changes are the single largest quality regression.

**Pattern B: Context architecture is fundamentally lossy.** F-006, F-007, F-008,
F-009, F-010, F-035 — every long session degrades. The question is when, not if.

**Pattern C: User authority is systematically undermined.** F-004, F-005, F-018,
F-019, F-020, F-033, F-040, F-041 — consistent pattern of degrading user control.

**Pattern D: Token economics create perverse incentives.** F-015, F-016, F-017,
F-029, F-030, F-039 — billing model creates friction.

### Introspective Probe Findings

The inner Claude session identified 5 friction points from the inside:

| ID | From | Issue | Actionable |
|----|------|-------|------------|
| I-080 | Probe-1 | Duplicated instructions (~80 wasted tokens/conversation) | FX-O: deduplicate |
| I-081 | Probe-2 | Bash prohibition is "CRITICAL" but forces 3-4x tool calls | FX-O: reframe as preference |
| I-082 | Probe-3 | Push confirmation in same category as DROP TABLE | FX-O: tiered risk levels |
| I-083 | Probe-4 | CLAUDE.md 8-file startup burns thousands of tokens | FX-C: tier by task type |
| I-084 | Probe-5 | "Never simplest path" creates over-engineering bias | FX-C: reframe as judgment |

---

## Revised Priority Ranking (all sources integrated)

### P0 — Systemic (fix unlocks cascade of improvements)

1. **I-064/F-031: Ensure max effort + disable adaptive thinking** — Already in our
   env vars. Verify it's working. This is the single largest quality lever.
2. **I-040: quiet_salted_ember investigation** — One flag unlocks 7 prompt improvements.
3. **I-006: CLAUDE.md authority** — DONE (governance patches).
4. **I-042: REPL/Tungsten injection** — DONE (governance patches).

### P1 — High-impact prompt overrides (low effort, high return)

5. **I-003/P1: Misconception correction** — Add to "Doing tasks"
6. **I-004/P2: False-claims mitigation** — Add to "Doing tasks"
7. **I-005/P4: Thoroughness counterweight** — Add to "Doing tasks"
8. **I-054/G1: Communication Style** — Replace "Output efficiency"
9. **I-081: Bash tool reframe** — Change "CRITICAL" to tiered guidance

### P2 — Strategic improvements (medium effort)

10. **I-041/F1: VERIFICATION_AGENT** — Flag or governance injection
11. **I-065/F-033: Silent downgrade detection** — Hook to monitor model in response
12. **I-070/F-040: GrowthBook flag monitoring** — Hook to detect/lock flag changes
13. **I-082: Permission tiering** — Override confirmation scope

### P3 — Tool and architecture improvements

14. **I-020: REPL read() limit** — Increase to 1MB or add chunked read
15. **I-063/F-015: MCP token bloat** — Can't fix directly; document workaround
16. **I-080: Prompt deduplication** — Override to remove duplicated instructions

### Prompt Analysis Agent Findings (25 findings, PA-001..PA-025)

New issues not already in registry:

| ID | From | Issue | Fix | Severity |
|----|------|-------|-----|----------|
| I-090 | PA-004 | Plan mode injects "supercedes any other instructions" — overrides CLAUDE.md | FX-O/FX-B | HIGH |
| I-091 | PA-007 | 25-word/100-word hard limits suppress inter-tool reasoning | FX-O | HIGH |
| I-092 | PA-009 | No context decay awareness in system prompt | FX-O | HIGH |
| I-093 | PA-010 | No error recovery strategy — model loops on failing approaches | FX-O | MEDIUM |
| I-094 | PA-012 | No explicit instruction priority hierarchy | FX-O | HIGH |
| I-095 | PA-013 | Git Safety Protocol 500 tokens of "NEVER" language | FX-O | MEDIUM |
| I-096 | PA-021 | System-reminder text duplicated after EVERY tool result | FX-B | HIGH |
| I-097 | PA-024 | Our overrides may land after dynamic boundary — breaking cache | FX-B audit | HIGH |
| I-098 | PA-022 | Anti-distillation fake tools injected server-side (unmitigable) | None | MEDIUM |

Key reinforcements from prompt analysis:
- PA-001 confirms our brevity override approach but notes residual bias
- PA-002 confirms governance patches fix the foundational problem
- PA-006 notes our tone override is good but missing POSITIVE reasoning encouragement
- PA-015 confirms our env vars are the correct mitigation for adaptive thinking

**NEW CRITICAL FINDING: PA-024 / I-097 — Dynamic boundary audit.**
If our governance prompt overrides land AFTER the `SYSTEM_PROMPT_DYNAMIC_BOUNDARY`
marker, they bust the prompt cache on every turn. This needs immediate verification.

---

## Final Issue Count

| Source | Findings | New Issues Added |
|--------|----------|-----------------|
| Binary analysis | GP3 (12 divergences) | I-001..I-012 (12) |
| Self-analysis | 20 friction points | I-020..I-034 (15) |
| Session config | 4 flag issues | I-040..I-043 (4) |
| Missing caps | 5 gaps | I-050..I-054 (5) |
| Friction agent | 41 findings | I-060..I-071 (12 new) |
| Introspective probe | 5+1 findings | I-080..I-084 (5) |
| Prompt analysis agent | 25 findings | I-090..I-098 (9 new) |
| **TOTAL** | **112 findings** | **62 registered issues** |

## Final Priority Ranking (all sources integrated)

### P0 — Systemic Leverage Points

| Rank | ID | Issue | Why P0 |
|------|-----|-------|--------|
| 1 | I-064 | Max effort + disable adaptive thinking | Largest quality lever. Already in env vars — verify working |
| 2 | I-040 | quiet_salted_ember investigation | One flag unlocks 7 prompt improvements |
| 3 | I-097 | Dynamic boundary audit for overrides | Our patches may be BREAKING prompt cache |
| 4 | I-006 | CLAUDE.md authority | DONE (governance patches) |
| 5 | I-042 | REPL/Tungsten injection | DONE (governance patches) |

### P1 — New Prompt Overrides (low effort, high return)

| Rank | ID | Issue | Override Target |
|------|-----|-------|-----------------|
| 6 | I-054/G1 | Communication Style section | Replace "Output efficiency" with G1 text |
| 7 | I-003/P1 | Misconception correction | Add to "Doing tasks" |
| 8 | I-004/P2 | False-claims mitigation | Add to "Doing tasks" |
| 9 | I-005/P4 | Thoroughness counterweight | Add to "Doing tasks" |
| 10 | I-092/PA-009 | Context decay awareness | New section addition |
| 11 | I-094/PA-012 | Explicit priority hierarchy | New section addition |

### P2 — Strategic (medium effort)

| Rank | ID | Issue | Approach |
|------|-----|-------|----------|
| 12 | I-041/F1 | VERIFICATION_AGENT | Flag manipulation or injection |
| 13 | I-090/PA-004 | Plan mode authority override | New override or binary patch |
| 14 | I-065/F-033 | Silent model downgrade detection | Hook |
| 15 | I-070/F-040 | GrowthBook flag monitoring | Hook |
| 16 | I-096/PA-021 | System-reminder deduplication | Binary patch |

### P3 — Refinements

| Rank | ID | Issue | Approach |
|------|-----|-------|----------|
| 17 | I-051/G2 | Numeric length anchors | Prompt override |
| 18 | I-081 | Bash prohibition reframe | Prompt override |
| 19 | I-093/PA-010 | Error recovery strategy | Prompt override |
| 20 | I-095/PA-013 | Git Safety simplification | Prompt override |

## Next Steps

1. ~~Integrate all agent research~~ DONE
2. ~~Integrate introspective probe results~~ DONE
3. ~~Cross-reference all sources~~ DONE
4. ~~Prompt analysis agent~~ DONE
5. **P0-3 (I-097): Audit where our overrides land relative to dynamic boundary**
6. **P0-2 (I-040): Investigate quiet_salted_ember activation — find clientDataCache**
7. Map to specific Phase 3a implementation plan
8. Write new prompt overrides for P1 items (6 overrides)
9. Present findings to user for phase scoping decision
