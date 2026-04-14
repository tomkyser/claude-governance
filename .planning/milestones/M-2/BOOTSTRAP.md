# Milestone 2 Bootstrap — Paste After Compaction

---

Read these files in order:

1. `.planning/VISION.md` — Project intent
2. `.planning/milestones/M-2/IMPACT.md` — Milestone scope
3. `.planning/milestones/M-2/2c-gaps-1/PLANNING.md` — **Active phase plan (11 tasks, approved)**
4. `.planning/milestones/M-2/2c-gaps-1/RESEARCH.md` — Full gap analysis (10 gaps, G29-G39)
5. `.planning/milestones/M-2/2c-gaps-1/CONTEXT.md` — Architectural facts (vault, backup, FS9, dual detection)
6. `.planning/milestones/M-2/2c-gaps-1/TASKS.md` — Task checklist (T1 done, T2-T11 pending)

Quick verify:
```bash
cd /Users/tom.kyser/dev/claude-code-patches/claude-governance
pnpm build && node dist/index.mjs check
```

**Phase:** 2c-gaps-1 — Tungsten + Governance Critical Gaps
**Status:** IN_PROGRESS — T1 (crash fix) committed as adc62cd. Plan approved. T2-T11 pending.
**19/19 SOVEREIGN** on CC 2.1.101

**Execution order (approved):**
1. **T6** — FS9 bashProvider investigation. Read `/Users/tom.kyser/dev/cc-source` to understand what bashProvider does with FS9's return value. Findings inform whether FS9 needs code changes.
2. **T2 + T3** — Wire binary vault into restore + apply flows. `src/installationBackup.ts` and `src/patches/index.ts`. Virgin vault (`binaryVault.ts`) has `downloadVirginBinary()`, `createWorkingCopy()`, `deployToInstallPath()` but is currently disconnected from apply/restore.
3. **T4 + T5** — Verification honesty: tiered reporting (present vs functional), probe expansion (honest labeling, REPL probe).
4. **T7 + T8** — Dual detection docs + tungsten.js code fixes (create guard, kill cleanup, name validation).
5. **T9-T11** — Build/verify, testing guide, housekeeping.

**Key files:**
- `src/installationBackup.ts` — restore flow (T2)
- `src/patches/index.ts` — apply flow, check command, probe (T3, T4, T5)
- `src/binaryVault.ts` — virgin vault (T2, T3 depend on this)
- `data/tools/tungsten.js` — tool code fixes (T8)
- `/Users/tom.kyser/dev/cc-source` — CC leaked source for bashProvider investigation (T6)

**Critical context:**
- `--restore` currently restores from backup file WITHOUT contamination check — can restore patched binary silently
- Apply flow deletes contaminated backup then falls back to installed binary (not vault) — if installed binary also patched, patches skip but backup is gone
- Virgin vault at `~/.claude-governance/binaries/virgin-{version}.bin` exists and is locked immutable but NEVER used by apply or restore
- Functional probe only tests Ping, reports "tools functional" — REPL and Tungsten have zero probing
