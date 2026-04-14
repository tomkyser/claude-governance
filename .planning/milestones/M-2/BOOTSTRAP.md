# Milestone 2 Bootstrap — Paste After Compaction

---

Read these files in order:

1. `.planning/milestones/M-2/CONTEXT.md` — Shared context (read FIRST)
2. `.planning/ROADMAP.md` — Phase status and what's next
3. `.planning/STATE.md` — Global project state
4. `.planning/FINDINGS.md` — Architecture-informing discoveries (F1-F21)
5. `.planning/milestones/M-2/handoffs/HANDOFF-PHASE-2C.md` — Phase 2c handoff

Quick verify:
```bash
cd /Users/tom.kyser/dev/claude-code-patches/claude-governance
pnpm build && node dist/index.mjs check
```

**Completed:** 2a (tool injection), 2a-gaps (12/12), 2b (clean-room REPL), 2b-gaps (14/14 + 2 post-testing fixes), 2b-gaps-2 (G15 + G9/G11 tests), 2b-gaps-3 (8/8 gaps + replace mode hardening), 2c (clean-room Tungsten — 6 deliverables, 19/19 SOVEREIGN)
**Next:** 2d (Context Snipping Tool) — needs design spec first
**Then:** Milestone 2 Retro

**Post-Tungsten gaps (from 2b-gaps-3):** G24-G28 — functional probe in replace mode, coexist nudging, oversized labeling, CLI mode switch, coexist prompt parity.

**Key context from 2c:**
- Tungsten tool at `data/tools/tungsten.js` — auto-discovered by loader
- Panel component at `data/ui/tungsten-panel.js` — deployed to `~/.claude-governance/ui/`
- FS9 patch activates bashProvider tmux passthrough
- Render tree injection at DCE'd TungstenLiveMonitor site
- Statusline TNG segment in `~/.claude/hooks/statusline-combined.cjs`
- 19/19 SOVEREIGN includes: 5 governance, 2 gates, 9 prompts, 3 tool-injection
