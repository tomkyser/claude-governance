# Milestone 3.5 — Impact Analysis

Last updated: 2026-04-16

### Phase 3.5d Impact — Message Components Control

- **Scope expansion**: Originally "prompt overrides teaching Wire usage." Now includes
  full message component control, thinking restoration, tool visibility, and bytecode
  repack pipeline. The largest engineering effort in the project so far.
- **Cross-milestone**: Extends M-2 tool injection (rendering) and M-3 prompt overrides (UI).
- **Blocking**: Blocks 3.5e (coordinate skill) — model must see its own tool output.
- **User impact**: HIGH — restores transparency that Anthropic intentionally removed.

### Repack Pipeline Impact (sessions d-g, 2026-04-16)

The Bun binary repack crash blocked ALL native binary governance patches (11 of 27
SOVEREIGN). Four sessions of investigation revealed a three-layer incompatibility:
bytecode compilation → ESM source → CJS wrapper requirements. Fix required:

1. **New pipeline component**: fetchNpmSource() with esbuild ESM→CJS transform
2. **Binary format work**: clearBytecode pipeline, encoding override, raw overwrite
3. **Infrastructure fix**: BUN_TRAILER validation for zero-padded section extraction
4. **Pattern migration needed**: 13 governance patches have regex patterns written
   against the original Bun-minified output that don't match esbuild's CJS output

**Strategic implications**:
- The native binary path is now future-proofed against bytecode compilation
- If Anthropic stops publishing npm packages, we'll need an alternative ESM source
- esbuild version changes could shift variable names — patterns must be resilient
- The raw overwrite path in repackMachO is the reliable Mach-O write strategy going forward

### Phase 3.5d Task Insertion — Pattern Migration

A new task block (P1.5) has been inserted between P1 (Thinking Restoration) and P2
(Override System) to handle regex pattern migration. All 13 failing patterns must be
re-derived against the esbuild-bundled CJS output before P1's TUI verification can complete.
