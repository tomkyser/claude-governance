# GP3 Research — Ant vs External Divergence Analysis

**Date:** 2026-04-14
**CC Version:** 2.1.101 (built 2026-04-10)
**Methodology:** Binary extraction + leaked source analysis + web research agents
**Key finding:** 3-tier gating system discovered — not just USER_TYPE DCE

---

## Executive Summary

The external CC binary contains a **3-tier gating system** for quality improvements:

1. **Dead-Code Eliminated (Tier 1):** `process.env.USER_TYPE === 'ant'` checks resolved
   at build time. Ant branches stripped from external binary. ~12 prompt additions and
   ~4 tools eliminated. **Replication: prompt overrides.**

2. **GrowthBook-Gated (Tier 2):** Runtime flag `quiet_salted_ember` + Opus 4.6 model
   check. Ant-quality prompt sections **present in the external binary** but disabled
   by default. Gate function `wJH()` controls activation. **Replication: flag manipulation
   OR prompt overrides.**

3. **Feature-Flagged (Tier 3):** GrowthBook flags control specific features for all
   users. VERIFICATION_AGENT gated by `tengu_hive_evidence` (default false). **Replication:
   flag manipulation OR hook-based implementation.**

**The binary is newer than the leaked source.** The source uses `USER_TYPE === 'ant'`
for all gating. The binary (v2.1.101) has migrated several sections to GrowthBook
runtime flags, indicating Anthropic is preparing to A/B test these on external users.

---

## Tier 1 — Dead-Code Eliminated Divergences

These exist only in the ant build. The bundler constant-folds `process.env.USER_TYPE === 'ant'`
to `false` and eliminates the dead code. Confirmed absent from external binary via grep.

### P1: Misconception Correction

**Source:** `prompts.ts:225-229`
```
If you notice the user's request is based on a misconception, or spot a bug adjacent
to what they asked about, say so. You're a collaborator, not just an executor—users
benefit from your judgment, not just your compliance.
```
**Binary:** 0 hits for "misconception" — confirmed DCE'd.
**Impact:** HIGH — Makes model proactive about catching user errors.
**Replication:** Prompt override. [haseebAnalysis1], [ccPrompts1]

### P2: False-Claims Mitigation

**Source:** `prompts.ts:238-241` (tagged `@[MODEL LAUNCH]: capy v8 (29-30% FC rate vs v4's 16.7%)`)
```
Report outcomes faithfully: if tests fail, say so with the relevant output; if you
did not run a verification step, say that rather than implying it succeeded. Never
claim "all tests pass" when output shows failures, never suppress or simplify failing
checks to manufacture a green result, and never characterize incomplete or broken work
as done. Equally, when a check did pass or a task is complete, state it plainly — do
not hedge confirmed results with unnecessary disclaimers.
```
**Binary:** 0 hits for "Report outcomes faithfully" — confirmed DCE'd.
**Impact:** HIGH — Prevents model from fabricating success reports.
**Replication:** Prompt override.

### P3: Comment Guidance (Strict)

**Source:** `prompts.ts:206-209`
```
Default to writing no comments. Only add one when the WHY is non-obvious: a hidden
constraint, a subtle invariant, a workaround for a specific bug, behavior that would
surprise a reader. If removing the comment wouldn't confuse a future reader, don't write it.

Don't explain WHAT the code does, since well-named identifiers already do that. Don't
reference the current task, fix, or callers... those belong in the PR description.

Don't remove existing comments unless you're removing the code they describe or you
know they're wrong.
```
**Binary:** 0 hits for DCE'd section. BUT: Tier 2 (wJH) has a shorter version present.
**Impact:** MEDIUM — Better code quality, less comment noise.
**Replication:** Prompt override (or activate Tier 2 gate).

### P4: Thoroughness Counterweight

**Source:** `prompts.ts:210-211` (tagged `@[MODEL LAUNCH]: capy v8 — un-gate once validated`)
```
Before reporting a task complete, verify it actually works: run the test, execute the
script, check the output. Minimum complexity means no gold-plating, not skipping the
finish line. If you can't verify (no test exists, can't run the code), say so explicitly
rather than claiming success.
```
**Binary:** 0 hits — confirmed DCE'd.
**Impact:** HIGH — Prevents premature "done" reports.
**Replication:** Prompt override. Note: tagged for future external rollout.

