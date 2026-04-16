# Phase 3.5b Research — Session Registry & Cross-Session Routing

Date: 2026-04-16
Sources: Dynamo Wire service [dynamoWire], CC binary analysis, 3.5a handoff, official channels docs [channelsRef1]

---

## Executive Summary

Phase 3.5b adds cross-session routing to Wire. The 3.5a MCP server can send
notifications to its own CC session, but cannot reach other sessions. 3.5b
solves this with three components: a session registry (who's connected), a
priority queue (urgency-based delivery ordering), and an HTTP relay server
(the routing bridge between isolated MCP server processes).

---

## Finding R-1: MCP Server Isolation Requires a Relay

### The Problem

Each CC session spawns its own Wire MCP server as a child process with stdio
transport. The MCP server can only communicate with its parent CC session via
`notifications/claude/channel`. There is no built-in mechanism for MCP server A
to reach MCP server B.

### Why a Relay

The MCP servers are isolated Unix processes. They cannot communicate directly.
Options considered:

| Approach | Pros | Cons |
|----------|------|------|
| **Shared HTTP relay** | Simple, works with node:http, stateless polling | Extra process, latency |
| **Unix domain sockets** | Low latency, no port allocation | Each MCP must know peers' socket paths, complex |
| **Shared filesystem** | No daemon needed | Polling latency, file locking complexity, no atomicity |
| **Named pipes** | Direct peer-to-peer | Requires pre-negotiated names, platform-specific |

**Decision: HTTP relay.** Same approach as dynamo. The relay is a single localhost
HTTP server. MCP servers register, send messages through it, and poll for incoming.
This is the simplest architecture that works across all platforms.

### Dynamo Validation

Dynamo's Wire uses exactly this pattern:
- `relay-server.cjs` (315 lines): Bun.serve HTTP+WebSocket server
- `relay-transport.cjs` (209 lines): HTTP client with long-poll loop
- `registry.cjs` (238 lines): In-memory session tracking with TTL
- `queue.cjs` (141 lines): Urgency-based priority queue

We port this to Node.js (replacing Bun.serve with http.createServer).

---

## Finding R-2: Node.js HTTP Server Is Sufficient

### Bun → Node Adaptation

Dynamo's relay uses `Bun.serve()` which is a Bun-specific API. Our users have
Node.js (CC ships with it / requires it for npm). The adaptation is straightforward:

| Bun API | Node.js Equivalent |
|---------|-------------------|
| `Bun.serve({ fetch, websocket })` | `http.createServer(handler)` |
| `req.json()` | `collectBody(req)` + `JSON.parse()` |
| `new Response(body, { status, headers })` | `res.writeHead(status, headers); res.end(body)` |
| `server.upgrade(req)` | Deferred to future phase (WS not needed for MVP) |
| `server.port` | `server.address().port` |
| `server.stop()` | `server.close()` |

### No External Dependencies

The relay server uses only Node.js built-ins:
- `node:http` — HTTP server
- `node:crypto` — UUID generation (if needed)
- `node:process` — Signal handling, PID

No npm packages required. The relay is a single CJS file.

---

## Finding R-3: Concurrent Polling Works with MCP stdio

### The Question

Can the MCP server simultaneously handle stdio tool calls from CC AND poll the
relay for incoming messages?

### The Answer: Yes

Node.js is event-loop driven. The MCP server's StdioServerTransport reads stdin
asynchronously. An HTTP long-poll request is just another async I/O operation.
Both can run concurrently without blocking each other.

```
Event Loop:
  ├── stdin reader (MCP protocol — tool calls from CC)
  ├── HTTP long-poll (relay → incoming messages)
  └── stdout writer (MCP protocol — notifications to CC)
```

When a poll returns messages, the MCP server sends `notifications/claude/channel`
back to CC. CC's notification handler enqueues these as `priority:"next"` in the
prompt queue — they arrive AFTER the current tool call completes, which is the
expected async behavior.

### Poll Loop Design

```
Poll timeout: 25s (under Node's default 30s socket timeout)
On success with messages: deliver via notification, immediately re-poll
On success with no messages: immediately re-poll (long-poll waited already)
On error: exponential backoff (1s, 2s, 4s, max 30s)
On AbortController signal: clean exit
```

---

## Finding R-4: Relay Lifecycle Requires File-Based Coordination

### The Problem

Multiple CC sessions may start simultaneously. Each spawns a Wire MCP server.
Only ONE relay should run. The first MCP server must start it; subsequent ones
must discover and connect to the existing one.

### Coordination Directory

`~/.claude-governance/wire/` stores relay state:

| File | Content | Purpose |
|------|---------|---------|
| `relay.pid` | PID number | Identify running relay process |
| `relay.port` | Port number | Tell MCP servers where to connect |

### Startup Flow (per MCP server)

```
1. Read relay.pid → is a relay running?
2. If PID exists, check if process is alive (kill(pid, 0))
   a. Alive: read relay.port, connect. Done.
   b. Dead: stale PID file. Clean up, proceed to step 3.
3. No relay running. Start one:
   a. Spawn relay as detached child: child_process.spawn('node', [relayPath], { detached: true, stdio: 'ignore' })
   b. child.unref() — relay survives MCP server death
   c. Wait for relay to write relay.port (poll file with 100ms interval, 5s timeout)
   d. Connect to relay
4. Register this session: POST /register
5. Start poll loop
```

### Race Condition Handling

Two MCP servers may try to start a relay simultaneously. Mitigations:
- The relay itself handles EADDRINUSE (port already bound = another relay started first)
- If spawn succeeds but relay.port doesn't appear within 5s, check relay.pid again
  (another MCP server may have won the race)
- Registration is idempotent — registering the same sessionId twice is harmless

### Shutdown Flow

MCP server exit:
1. Send POST /unregister to relay
2. If this was the last session, relay auto-exits (optional, or let it idle)

The relay can also self-terminate after a configurable idle timeout (e.g., 5 minutes
with no registered sessions).

---

## Finding R-5: Port Selection Strategy

### Default Port: 9876

Same as dynamo. Well above ephemeral range (32768+), unlikely to conflict.

### Fallback on EADDRINUSE

If 9876 is occupied, the relay tries 9877 through 9886 (10 attempts).
The actual port is written to `relay.port` for MCP servers to discover.

### Why Not Port 0 (OS-assigned)?

OS-assigned ports work but make debugging harder — you can't predict the port.
A fixed default with fallback is more predictable and debuggable.

---

## Finding R-6: Registry Design (Port from dynamo)

### Session Entry Shape

```typescript
interface RegistryEntry {
  identity: string;           // Human-readable name (e.g., "main-session")
  capabilities: string[];     // ['send', 'receive']
  status: 'active' | 'disconnected';
  connectedAt: number;        // epoch ms
  lastSeen: number;           // epoch ms, updated on heartbeat/poll
}
```

### Disconnect Buffering

When a session disconnects (MCP server exits without unregistering, or heartbeat
timeout), it transitions to `disconnected` state. Messages sent to it are buffered
in memory. If the session reconnects within `reconnectTTL` (default 30s), buffered
messages are delivered. After TTL expiry, the session is unregistered and messages
are dropped.

### Identity Strategy

Sessions register with a human-readable identity:
1. `WIRE_SESSION_NAME` env var (if set by governance shim — future 3.5c)
2. `path.basename(process.cwd())` fallback (working directory name)
3. Suffix with short random to prevent collisions: `claude-code-patches-a3f`

---

## Finding R-7: Priority Queue Design (Port from dynamo)

### Structure

Four separate queues, one per urgency level:

| Urgency | Priority | Depth Limit | Use Case |
|---------|----------|-------------|----------|
| urgent | 0 (highest) | Unlimited | Immediate attention required |
| directive | 1 | 100 | Instructions, task assignments |
| active | 2 | 200 | Normal conversation |
| background | 3 | 50 | Status updates, heartbeats |

### Overflow Behavior

When a queue reaches its depth limit, the oldest message is dropped (FIFO eviction).
Urgent queue has no limit — all urgent messages are preserved.

### Usage in Relay

The relay doesn't actually need the priority queue internally — it delivers
messages in FIFO order per session mailbox. The priority queue becomes relevant
when multiple messages are pending: the relay should deliver higher-urgency
messages first. This is implemented in the poll response ordering.

**Decision:** Include priority queue in relay for ordering poll responses.
Messages in a session's mailbox are sorted by urgency before delivery.

---

## Finding R-8: Message Flow End-to-End

### Session A → Session B

```
1. Claude A calls wire_send(to="session-B-id", message="...")
2. Wire MCP Server A:
   a. Creates envelope (from=A, to=B, type, urgency, payload)
   b. POSTs envelope to relay: POST http://127.0.0.1:9876/send
3. Relay:
   a. Validates envelope
   b. Looks up session B in registry
   c. If B is active with pending poll → immediate response
   d. If B is active without pending poll → queue in mailbox
   e. If B is disconnected → buffer in disconnect buffer
   f. If B doesn't exist → return { ok: true, delivered: false }
4. Wire MCP Server B (in poll loop):
   a. Receives message from GET /poll response
   b. Formats as channel notification
   c. Sends notifications/claude/channel to CC
5. CC wraps in <channel source="wire" ...> tag
6. Claude B sees message in conversation
```

### Broadcast (to="broadcast")

```
1. Wire MCP Server A POSTs to relay: POST /send with to="broadcast"
2. Relay iterates all registered sessions (except sender)
3. Copies envelope to each session's mailbox (with to= rewritten)
4. Each recipient picks up via poll
```

---

## Finding R-9: New Tool — wire_discover

### Purpose

Claude needs to know who's available before sending messages. Currently
`wire_status` only shows this session's own status. A new `wire_discover` tool
queries the relay for all registered sessions.

### API

```
GET /sessions → { sessions: [{ sessionId, identity, status, connectedAt, lastSeen }] }
```

### MCP Tool Definition

```json
{
  "name": "wire_discover",
  "description": "Discover other connected Claude Code sessions.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "status_filter": {
        "type": "string",
        "enum": ["active", "disconnected", "all"],
        "description": "Filter by session status. Defaults to 'active'."
      }
    }
  }
}
```

---

## Finding R-10: Build Architecture

### Two Build Artifacts

| Artifact | Source | Purpose | Runtime |
|----------|--------|---------|---------|
| `data/wire/wire-server.cjs` | src/wire/server.ts + relay-client + types | MCP server with relay integration | CC subprocess |
| `data/wire/wire-relay.cjs` | src/wire/relay-server.ts + registry + queue + types | Standalone HTTP relay | Detached child process |

### Source File Map

```
src/wire/
  types.ts           — MODIFIED: add RegistryEntry, RelayConfig, PollResponse
  protocol.ts        — UNCHANGED (envelope creation/validation)
  server.ts          — MODIFIED: add relay integration, poll loop, wire_discover tool
  registry.ts        — NEW: port from dynamo registry.cjs
  queue.ts           — NEW: port from dynamo queue.cjs
  relay-server.ts    — NEW: Node.js HTTP relay (port from dynamo relay-server.cjs)
  relay-client.ts    — NEW: HTTP client for MCP → relay communication
  relay-lifecycle.ts — NEW: PID file management, auto-start, health check
```

### tsdown Configuration

```typescript
// tsdown.wire.config.ts — updated with two entry points
export default defineConfig([
  {
    entry: { 'wire-server': 'src/wire/server.ts' },
    format: 'cjs', outDir: 'data/wire',
    external: [/^node:/],
    noExternal: [/@modelcontextprotocol/, /^ajv/],
  },
  {
    entry: { 'wire-relay': 'src/wire/relay-server.ts' },
    format: 'cjs', outDir: 'data/wire',
    external: [/^node:/],
    // No external deps — pure Node.js
  },
]);
```

---

## Finding R-11: Relay Server Endpoint Specification

Ported from dynamo relay-server.cjs, adapted for Node.js:

| Method | Path | Body | Response | Purpose |
|--------|------|------|----------|---------|
| POST | /register | `{ sessionId, identity, capabilities }` | `{ ok: true }` | Register session |
| POST | /unregister | `{ sessionId }` | `{ ok: true }` | Remove session |
| POST | /send | Envelope object | `{ ok: true, delivered: bool }` | Send single message |
| POST | /send-batch | Envelope array | `{ ok: true, results: [...] }` | Send batch |
| GET | /poll | `?sessionId=X&timeout=25000` | `{ messages: [...] }` | Long-poll for messages |
| GET | /sessions | (none) | `{ sessions: [...] }` | List registered sessions |
| GET | /health | (none) | `{ status, sessions, uptime }` | Health check |

### Long-Poll Behavior

- If mailbox has messages: return immediately
- If mailbox is empty: hold connection open until timeout or new message arrives
- On new message for a session with pending poll: resolve immediately
- Timeout returns `{ messages: [] }` (not an error)

---

## Finding R-12: Adaptation Decisions (Dynamo → claude-governance)

| Aspect | Dynamo | claude-governance | Rationale |
|--------|--------|-------------------|-----------|
| Runtime | Bun.serve | node:http | Users have Node, not Bun |
| WebSocket | Bun.websocket | Deferred | Long-poll sufficient for MVP |
| Result type | `ok()/err()` from lib | `{ ok: true/false }` inline | No external lib dependency |
| Write coordinator | Full Ledger integration | Omitted | No Ledger in claude-governance |
| Transport router | Channels + relay | Relay only initially | Single transport simplifies 3.5b |
| Event emitter | Switchboard integration | Node EventEmitter directly | No Switchboard in claude-governance |
| DI pattern | Options-based DI | Direct imports | Simpler for standalone service |

---

## Open Questions (for Planning Phase)

1. **Relay idle timeout**: Should the relay exit after N minutes with no registered
   sessions, or stay alive indefinitely? Leaning toward 5-minute idle timeout.

2. **Heartbeat protocol**: Should MCP servers send periodic heartbeats to the relay,
   or is poll activity sufficient as a liveness signal? Dynamo uses poll as implicit
   heartbeat (lastSeen updated on each poll).

3. **Maximum sessions**: Should we cap the number of registered sessions? Practically
   unlikely to exceed 10, but the relay should have a safety limit.

4. **Message persistence**: Messages are in-memory only. If the relay crashes, all
   pending messages are lost. Is this acceptable, or should we add file-based
   persistence? Leaning toward in-memory only for 3.5b — messages are ephemeral.

5. **Relay log output**: Should the relay write to stdout/stderr (for debugging),
   or be completely silent? Since it's spawned detached, stdout goes to /dev/null.
   Option: write to `~/.claude-governance/wire/relay.log`.

---

## References

- [dynamoWire] — `/Users/tom.kyser/Library/Mobile Documents/com~apple~CloudDocs/dev/dynamo/core/services/wire/`
- [channelsRef1] — Official Channels API reference
- [fakechat1] — Anthropic's channel plugin reference implementation
- 3.5a HANDOFF.md — What was delivered in the previous phase
- M-3.5 RESEARCH.md — Milestone-level research findings (F1-F7)
