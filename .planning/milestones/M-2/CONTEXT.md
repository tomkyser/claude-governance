# Milestone 2 Context — Native Tool Injection

**READ THIS FIRST.** Shared context for all agents working on Milestone 2.

## What We're Building

Clean-room implementations of ant-only tools (REPL, Tungsten), injected into CC's tool registry via binary patching. Users get the tools that Anthropic restricts to internal use.

**Location:** `/Users/tom.kyser/dev/claude-code-patches/claude-governance/`
**Prereqs:** M-1 retrospective high-priority fixes (version coupling, dead code cleanup)

## M-1 Foundation

| Component | Location | Notes |
|-----------|----------|-------|
| Binary patching | `src/patches/governance.ts` | Find→replace pattern, signature-based |
| Verification engine | `src/verification.ts` | `runVerification(js, registry)` — module-driven |
| Module system | `src/modules/` | GovernanceModule interface, registry pattern |
| Binary extraction | `src/nativeInstallationLoader.ts` | Extract JS from Mach-O binary |
| Unpack/repack | `src/commands.ts` | `handleUnpack()`, `handleRepack()` |

## Design Specs

- REPL: `specs/repl-clean-room.md`
- Tungsten: `specs/tungsten-clean-room.md`

## External References

- CC leaked source (tool registry, AgentTool, runAgent): `/Users/tom.kyser/dev/cc-source/`
- CC source — getAllBaseTools(): must locate in minified JS

## Current State

*To be filled in when M-2 work begins.*