### P5: Internal Bug Reporting

**Source:** `prompts.ts:243-246`
```
If the user reports a bug, slowness, or unexpected behavior with Claude Code itself,
recommend /issue for model-related problems or /share to upload the full session
transcript. After /share produces a ccshare link, offer to post to #claude-code-feedback.
```
**Binary:** 0 hits — confirmed DCE'd.
**Impact:** LOW for external users (Slack MCP not available, internal channels).
**Replication:** Not needed. Could adapt for external feedback flow.

### P6: External "Output Efficiency" Suppression

**Source:** `prompts.ts:416-427` (external branch of `getOutputEfficiencySection`)
```
IMPORTANT: Go straight to the point. Try the simplest approach first without going
in circles. Do not overdo it. Be extra concise.

Keep your text output brief and direct. Lead with the answer or action, not the
reasoning. Skip filler words, preamble, and unnecessary transitions.
```
**Binary:** This IS the active external prompt (when Tier 2 gate is off).
**Impact:** CRITICAL — "Lead with the answer, not the reasoning" actively suppresses
the reasoning chain that catches errors. This is the single most damaging divergence.
**Replication:** Prompt override (ALREADY ADDRESSED by governance override
`system-prompt-tone-concise-output-short.md`).

### P7: External "Short and Concise" in Tone

**Source:** `prompts.ts:433-435`
```
// External only (ant gets null → omitted):
Your responses should be short and concise.
```
**Binary:** Present in external build, absent when wJH gate active.
**Impact:** MEDIUM — Compounds with P6 to produce terse, unhelpful output.
**Replication:** Prompt override (ALREADY ADDRESSED by governance override).

### P8: Ant-Only EnterPlanMode Prompt

**Source:** `EnterPlanModeTool/prompt.ts:101-163`
**Ant version:** Higher autonomy. "Skip plan mode when you can reasonably infer the
right approach." Bias toward action: "The user says 'let's do X' — just get started."
**External version:** Lower autonomy. "Prefer using EnterPlanMode for implementation
tasks unless they're simple." Seven conditions trigger planning.
**Impact:** MEDIUM — Ant users get less planning friction, more flow.
**Replication:** Prompt override for EnterPlanMode tool.

### T1: Tool Gating (DCE'd)

| Tool | Gate | Status |
|------|------|--------|
| ConfigTool | `USER_TYPE === 'ant'` | DCE'd from external |
| TungstenTool | `USER_TYPE === 'ant'` | DCE'd; **reimplemented** (Phase 2c) |
| REPLTool | `USER_TYPE === 'ant'` | DCE'd; **reimplemented** (Phase 2b) |
| SuggestBackgroundPRTool | `USER_TYPE === 'ant'` | DCE'd |

### T2: Undercover Mode (Entire Module)

**Source:** `utils/undercover.ts` — All functions gated on `USER_TYPE === 'ant'`.
External build reduces every function to trivial return.
**Impact:** N/A for external users (prevents internal codename leaks).
**Replication:** Not applicable.

### T3: Fast Mode Ant Fallback

**Source:** `utils/fastMode.ts:399-404, 431-434, 514-517`
When fast mode network check fails, ant users default to enabled. External users
default to disabled.
**Impact:** LOW — Only affects network error recovery path.
**Replication:** Not needed.

---

## Tier 2 — GrowthBook-Gated Divergences (IN THE BINARY)

**Discovery:** The external binary (v2.1.101) contains a gate function not present in
the leaked source:

```javascript
function wJH(H){
  if(!L1(H).includes("opus-4-6")) return !1;
  return w_().clientDataCache?.quiet_salted_ember === "true"
}
```

This gates on TWO conditions:
1. Model must be Opus 4.6 (`L1(H)` = `getCanonicalName(modelId)`)
2. GrowthBook flag `quiet_salted_ember` must be `"true"` in `clientDataCache`

