# Milestone 3 Bootstrap — System Prompt Control

---

Read these files in order:

1. `.planning/VISION.md` — Project intent
2. `.planning/milestones/M-3/IMPACT.md` — Milestone scope
3. `docs/README.md` — Developer docs index (10 verified docs covering full architecture)
4. `extracted-prompts/IMPROVEMENT-FRAMEWORK.md` — Issue registry and priority ranking
5. `.planning/ROADMAP.md` — Investigation Registry (top of body) + full phase history

Quick verify:
```bash
cd /Users/tom.kyser/dev/claude-code-patches/claude-governance
pnpm build && node dist/index.mjs check
```

**Status:** P0 investigations COMPLETE — next: quiet_salted_ember binary patch + P1 prompt overrides
**Previous:** GP3 COMPLETE (112 findings, 62 issues), P0 investigations COMPLETE (4/4)
**Last completed:** P0 investigations at `8e1a050`
**Baseline:** 20/20 SOVEREIGN on CC 2.1.101

## P0 Investigation Results (COMPLETE)

### I-040: quiet_salted_ember — ACTIVATION PATH FOUND
- `wJH()` checks `w_().clientDataCache?.quiet_salted_ember === "true"`
- `clientDataCache` lives in `~/.claude.json` (the global config file, read by `w_()` = `getGlobalConfig()`)
- Currently empty `{}` — populated by bootstrap function `ms7()` from Anthropic API
- Server returns `null` for external users → `clientDataCache` stays empty
- Manual write to `~/.claude.json` works BUT `ms7()` overwrites on next bootstrap (deep equality check)
- **Fix needed:** Binary patch `ms7()` to skip `clientDataCache` overwrite, OR pre-session injection via launch wrapper
- **Bonus:** `coral_reef_sonnet` uses same mechanism (gates Sonnet 4.6 extended context)

### I-097: Dynamic boundary — NON-ISSUE (CLOSED)
- Our prompt overrides target static sections assembled BEFORE `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__`
- Assembly order: `[bk5, Ik5, xk5, uk5, mk5, gk5, ...HMH..., ...dynamic]`
- Our overrides replace text within static section functions (xk5, etc.) → cached correctly
- wJH-gated sections (Communication Style, numeric anchors) are in dynamic array → no conflict

### I-064: Thinking depth env vars — VERIFIED (CLOSED)
- `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1` confirmed: skips `{type:"adaptive"}` thinking
- `CLAUDE_CODE_EFFORT_LEVEL=max` confirmed: `_wH()` reads it, sets max effort
- Both present in `~/.claude/settings.json` via env-flags module

### I-041: VERIFICATION_AGENT — NOT IN BINARY (CLOSED)
- `tengu_hive_evidence` has ZERO occurrences in v2.1.101 binary
- VERIFICATION_AGENT exists only as `querySource` string (telemetry), not a gated feature
- No activation path exists in current binary version

## Next Session Work

### Priority 1: quiet_salted_ember Binary Patch
The highest-leverage single action. Patch `ms7()` bootstrap function to preserve
our `clientDataCache` values. This unlocks 7 prompt improvements already compiled
into the binary without needing individual prompt overrides:
- Communication Style (replaces Output Efficiency)
- Numeric length anchors (≤25/≤100 words)
- Comment discipline (default no-comments)
- Exploratory question protocol (2-3 sentences)
- Condensed Doing tasks section
- Session guidance compression

### Priority 2: P1 Prompt Overrides (6 new)
These address gaps that quiet_salted_ember does NOT cover (DCE'd ant-only text):
- **I-003: Misconception correction** — "If you notice the user's request is based on a misconception, say so"
- **I-004: False-claims mitigation** — "Report outcomes faithfully..."
- **I-005: Thoroughness counterweight** — "Before reporting a task complete, verify it actually works"
- **I-092: Context decay awareness** — New section
- **I-094: Priority hierarchy clarification** — New section
- **I-054: Communication Style** — Only needed if quiet_salted_ember patch fails

### Developer Documentation
Complete verified docs now in `/docs/` (10 files, 1625 lines):
- architecture, binary-patching, prompt-overrides, tool-injection
- verification-engine, session-hooks, configuration, cli-reference, env-flags

### M-2 retro recommendations (updated):
- ~~Phase 3prelim (codebase reorganization)~~ DONE
- ~~GP3 (Ant vs External divergence)~~ DONE
- ~~P0 investigations~~ DONE
- Budget for prompt testing infrastructure
- Hooks module (G21) before public release
- Maintain gap phase pattern
