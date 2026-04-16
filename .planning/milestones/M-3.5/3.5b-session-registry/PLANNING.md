# Phase 3.5b Planning — Session Registry & Cross-Session Routing

Date: 2026-04-16
Research: RESEARCH.md (12 findings, R-1 through R-12)
Previous: 3.5a HANDOFF.md (Wire MCP server with channel capability)

---

## Scope

Add cross-session message routing to Wire. When Claude in Session A calls
`wire_send(to=SESSION_B)`, the message reaches Session B via a shared HTTP
relay, gets delivered as a channel notification, and appears in Session B's
conversation.

### In Scope
- Session registry with disconnect buffering and TTL
- Priority queue with urgency-based delivery ordering
- HTTP relay server (Node.js, standalone CJS artifact)
- Relay client (HTTP calls from MCP server to relay)
- Relay lifecycle management (auto-start, PID coordination, health check)
- Wire MCP server integration (relay registration, poll loop, routing)
- New `wire_discover` tool for peer discovery
- Updated `wire_status` with peer information
- Build pipeline for dual artifacts (wire-server.cjs + wire-relay.cjs)

### Out of Scope (later phases)
- WebSocket upgrade for instant delivery (optimization, 3.5f or later)
- Governance shim integration (3.5c)
- Prompt overrides teaching the model Wire (3.5d)
- /coordinate skill (3.5e)
- Message persistence to disk
- Remote relay (cross-machine routing)

---

## Architecture

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
                     │  ┌────────┐  │
                     │  │Registry│  │
                     │  │Queue   │  │
                     │  │Mailbox │  │
                     │  └────────┘  │
                     └──────────────┘
```

### Message Flow (A → B)
1. Claude A calls `wire_send(to=B_ID, message="...")`
2. MCP Server A creates envelope, POSTs to relay `/send`
3. Relay stores in B's mailbox (priority-ordered)
4. MCP Server B receives message from `GET /poll` response
5. MCP Server B sends `notifications/claude/channel` to CC
6. Claude B sees `<channel source="wire" ...>` message

### Relay Lifecycle
- First MCP server to start checks `~/.claude-governance/wire/relay.pid`
- If no relay running: spawns relay as detached child process
- Relay writes its port to `relay.port` file
- Subsequent MCP servers read port file, connect to existing relay
- Relay self-terminates after 5 min with no registered sessions

---

## Execution Waves

### Wave 1: Foundation Types + Registry + Queue (3 files)
No external dependencies. Can be built and unit-tested in isolation.

| File | Source | Description |
|------|--------|-------------|
| `src/wire/types.ts` | Modify existing | Add RegistryEntry, RelayConfig, PollResponse, DiscoverResult |
| `src/wire/registry.ts` | Port dynamo registry.cjs | Session tracking, TTL disconnect buffering, EventEmitter |
| `src/wire/queue.ts` | Port dynamo queue.cjs | Urgency-based priority queue |

### Wave 2: Relay Server (1 file)
Depends on Wave 1 types. Standalone Node.js HTTP server.

| File | Source | Description |
|------|--------|-------------|
| `src/wire/relay-server.ts` | Port dynamo relay-server.cjs | HTTP endpoints: register, unregister, send, poll, sessions, health |

### Wave 3: Relay Client + Lifecycle (2 files)
Depends on Wave 1 types. Client-side relay integration.

| File | Source | Description |
|------|--------|-------------|
| `src/wire/relay-client.ts` | Port dynamo relay-transport.cjs | HTTP client: register, send, poll loop, disconnect |
| `src/wire/relay-lifecycle.ts` | New | PID file management, auto-start relay, health check |

### Wave 4: Server Integration (1 file)
Depends on Waves 1-3. Wires everything together.

| File | Source | Description |
|------|--------|-------------|
| `src/wire/server.ts` | Modify existing | Add relay startup, registration, poll loop, wire_discover tool, routing |

### Wave 5: Build + Verify (1 file)
Depends on all source files existing.

| File | Source | Description |
|------|--------|-------------|
| `tsdown.wire.config.ts` | Modify existing | Dual entry points: wire-server + wire-relay |

---

## Open Questions Resolved

| Question | Decision | Rationale |
|----------|----------|-----------|
| Relay idle timeout | 5 min | Long enough for session restarts, short enough to clean up |
| Heartbeat protocol | Poll as implicit heartbeat | lastSeen updated on each poll — no separate heartbeat needed |
| Max sessions | 50 | Safety limit, practically unlikely to exceed 10 |
| Message persistence | In-memory only | Messages are ephemeral; disk adds complexity for no gain in 3.5b |
| Relay logging | File-based: wire/relay.log | Detached process can't use stdout; file log aids debugging |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Port 9876 in use | Low | Low | 10-port fallback range |
| Relay crash | Medium | Medium | MCP server detects via health check, auto-restarts |
| Race condition on startup | Low | Low | PID file + EADDRINUSE detection |
| Long-poll timeout mismatch | Low | High | 25s poll < 30s Node default |
| tengu_harbor disabled | Low | Critical | Documented as known risk (3.5c mitigation) |

---

## Verification Plan

1. **Unit: Registry** — register, lookup, disconnect, reconnect, TTL expiry, buffer
2. **Unit: Queue** — enqueue/dequeue ordering, depth limits, flush
3. **Integration: Relay server** — start, register session, send message, poll, health
4. **Integration: MCP server + relay** — auto-start relay, register, send, receive
5. **E2E: Two sessions** — Session A sends to B, B receives as channel notification
6. **Build: Dual artifacts** — wire-server.cjs and wire-relay.cjs both build clean
7. **Typecheck: Full project** — `pnpm lint` passes
