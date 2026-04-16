# Milestone 3.5 Bootstrap — Pattern Migration for esbuild CJS Output

---

**Status:** ACTIVE — Repack pipeline working. Pattern migration needed for 13 governance patches.
**Baseline:** 16/29 SOVEREIGN (binary runs: `2.1.101 (Claude Code)`)
**Next Task:** P1.5 — Migrate governance patch regexes to match esbuild-bundled CJS output

## CRITICAL: Read This First

1. `.planning/journals/session-2026-04-16-g.md` — **Complete fix documentation + verification**
2. `.planning/FINDINGS.md` → F31 — **Bun binary format, esbuild transform, LIEF bug**
3. `.planning/milestones/M-3.5/3.5d-message-components/TASKS.md` — **Current task list**
4. `claude-governance/src/patches/governance/` — **14 per-patch files with regex patterns**

## Current State

- **Binary**: Patched 2.1.101, runs cleanly (`--version` → `2.1.101 (Claude Code)`)
- **Backup**: Clean binary at `~/.claude-governance/native-binary.backup` (201MB)
- **Shim**: Bypassed (`~/.claude-governance/bin/claude.bak`) — restore after pattern migration
- **Code**: HEAD at 7e540a9, clean working tree
- **Build**: Clean at committed HEAD
- **esbuild output**: `~/.claude-governance/native-claudejs-patched.js` (17.1M chars, 334k lines)
- **Original bytecode stubs**: `~/.claude-governance/native-claudejs-orig.js`

## The Pipeline (How It Works Now)

1. `applyCustomization()` extracts binary JS, detects `// @bun @bytecode` prefix
2. `fetchNpmSource()` downloads npm package, runs esbuild ESM→CJS transform
3. esbuild's empty `var import_meta = {};` is replaced with URL polyfill
4. CJS content wrapped in `(function(exports, require, module, __filename, __dirname) {...})`
5. Governance patches applied to the CJS-wrapped content (regex match/replace)
6. `repackNativeInstallation()` repacks with `clearBytecode=true`
7. `rebuildBunData()` zeros bytecode, sets `encoding=0`
8. `repackMachO()` raw-overwrites section content (bypasses LIEF bug)
9. Binary re-signed with ad-hoc codesign

## The Problem: 13 Pattern Mismatches

The governance patches in `src/patches/governance/` use regex patterns derived from
Bun's minified output (the bytecode stubs). The esbuild-bundled CJS output has:

- **Different variable names**: esbuild generates its own identifiers
- **Different statement ordering**: `require()` calls at module top, not inline
- **Different code structure**: esbuild's CJS wrapper patterns differ from Bun's minifier
- **Expanded code**: Less aggressive minification → more whitespace and named vars

### The 13 Failing Patches

| # | Patch | File | Notes |
|---|-------|------|-------|
| 1 | Tool Registry Injection | toolInjection.ts | Injects tools into CC's registry |
| 2 | REPL Tool Guidance | toolInjection.ts | Adds REPL description to system prompt |
| 3 | Tungsten bashProvider | toolInjection.ts | Activates tmux for bash tool |
| 4 | Tungsten Live Panel | toolInjection.ts | Adds panel to TUI |
| 5 | Tungsten Tool Guidance | toolInjection.ts | Adds Tungsten description |
| 6 | Channel Dialog Bypass | channelDialogBypass.ts | Auto-accepts dev channel |
| 7 | Tool Visibility Patch | toolVisibility.ts | Shows hidden tool use |
| 8 | Client Data Cache | clientDataCache.ts | Preserves flag values |
| 9 | Thinking Dispatch | thinkingDispatch.ts | Dispatches thinking to TUI |
| 10 | Thinking Full Show | thinkingFullShow.ts | Shows full thinking blocks |
| 11 | Thinking Assistant Guard | thinkingAssistantGuard.ts | Removes assistant type filter |
| 12 | Glob/Grep Exclusion | (check registry) | Removes .gitignore exclusions |
| 13 | Explore override | (check registry) | Prompt override for explore mode |

### Migration Strategy

For each patch:
1. **Find the equivalent code in esbuild output** — Search for string literals, API calls,
   or structural patterns that uniquely identify the target code
2. **Write a new regex** that matches the esbuild structure
3. **Make it resilient** — Match on stable features (string constants, method names, API
   patterns) rather than variable identifiers that esbuild might rename
4. **Test** — Apply + check + verify binary runs

### Key Files for Pattern Work

- `claude-governance/src/patches/governance/` — 14 per-patch files
- `claude-governance/src/patches/index.ts` — Apply pipeline
- `~/.claude-governance/native-claudejs-patched.js` — Current esbuild output (inspect patterns)
- `~/.claude-governance/native-claudejs-orig.js` — Original bytecode stubs (for reference)

### How to Find Patterns in esbuild Output

The esbuild CJS output at `~/.claude-governance/native-claudejs-patched.js` is 17M chars.
Use grep/search for:

- **String literals** (most stable): `"tengu_harbor"`, `"clientDataCache"`, `"thinkingMessage"`
- **API calls**: `createRequire`, `getClaudeAIOAuthTokens`, `isChannelsEnabled`
- **Function signatures**: Parameter patterns that are structurally unique
- **The existing patch replacement text**: If the patch injects text, search for where
  the injection point's surrounding code appears in the esbuild output

## Build & Verify

```bash
cd claude-governance && pnpm build
/bin/cp ~/.claude-governance/native-binary.backup ~/.local/share/claude/versions/2.1.101
node claude-governance/dist/index.mjs -a
~/.local/share/claude/versions/2.1.101 --version   # Must show "2.1.101 (Claude Code)"
node claude-governance/dist/index.mjs check         # Target: 27/29+ SOVEREIGN
```

## After Pattern Migration

1. T11: Verify thinking blocks visible in live TUI
2. SOVEREIGN check (target 27/29+)
3. Gap analysis for P1/P1.5
4. Restore governance shim: `mv ~/.claude-governance/bin/claude.bak ~/.claude-governance/bin/claude`
5. Housekeeping + bootstrap for P2

## Technical Reference

### esbuild Transform Details
- esbuild v0.28.0, flags: `--bundle --format=cjs --platform=node`
- Input: 13.5MB ESM cli.js from npm
- Output: ~17MB CJS (esbuild adds require() wrappers, helper functions)
- `var import_meta = {};` → replaced with `{ url: require("url").pathToFileURL(__filename).href }`
- Top-level await handled by esbuild's async wrapper

### Bun Module Format
- encoding: 0=source, 1=bytecode. clearBytecode sets to 0.
- moduleFormat: 0=CJS, 2=ESM. We keep existing value.
- Only module 0 (cli.js) has bytecode. Other 10 modules unaffected.

### Raw Overwrite Path
- Triggered when `sizeDiff <= 0` (new data fits in original section)
- Reads full binary, overwrites at `bunSection.offset`, zero-fills remainder
- LIEF Mach-O section header still says 128MB — `hasBunTrailerAt()` handles this
- Bypasses LIEF's broken `section.content =` assignment for Mach-O
