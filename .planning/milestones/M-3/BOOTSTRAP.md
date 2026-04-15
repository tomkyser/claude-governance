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

**Status:** Phase 3a COMPLETE — next: determine Phase 3b scope
**Previous:** GP3 COMPLETE, P0 COMPLETE, PM1 COMPLETE, REPL-fixes COMPLETE, Phase 3a COMPLETE
**Last completed:** Phase 3a at `ac69ab6`
**Baseline:** 21/21 SOVEREIGN on CC 2.1.101

## What Was Done This Session (Phase 3a)

### quiet_salted_ember Binary Patch (PATCH 12, commit `ac69ab6`)
Surgically removed `clientDataCache` from ms7() bootstrap function — three edits:
1. `let _=H.client_data??null,` — dead variable removed
2. `Pj(O.clientDataCache,_)&&` — comparison removed from deep-equal chain
3. `clientDataCache:_,` — field removed from p_() config write callback

Combined with writing `{quiet_salted_ember:"true", coral_reef_sonnet:"true"}` to
`~/.claude.json` during `apply`, this unlocks:
- 7 wJH-gated prompt sections (Communication Style, numeric anchors, comment
  discipline, exploratory questions, condensed Doing tasks, condensed Using your
  tools, session guidance)
- coral_reef_sonnet (Sonnet 4.6 1M context window)

### P1 Prompt Overrides (5 DCE'd ant-only texts injected)
Added to `system-prompt-doing-tasks-ambitious.md` override:
- **I-003:** Misconception correction — "You're a collaborator, not just an executor"
- **I-004:** False-claims mitigation — "Report outcomes faithfully"
- **I-005:** Thoroughness counterweight — "Before reporting a task complete, verify it actually works"
- **I-092:** Context decay awareness — "Re-read after 10+ tool calls"
- **I-094:** Priority hierarchy — "CLAUDE.md wins over system prompt"

### Issues Closed (12 total)
I-040, I-054, I-001, I-003, I-004, I-005, I-051, I-052, I-053, I-091, I-092, I-094

### Runtime Verification (all passed)
| Test | Result |
|------|--------|
| CC launches with patched binary | OK |
| Communication Style section (wJH gate) | Active — model quotes it |
| Numeric length anchors (wJH gate) | Active — model quotes it |
| I-004 false-claims mitigation | Present in prompt |
| I-094 priority hierarchy | Present in prompt |
| REPL tool functional | OK (42*37=1554) |
| Ping tool functional | OK (governance injection confirmed) |
| 21/21 SOVEREIGN | Verified |

### New Files
- `claude-governance/src/patches/governance/client-data-cache.ts` — PATCH 12 implementation

### Key Finding
- **F29:** ms7() bootstrap patch is the highest-leverage single patch. One function edit
  + two config values unlock 12 issues worth of improvements.

## Next Session Work

### Immediate: Scope Phase 3b
Phase 3a closed 12 issues. Remaining M-3 phases (3b-3h) in ROADMAP.md are still TBD.
Review the investigation registry for what's next:
- Remaining P1: I-081 (Bash prohibition reframe) — TODO
- P2 items: I-090 (Plan mode authority), I-065 (downgrade detection), I-070 (GrowthBook monitoring), I-096 (system-reminder dedup), I-082 (permission tiering)
- P3 items: I-012 (EnterPlanMode), I-093 (error recovery), I-095 (git safety), I-080 (dedup)

### Tungsten Statusline Panel
Panel injection patch present but rendering not visually confirmed in live TUI.
Needs investigation in interactive session.

### M-2 retro recommendations (updated):
- ~~Phase 3prelim (codebase reorganization)~~ DONE
- ~~GP3 (Ant vs External divergence)~~ DONE
- ~~P0 investigations~~ DONE
- ~~Phase 3a (quiet_salted_ember + P1 overrides)~~ DONE
- Budget for prompt testing infrastructure
- Hooks module (G21) before public release
- Maintain gap phase pattern
