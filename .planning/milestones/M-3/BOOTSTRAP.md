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

**Status:** REPL-fixes COMPLETE — next: quiet_salted_ember binary patch + P1 prompt overrides
**Previous:** GP3 COMPLETE, P0 investigations COMPLETE, PM1 COMPLETE, REPL-fixes COMPLETE
**Last completed:** REPL-fixes at `1366176`
**Baseline:** 20/20 SOVEREIGN on CC 2.1.101

## What Was Done This Session (REPL-fixes)

### Fixes Shipped (7 files, commit `1366176`)
1. **Read handler context override** — removes CC's `fileReadingLimits` (maxSizeBytes=256KB, maxTokens=25K) by passing `{maxSizeBytes: 10MB, maxTokens: Infinity}` in the context. Files up to 10MB now read directly into REPL VM memory. Agent-chunked fallback if nativeRead fails.
2. **Agent canUseTool fix** — passes permissive `canUseTool` callback instead of `undefined`. Fixes "O is not a function" crash when agents spawned from REPL try to use tools.
3. **Agent text extraction** — `extractAgentText()` parses JSON metadata and extracts `content[0].text` instead of returning raw JSON blob.
4. **Glob absolute paths** — `nodePath.resolve()` on all rg output. Paths from `glob()` are directly usable by `read()`.
5. **Async SyntaxError fix (F14)** — `err.name === 'SyntaxError'` string check instead of `instanceof` (cross-realm VM boundary issue).
6. **maxReadFileSize config** — configurable threshold (256KB default) in `config.json` under `repl.maxReadFileSize`.
7. **Prompt updates** — read/glob docs and error recovery guidance updated in both coexist and replace prompts.

### Key Discoveries (F25-F28)
- **F25:** Bash tool maxResultSizeChars=30,000 (hard cap). Read=Infinity. Agent=100,000.
- **F26:** Read tool's `fileReadingLimits` overridable via context object. Env var `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS` also overrides. GrowthBook flag `tengu_amber_wren`.
- **F27:** Agent canUseTool crash root cause — `undefined` for 3rd arg of `tool.call()`. Leaked source: `toolExecution.ts:1207` invokes `canUseTool(...)` unconditionally.
- **F28:** Agent tool returns `{status, content: [{type:"text", text:"..."}], ...}` as JSON string. Must parse and extract `.content[0].text`.

### Verified Results
| File Size | Content | Path |
|-----------|---------|------|
| 19B | Full | nativeRead |
| 289KB | Full (288,889 chars) | context override |
| 1.2MB | Full (10,000 lines) | context override |
| 3.4MB | Full (3,423,889 chars) | context override |
| Agent bash test | "AGENT_TOOLS_WORK" | canUseTool fix |
| Async/await | ASYNC_99 | SyntaxError fix |
| Glob paths | Absolute | nodePath.resolve |

### Full 12-layer verification passed — zero degradations from prior work.

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

### Tungsten Statusline Issue
User reported not seeing the Tungsten status panel during this session despite
an active Tungsten session. The panel injection patch is verified present
(`check` shows "present (requires live session to verify rendering)") but the
actual rendering may have a bug. Investigate in a live TUI session.

### M-2 retro recommendations (updated):
- ~~Phase 3prelim (codebase reorganization)~~ DONE
- ~~GP3 (Ant vs External divergence)~~ DONE
- ~~P0 investigations~~ DONE
- Budget for prompt testing infrastructure
- Hooks module (G21) before public release
- Maintain gap phase pattern