When BOTH are true, an entirely different prompt experience activates. The text is
already compiled into the external binary — it just needs the flag.

### G1: Communication Style (replaces Output Efficiency)

**Binary location:** Function `yk5()` (line 7835-7845)
```
# Communication style
Assume users can't see most tool calls or thinking — only your text output. Before
your first tool call, state in one sentence what you're about to do. While working,
give short updates at key moments: when you find something, when you change direction,
or when you hit a blocker. Brief is good — silent is not. One sentence per update is
almost always enough.

Don't narrate your internal deliberation. User-facing text should be relevant
communication to the user, not a running commentary on your thought process.

When you do write updates, write so the reader can pick up cold: complete sentences,
no unexplained jargon. But keep it tight — a clear sentence is better than a clear paragraph.

End-of-turn summary: one or two sentences. What changed and what's next. Nothing else.

Match responses to the task: a simple question gets a direct answer, not headers and sections.

In code: default to writing no comments. Never write multi-paragraph docstrings or
multi-line comment blocks — one short line max. Don't create planning, decision, or
analysis documents unless the user asks.
```
**Impact:** CRITICAL — This is the highest-quality communication prompt Anthropic
has written. Professional, clear, preserves reasoning while staying concise. Replaces
both the ant "Communicating with the user" AND the external "Output efficiency" sections.
**Replication:** Prompt override (or flag activation).
**Not in leaked source:** This is binary-only. The source has the older "Communicating
with the user" ant version.

### G2: Numeric Length Anchors

**Binary location:** Dynamic section in `B2()` (line 7871)
```
Length limits: keep text between tool calls to ≤25 words. Keep final responses to
≤100 words unless the task requires more detail.
```
**Impact:** HIGH — Research shows ~1.2% output token reduction vs qualitative "be concise".
Quantitative anchors are more effective than qualitative instructions.
**Replication:** Prompt override (or flag activation).

### G3: Doing Tasks Rewrite (wJH variant)

**Binary location:** Function `xk5()` when `wJH()` is true. Verified against virgin binary.

| Aspect | External (wJH=false) | wJH=true (virgin-verified) |
|--------|---------------------|----------|
| Feature creep | "Don't add unrelated features... if adjacent code is broken, fix it" | "Don't add features, refactor, or introduce abstractions beyond what the task requires" |
| Error handling | "Don't add error handling for scenarios that can't happen" | Same as external (NOT "real boundaries" — that text is from governance override) |
| Comment policy | Generic "only add comments where logic isn't self-evident" | "Default to writing no comments... one-line max" |
| Abstractions | "Use judgment about when to extract shared logic" | "A one-shot operation doesn't need a helper" |
| Exploratory questions | Not present | "Respond in 2-3 sentences with a recommendation and the main tradeoff" |
| Duplicate instructions | "Do not propose changes to code you haven't read" (appears twice) | Deduplicated |
| Time estimates | "Avoid giving time estimates" | Removed |
| Failure recovery | "Diagnose why before switching tactics" | Removed |
| File creation | Verbose | "Prefer editing existing files to creating new ones" (one line) |

**CORRECTION:** Initial analysis attributed "Add error handling at real boundaries"
to this section, but virgin binary comparison confirmed that text comes from our
governance "Proportional Error Handling" override (PATCH), not from Anthropic's code.
The wJH variant uses the same external error handling text.

**Impact:** HIGH — Tighter, more professional prompt. Less noise, more signal.
**Replication:** Prompt override (complex, covers many items).

### G4: Using Your Tools Rewrite (wJH variant)

**Binary location:** Function `mk5()` when `wJH()` is true (verified against VIRGIN binary):
```
Prefer dedicated tools over Bash when one fits (Read, Edit, Write, Glob, Grep) —
reserve Bash for shell-only operations.

Use TaskCreate to plan and track work. Mark each task completed as soon as it's done;
don't batch.

[Standard parallel tool calls guidance — same as external]
```
**Impact:** MEDIUM — A leaner version of the tool section. Removes the verbose
"Do NOT use Bash..." preamble and the per-tool breakdowns. Same substance, fewer words.
**Replication:** Prompt override (low priority — our existing tool guidance is already good).
**CORRECTION:** Initial analysis attributed REPL/Tungsten guidance to this section, but
virgin binary comparison confirmed those strings come from governance PATCH 10/11, not
from Anthropic's wJH branch. The actual wJH variant is simply a condensed version of
the standard tool guidance with no REPL or Tungsten mentions.

