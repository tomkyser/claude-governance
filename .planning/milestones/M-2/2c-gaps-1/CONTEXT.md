# Phase 2c-gaps-1 Context

## Active State

- Phase COMPLETE — all 11 tasks done, 19/19 SOVEREIGN on CC 2.1.101
- Functional probes confirmed: Ping functional, REPL functional, Tungsten (live-session-only)
- Restore paths verified: clean backup path ✓, contaminated backup + vault fallback ✓
- Apply path verified: contaminated backup detected, vault recovery used ✓

## Key Architectural Facts (Updated)

**Binary vault** (`src/binaryVault.ts`):
- Virgin binaries at `~/.claude-governance/binaries/virgin-{version}.bin` -- locked immutable
- Working copies at `working-{version}.bin` -- mutable
- Exports: `downloadVirginBinary()`, `getVirginPath()`, `createWorkingCopy()`, `deployToInstallPath()`
- NOW CONNECTED to apply and restore flows (T2, T3)

**Backup/Restore** (`src/installationBackup.ts`):
- Backup at `~/.claude-governance/native-binary.backup`
- `restoreNativeBinaryFromBackup()` -- three-tier: check contamination, vault fallback, last resort installed
- `backupNativeBinary()` -- copies install path to backup

**Apply flow contamination** (`src/patches/index.ts`):
- Detects contaminated backup via `isContentPatched()`
- Deletes contaminated backup
- Falls back to vault: `downloadVirginBinary()` if needed, `createWorkingCopy()`, `deployToInstallPath()`
- Creates clean backup after vault recovery (`backupNativeBinary()`)
- Last resort: installed binary (no vault, signature detection skips applied patches)

**Dual detection** (documented G34 contract):
- Layer 1 (orchestrator): `content.includes(impl.signature)` -- fast path, skip if present
- Layer 2 (impl.fn): `runDetectors()` -- find original pattern for replacement
- Contract: signature presence == patch complete
- Risk noted: partial application silently accepted (multi-token strings mitigate)

**FS9 chain** (verified G33):
- Tungsten sets `process.env.__CLAUDE_GOVERNANCE_TMUX_ENV` after socket discovery
- FS9 patch reads env var, returns to bashProvider
- bashProvider assigns to `env.TMUX` in `getEnvironmentOverrides()` unconditionally
- Ant-only gate only guards `ensureSocketInitialized()`, not TMUX assignment

**Verification** (updated G31/G32):
- `check` shows "signatures present" language (honest about what it checks)
- Apply shows per-tool probe results: "Probe: Ping functional", "Probe: REPL functional"
- Tungsten listed as "Untested (requires live session)"

## Files Modified This Phase

- `src/installationBackup.ts` -- T2 (restore vault fallback + contamination check)
- `src/patches/index.ts` -- T3 (apply vault recovery), T4/T5 (probe honesty + REPL probe), T7 (G34 doc)
- `src/index.tsx` -- T4/T5 (per-tool probe display, check command "signatures" label)
- `src/patches/governance.ts` -- T4 (tungsten-panel passDetail honest label)
- `data/tools/tungsten.js` -- T8 (create guard G37, kill cleanup G38, name validation G39)

## Successor Work

- Phase 2d or next cycle: live session testing by user (G36 guide in RESEARCH.md)
- Roadmap items: any remaining M-2 gaps not in 2c-gaps-1 scope
