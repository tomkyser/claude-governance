# Phase 2c-gaps-1 Research — Tungsten + Governance Critical Gaps

**Date:** 2026-04-14
**Source:** ROADMAP 7-failure post-mortem, code review of tungsten.js, governance.ts, index.ts, binaryVault.ts, installationBackup.ts, tungsten-panel.js, statusline-combined.cjs

## References

- [tweakcc1] — Fork source (binary patching infrastructure)
- Phase 2c HANDOFF.md — untested items list
- ROADMAP.md L294-336 — 7 critical failures documented from prior session

## Gap Inventory

### G29: Panel Injection Infinite Re-render — FIXED

**Severity:** Critical — crashes Claude Code on launch
**Root cause:** IIFE in render tree called factory on every render, creating new component function. React error #185 (max update depth).
**Fix:** `globalThis.__tungstenPanel` caching + atomic selectors + stable doCapture callback.
**Commit:** adc62cd
**Status:** VERIFIED

### G30: --restore Restores Contaminated Backup

**Severity:** Critical — violates Non-Negotiable #1 ("Reversible")
**Location:** `src/index.tsx` handleRestoreMode() → `src/installationBackup.ts` restoreNativeBinaryFromBackup()
**Issue:** Restore reads from `NATIVE_BINARY_BACKUP_FILE` (~/.claude-governance/native-binary.backup) without checking if it's contaminated. If backup contains governance patches, user runs `--restore`, sees "Original Claude Code restored", but binary is still patched. Silent no-op.
**Root cause:** Contamination check only in apply flow, not restore flow. Virgin vault (`~/.claude-governance/binaries/virgin-{version}.bin`) exists but is never used by restore.
**Fix:** Restore must check backup for contamination. If contaminated, fall back to virgin vault binary via `deployToInstallPath()`.

### G31: SOVEREIGN Verification Is Signature-Only

**Severity:** High — false confidence
**Location:** `src/patches/index.ts` VERIFICATION_REGISTRY, `check` command
**Issue:** 19/19 SOVEREIGN means 19 signature strings exist in the extracted JS. Does not verify: panel renders, tools respond, FS9 chain works, prompts load correctly. Panel was declared "active" while crashing on launch.
**Fix:** Add functional verification tiers. Signature check = "present". Functional probe = "working". Report both.

### G32: Functional Probe Only Tests Ping

**Severity:** High — misleading "tools functional" claim
**Location:** `src/patches/index.ts` runFunctionalProbe()
**Issue:** Probe runs `claude -p "Ping marker..."` and checks if Ping tool responds. Output says "✓ Probe: tools functional" but only Ping is tested. REPL and Tungsten have zero functional probing.
**Fix:** Add REPL probe (simple expression eval) and Tungsten probe (session create/kill). Or at minimum, report "Ping functional" not "tools functional".

### G33: FS9 Inheritance Claim Unexamined

