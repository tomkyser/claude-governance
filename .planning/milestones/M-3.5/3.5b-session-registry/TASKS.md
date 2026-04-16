# Phase 3.5b Tasks — Session Registry & Cross-Session Routing

---

## Wave 1: Foundation

### T1: Expand types.ts with registry, relay, and discovery types
- [ ] RegistryEntry interface (identity, capabilities, status, connectedAt, lastSeen)
- [ ] RelayConfig interface (port, host, pidFile, portFile, idleTimeoutMs)
- [ ] PollResponse type ({ messages: Envelope[] })
- [ ] DiscoverResult type (session list with identity and status)
- [ ] RegisterRequest/UnregisterRequest types for relay API
- File: `src/wire/types.ts`

### T2: Port registry from dynamo
- [ ] createRegistry() factory with Map-based session store
- [ ] register(sessionId, info) — add session, emit event
- [ ] unregister(sessionId) — remove session, clean timers/buffers, emit event
- [ ] lookup(sessionId) — return session info or null
- [ ] getSessions() — return all sessions
- [ ] disconnect(sessionId) — mark disconnected, start TTL timer, init buffer
- [ ] reconnect(sessionId) — clear timer, restore active, return buffered messages
- [ ] bufferMessage(sessionId, envelope) — queue message for disconnected session
- [ ] destroy() — clear all state
- [ ] EventEmitter for session:registered, session:lost, session:reconnected
- File: `src/wire/registry.ts`

### T3: Port priority queue from dynamo
- [ ] createPriorityQueue() factory with per-urgency arrays
- [ ] enqueue(envelope) — route to urgency queue, drop oldest on overflow
- [ ] dequeue() — return highest priority message (urgent > directive > active > background)
- [ ] peek() — look without removing
- [ ] getDepth() — per-queue and total counts
- [ ] isEmpty() — check all queues empty
- [ ] flush() — drain all queues in priority order
- [ ] Configurable depth limits per urgency level
- File: `src/wire/queue.ts`

---

## Wave 2: Relay Server

### T4: Build HTTP relay server
- [ ] Node.js http.createServer with request routing
- [ ] POST /register — register session (sessionId, identity, capabilities)
- [ ] POST /unregister — remove session, clean up pending polls
- [ ] POST /send — validate envelope, deliver to mailbox or pending poll
- [ ] POST /send-batch — batch envelope delivery
- [ ] GET /poll — long-poll with configurable timeout (25s default)
- [ ] GET /sessions — list all registered sessions
- [ ] GET /health — status, session count, uptime
- [ ] Broadcast support (to="broadcast" delivers to all except sender)
- [ ] Priority-ordered mailbox delivery (use queue for poll responses)
- [ ] Port selection: 9876 default, fallback 9877-9886
- [ ] Write PID to relay.pid, port to relay.port on startup
- [ ] Idle timeout: self-terminate after 5 min with 0 sessions
- [ ] SIGTERM handler for graceful shutdown
- [ ] Logging to ~/.claude-governance/wire/relay.log
- File: `src/wire/relay-server.ts`

---

## Wave 3: Relay Client + Lifecycle

### T5: Build relay HTTP client
- [ ] RelayClient class/factory with configurable base URL
- [ ] register(sessionId, identity, capabilities) — POST /register
- [ ] unregister(sessionId) — POST /unregister
- [ ] send(envelope) — POST /send
- [ ] poll(sessionId, timeout) — GET /poll with long-poll
- [ ] discover(statusFilter?) — GET /sessions
- [ ] health() — GET /health
- [ ] startPollLoop(sessionId, onMessage) — background poll with error backoff
- [ ] stopPollLoop() — abort controller, clean exit
- [ ] Uses node:http (no external deps)
- File: `src/wire/relay-client.ts`

### T6: Build relay lifecycle manager
- [ ] Wire state directory: ~/.claude-governance/wire/
- [ ] ensureRelay() — check PID, start if needed, return port
- [ ] isRelayRunning() — read relay.pid, check process alive
- [ ] startRelay() — spawn detached child, wait for port file
- [ ] getRelayPort() — read relay.port file
- [ ] cleanStaleState() — remove dead PID/port files
- [ ] Race condition handling: EADDRINUSE = relay already started
- File: `src/wire/relay-lifecycle.ts`

---

## Wave 4: Server Integration

### T7: Integrate relay into Wire MCP server
- [ ] On startup: ensureRelay() → register with relay → start poll loop
- [ ] wire_send routing: POST to relay instead of local notification echo
- [ ] wire_send broadcast: relay handles distribution
- [ ] New tool: wire_discover — query relay /sessions, format for Claude
- [ ] wire_status enhancement: show peers, relay health, poll status
- [ ] On shutdown: unregister from relay, stop poll loop
- [ ] Poll loop: receive messages → send as notifications/claude/channel
- [ ] Error handling: relay down → reconnect with backoff
- [ ] Session identity: WIRE_SESSION_NAME env → cwd basename → random suffix
- File: `src/wire/server.ts`

---

## Wave 5: Build + Verify

### T8: Update build pipeline
- [ ] tsdown.wire.config.ts: dual entry points (wire-server, wire-relay)
- [ ] wire-relay.cjs: standalone, no MCP SDK dependency
- [ ] wire-server.cjs: updated with relay integration
- [ ] pnpm build:wire produces both artifacts
- [ ] Verify: both files exist in data/wire/
- File: `tsdown.wire.config.ts`

### T9: Integration verification
- [ ] Relay server starts and listens on expected port
- [ ] Register/unregister via curl against relay
- [ ] Send message via curl, poll receives it
- [ ] wire_discover returns registered sessions
- [ ] Two CC sessions: A sends to B, B receives as <channel> tag
- [ ] Relay auto-starts when MCP server launches
- [ ] Relay PID/port files written correctly
- [ ] Full typecheck passes (pnpm lint)
- [ ] Build produces correct artifacts (pnpm build:wire)