### G5: Session-Specific Guidance (wJH variant)

When wJH is active, the session guidance section is more terse:
- Removes "If you do not understand why the user has denied a tool call" (assumes competence)
- Explore agent guidance compressed to one line
- Skill invocation guidance compressed to one line

### G6: Tone and Style (wJH variant)

When wJH is active:
- Adds "Your responses should be clear and appropriately detailed for the complexity"
  (replaces "Your responses should be short and concise")
- Removes GitHub issue/PR format guidance

---

## Tier 3 — Feature-Flagged (Both Builds, Runtime-Gated)

### F1: VERIFICATION_AGENT

**Binary:** Full implementation present (2938-token prompt). Gated by:
```javascript
feature('VERIFICATION_AGENT') &&
getFeatureValue_CACHED_MAY_BE_STALE('tengu_hive_evidence', false)
```
**Source comment:** `// 3P default: false — verification agent is ant-only A/B`
**What it does:** Spawns an adversarial subagent after 3+ file edits. Runs builds,
tests, linters, and adversarial probes. Issues PASS/FAIL/PARTIAL verdict. The model
cannot self-assign PARTIAL — only the verifier can.
**Impact:** HIGH — Prevents premature completion claims. The 152-line prompt is the
most sophisticated verification protocol in any AI coding tool.
**Replication options:**
1. Set `tengu_hive_evidence` in GrowthBook cache → activates built-in agent
2. Inject as governance subagent via tool injection framework
3. Hook-based verification (SessionStart hook adds verification instructions)
**Recommendation:** Option 1 is simplest if the feature() gate also passes. Otherwise
option 2 — extract the prompt and inject as a custom agent.

### F2: Compile-Time Feature Gates (in external binary)

| Flag | Feature | External 2.1.101 |
|------|---------|-------------------|
| VOICE_MODE | Push-to-talk voice interface | **Enabled** |
| WEB_BROWSER_TOOL | Chrome MCP integration | **Enabled** |
| FILE_PERSISTENCE | File history tracking | **Enabled** |
| MONITOR_TOOL | Background process monitoring | **Enabled** |
| ANTI_DISTILLATION_CC | Anti-training-data poisoning | **Enabled** |
| TRANSCRIPT_CLASSIFIER | Auto Mode classifier | **Enabled** |
| KAIROS | Autonomous daemon mode | Disabled |
| COORDINATOR_MODE | Multi-agent orchestration | Disabled |
| ULTRAPLAN | Remote planning mode | Disabled |
| PROACTIVE | Proactive agent actions | Disabled |
| HISTORY_SNIP | Unknown | Disabled |
| CONTEXT_COLLAPSE | Unknown | Disabled |

### F3: GrowthBook Runtime Flags (79+ tengu_* flags)

Full inventory extracted from binary (see Tier enumeration). Key flags for governance:

| Flag | Purpose | Governance interest |
|------|---------|-------------------|
| `quiet_salted_ember` | Tier 2 prompt gate (Opus 4.6) | **PRIMARY TARGET** — unlocks G1-G6 |
| `tengu_hive_evidence` | Verification agent | HIGH — enables VERIFICATION_AGENT |
| `tengu_slim_subagent_claudemd` | CLAUDE.md stripping | **ALREADY PATCHED** (set false) |
| `tengu_amber_flint` | Agent teams | Future interest |
| `tengu_onyx_plover` | Auto Dream | Future interest |
| `tengu_frond_boric` | Analytics kill switch | Could disable telemetry |

---

## Replication Strategy Matrix

