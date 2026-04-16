# Milestone 3.5 Bootstrap — Wire Inter-Session Communication

---

**Status:** Phase 3.5b — Research + Planning COMPLETE, Act phase next
**Baseline:** 22/22 SOVEREIGN on CC 2.1.101
**Previous milestone:** M-3 (System Prompt Control) — COMPLETE

## Read These Files (In This Order)

1. `.planning/milestones/M-3.5/3.5b-session-registry/PLANNING.md` — **THE PLAN. Architecture, waves, file map.**
2. `.planning/milestones/M-3.5/3.5b-session-registry/TASKS.md` — **Task breakdown (T1-T9), 5 waves**
3. `.planning/milestones/M-3.5/3.5b-session-registry/CONTEXT.md` — Shared state, dynamo source mapping
4. `.planning/milestones/M-3.5/3.5b-session-registry/RESEARCH.md` — 12 findings (R-1 through R-12)
5. `.planning/milestones/M-3.5/3.5a-wire-mcp-server/HANDOFF.md` — What 3.5a delivered (the MCP server you're extending)
6. Read the existing Wire source: `claude-governance/src/wire/{types.ts, protocol.ts, server.ts}`
7. `.planning/ROADMAP.md` — M-3.5 section (scan only — PLANNING.md has the detail)

## What You're Building

Cross-session message routing for Wire. Session A calls `wire_send(to=B)` → message
routes through a shared HTTP relay → Session B receives as `<channel>` notification.

### Architecture (from PLANNING.md)

```
Session A                           Session B
┌─────────────┐                     ┌─────────────┐
│ Claude Code  │                     │ Claude Code  │
│   ↕ stdio    │                     │   ↕ stdio    │
│ Wire MCP Srv │──── HTTP ────┐  ┌───│ Wire MCP Srv │
│  (poll loop) │              │  │   │  (poll loop) │
└─────────────┘              ↓  ↓   └─────────────┘
                     ┌──────────────┐
                     │  Wire Relay  │
                     │  (HTTP srv)  │
                     │  port 9876   │
                     └──────────────┘
```

### Execution Waves

| Wave | Tasks | Files |
|------|-------|-------|
| 1 | T1: types, T2: registry, T3: queue | `types.ts` (mod), `registry.ts` (new), `queue.ts` (new) |
| 2 | T4: relay server | `relay-server.ts` (new) |
| 3 | T5: relay client, T6: lifecycle | `relay-client.ts` (new), `relay-lifecycle.ts` (new) |
| 4 | T7: server integration | `server.ts` (mod) |
| 5 | T8: build pipeline, T9: verify | `tsdown.wire.config.ts` (mod) |

### Key Architecture Decisions (already made)
- D-01: HTTP relay (node:http, no external deps)
- D-02: Long-polling for delivery (25s timeout)
- D-03: Relay auto-started by first MCP server as detached child
- D-04: File coordination: `~/.claude-governance/wire/{relay.pid, relay.port}`
- D-05: Port 9876 default, fallback 9877-9886
- D-06: In-memory messages only
- D-07: New `wire_discover` tool for peer discovery

### Dynamo Source Location (port-from reference)
`/Users/tom.kyser/Library/Mobile Documents/com~apple~CloudDocs/dev/dynamo/core/services/wire/`
- `registry.cjs` (238 lines) → `src/wire/registry.ts`
- `queue.cjs` (141 lines) → `src/wire/queue.ts`
- `relay-server.cjs` (315 lines) → `src/wire/relay-server.ts`
- `transports/relay-transport.cjs` (209 lines) → `src/wire/relay-client.ts`

### Build
- `pnpm build:wire` → produces `data/wire/wire-server.cjs` + `data/wire/wire-relay.cjs`
- `pnpm build` → full project build (typecheck + all artifacts)
- `pnpm lint` → typecheck

## Begin Execution

Start with Wave 1 (T1, T2, T3). Read the dynamo source files listed above before
porting — they are the reference implementations. Check task status via TaskList
to see what's already done (in case work started before compaction).