**Severity:** High — unverified feature claim
**Location:** `src/patches/governance.ts` writeTungstenFs9Patch(), `data/tools/tungsten.js` discoverSocketInfo()
**Issue:** Tungsten sets `process.env.__CLAUDE_GOVERNANCE_TMUX_ENV`. FS9 patch reads it and returns it to bashProvider. But what does bashProvider actually DO with the TMUX value? Does `cd` in Tungsten persist in subsequent Bash calls? Does `export` persist? The env var is set; the user-visible behavior is unknown.
**Investigation complete:** bashProvider.ts `getEnvironmentOverrides()` calls `getClaudeTmuxEnv()` (minified as FS9) UNCONDITIONALLY at L227, sets `env.TMUX = claudeTmuxEnv` if non-null at L232-233. The ant-only gate at L221-226 only protects `ensureSocketInitialized()` — the FS9 call and TMUX assignment are unrestricted. Our patch makes FS9 read `process.env.__CLAUDE_GOVERNANCE_TMUX_ENV` (set by our Tungsten tool after socket discovery), which flows through to ALL Bash child processes as `TMUX`.
**Result:** Feature is REAL. Enables tmux socket isolation — all `tmux` commands in Bash tool target our Tungsten socket. Does NOT propagate shell state (cd/export) between Bash calls (that's not what TMUX does). No code changes needed.
**Status:** VERIFIED — T6 complete.

### G34: Dual Already-Applied Detection

**Severity:** Medium — fragile architecture
**Location:** Orchestrator: `src/patches/index.ts` applyPatchImplementations() L245-252. Individual patches: `src/patches/governance.ts` each writeXxx() function.
**Issue:** Two layers check if a patch is applied:
1. Orchestrator checks `content.includes(impl.signature)` — if true, skips entirely
2. Individual functions run `runDetectors()` to find the original pattern — if not found, return null

These don't "disagree" in the classic sense (orchestrator short-circuits before calling functions). But risk exists: if signature is partially present (e.g., injected string without the full patch), orchestrator thinks it's done. No verification that the full patch is intact.
**Fix:** Accept this as designed (signature is intentionally chosen to be unique to the full patch). Document the contract: signature presence = patch complete. Add a comment explaining the two-layer design.

### G35: Backup Contamination Recovery Broken

**Severity:** Critical — systemic integrity failure
**Location:** `src/patches/index.ts` applyCustomization() L607-634
**Issue:** When backup is contaminated:
1. Backup deleted ✓
2. JS extracted from installed binary (may be patched) ✗
3. Patches applied (skip if already detected) 
4. Repacked into installed binary

Should instead:
1. Backup deleted ✓
2. Virgin binary obtained from vault ✓
3. JS extracted from virgin binary ✓
4. Patches applied fresh ✓
5. Repacked into installed binary ✓
**Fix:** Wire applyCustomization contamination recovery to binary vault. After deleting contaminated backup, call `createWorkingCopy(version)` → extract from working copy → patch fresh.

#

---

## G36 -- Live Session Verification Guide

**Status:** DOCUMENTED -- 2026-04-14
**Context:** Automated probes verify Ping and REPL. Tungsten requires a live CC session to verify session isolation, TMUX env propagation, and panel rendering.

### Prerequisite

System must be SOVEREIGN:
```
node dist/index.mjs check
# Expected: SOVEREIGN -- 19/19 signatures present
```

### Step 1 -- Re-apply patches (if needed)

```
node dist/index.mjs --apply
# Expected: All governance patches applied, SOVEREIGN (19/19)
# Functional probes run automatically: Ping functional, REPL functional
```

### Step 2 -- Start CC with governance wrapper

```
node dist/index.mjs launch
```

Expected: "Governance: SOVEREIGN (N/N)" then CC starts.

### Step 3 -- Create a Tungsten session

In CC:
> Use the Tungsten tool with action create, session test

Expected: Session "test" created on socket claude-{PID}.

Verify state file:
```
cat ~/.claude-governance/tungsten-state.json
# Expected: JSON with socket, serverPid, activeSession: "test"
```

### Step 4 -- Verify session isolation

In CC:
> Use Tungsten with action send, command: echo $TMUX

Expected: TMUX env var in format /path/to/socket,PID,0

Confirm this socket differs from your user tmux:
```
tmux list-sessions               # your sessions (no claude-PID socket)
tmux -L claude-{PID} list-sessions  # governance sessions (test visible)
```

### Step 5 -- Verify Bash inherits tmux env (FS9 chain)

In CC:
> Use the Bash tool to run: echo $TMUX

Expected: Same TMUX value as Step 4.

Verifies: Tungsten -> __CLAUDE_GOVERNANCE_TMUX_ENV -> FS9 patch -> bashProvider -> Bash env.

### Step 6 -- Kill and verify cleanup

In CC:
> Use Tungsten with action kill, session test

Expected: Session "test" killed. No sessions remaining.

```
cat ~/.claude-governance/tungsten-state.json 2>/dev/null || echo "State file removed (correct)"
```

### Step 7 -- Panel rendering (TUI mode only)

Run CC without -p flag (TUI mode). After creating a session, a live panel should appear at the bottom showing session name, socket, and last command output.

### Pass Criteria

| Check | Expected |
|-------|----------|
| Session isolation | Different tmux socket from user tmux |
| TMUX env in Bash | echo $TMUX returns socket path |
| State file written | tungsten-state.json exists after create |
| Kill cleans up | State file removed after kill |
| Panel visible | TUI mode shows panel after session create |