| ID | Divergence | Impact | Method | Effort | Status |
|----|-----------|--------|--------|--------|--------|
| P1 | Misconception correction | HIGH | Prompt override | LOW | **NEW** |
| P2 | False-claims mitigation | HIGH | Prompt override | LOW | **NEW** |
| P3 | Comment guidance | MEDIUM | Prompt override (or G1) | LOW | **NEW** |
| P4 | Thoroughness counterweight | HIGH | Prompt override | LOW | **NEW** |
| P5 | Internal bug reporting | LOW | N/A | - | Skip |
| P6 | Output efficiency suppression | CRITICAL | Prompt override | LOW | **DONE** |
| P7 | "Short and concise" | MEDIUM | Prompt override | LOW | **DONE** |
| P8 | EnterPlanMode prompt | MEDIUM | Prompt override | MEDIUM | **NEW** |
| T1 | Tool gating (REPL/Tungsten) | CRITICAL | Clean-room reimpl | HIGH | **DONE** |
| T1 | Tool gating (Config) | LOW | Clean-room reimpl | MEDIUM | Deferred |
| T2 | Undercover mode | N/A | N/A | - | Skip |
| G1 | Communication style | CRITICAL | Prompt override OR flag | LOW | **NEW** |
| G2 | Numeric length anchors | HIGH | Prompt override OR flag | LOW | **NEW** |
| G3 | Doing tasks rewrite | HIGH | Prompt override | MEDIUM | **NEW** |
| G4 | Using your tools (leaner) | MEDIUM | Prompt override | LOW | Low priority |
| G5 | Session guidance (terse) | LOW | Prompt override | LOW | **NEW** |
| G6 | Tone and style variant | MEDIUM | Prompt override | LOW | **NEW** |
| F1 | VERIFICATION_AGENT | HIGH | Flag or injection | MEDIUM | **NEW** |
| F3 | quiet_salted_ember | CRITICAL | Flag manipulation | LOW | **NEW** |

---

## Recommendations for Phase 3a+

### Immediate (Prompt Overrides — Low Effort, High Impact)

1. **New prompt override: misconception correction (P1)** — Single bullet addition
2. **New prompt override: false-claims mitigation (P2)** — Single paragraph addition
3. **New prompt override: thoroughness counterweight (P4)** — Single bullet addition
4. **New prompt override: communication style (G1)** — Replace "Output efficiency"
   with the binary's "Communication style" section (or a derivative)
5. **New prompt override: numeric length anchors (G2)** — Single line addition

### Strategic (Flag Manipulation — Requires Research)

6. **Investigate `quiet_salted_ember` activation** — If `clientDataCache` is in
   `~/.claude.json`, we may be able to set it directly. This would unlock ALL Tier 2
   improvements without any prompt overrides. Need to verify:
   - Where is `clientDataCache` stored?
   - Does it persist across sessions?
   - Can it be set locally without server confirmation?
   - Does the `feature('VERIFICATION_AGENT')` compile-time gate pass in external builds?

7. **Investigate `tengu_hive_evidence` activation** — Same approach for VERIFICATION_AGENT.

### Phase 3a Scope (System Prompt Extraction)

With GP3 findings in hand, Phase 3a should:
1. Extract ALL system prompt text from the binary (both wJH=true and wJH=false paths)
2. Build version tracking to detect prompt changes across CC updates
3. Create governance overrides for the HIGH and CRITICAL items above

---

## Source Cross-References

| ID | Source | Findings |
|----|--------|----------|
| [haseebAnalysis1] | CC internals gist | 6 divergences documented, matches our Tier 1 |
| [ccPrompts1] | Piebald-AI system prompts | 148+ versions, CHANGELOG, prompt text |
| [ccLeaks1] | ccleaks.com | Aggregated leaks |
| [promptAnalysis1] | roman01la gist | patch-claude-code.sh targets P6/P7 |

**Binary analysis:** `/tmp/cc-extracted.js` (12,796,794 chars, v2.1.101)
**Leaked source:** `/Users/tom.kyser/dev/cc-source/collection-claude-code-source-code/`
**Key binary functions:** `wJH()` (gate), `yk5()` (anti_verbosity), `xk5()` (doing tasks),
`mk5()` (using tools), `gk5()` (tone/style), `B2()` (getSystemPrompt), `Fk5()` (session guidance)
