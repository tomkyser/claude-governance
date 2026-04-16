# Milestone 3.5 Bootstrap — Wire Inter-Session Communication

---

**Status:** Research complete, planning complete, ready for Phase 3.5a
**Baseline:** 22/22 SOVEREIGN on CC 2.1.101
**Previous milestone:** M-3 (System Prompt Control) — COMPLETE

## Read These Files (In This Order)

1. `.planning/VISION.md` — Ground yourself in the project intent
2. `.planning/STATE.md` — Current project state (M-3 complete, 22/22 SOVEREIGN)
3. `.planning/ROADMAP.md` — M-3.5 section has all 6 phases with task checklists
4. `.planning/milestones/M-3.5/RESEARCH.md` — Critical findings from binary analysis:
   - Channels API is live and bidirectional (Finding 1 + Finding 7)
   - UDS Inbox is fully DCE'd (Finding 2)
   - Teammate mailbox architecture (Finding 3)
   - Permission relay system (Finding 4)
   - Dynamo Wire source analysis (Finding 5)
   - Feature flag activation path (Finding 6)
5. `.planning/milestones/M-3.5/CONTEXT.md` — Live phase state
6. `.planning/milestones/M-3.5/IMPACT.md` — Cross-phase impact and dependencies
7. `.planning/REFERENCES.md` — [channelsRef1], [fakechat1], [dynamoWire] are the key references

## What M-3.5 Is

Wire adds inter-session communication to claude-governance. Multiple Claude Code sessions
can discover each other, send typed messages, and collaborate on tasks. Built on CC's
native Channels API — no binary patching needed for the transport itself.

**The critical insight:** The Channels API is bidirectional. An MCP server that declares
`claude/channel` capability handles both directions — notifications push messages into
sessions (inbound), exposed MCP tools let Claude send messages out (outbound). Anthropic's
fakechat plugin [fakechat1] is the canonical reference implementation.

**The critical constraint:** Building the communication layer is NOT enough. Claude Code
must be patched at every behavioral layer — hooks, tool prompts, system prompts, agent
prompts, MCP server instructions — so the LLM actually uses cross-session collaboration
when it's the right tool. Phase 3.5d is dedicated entirely to this.

## Phase Plan

| Phase | Name | Scope | Depends On |
|-------|------|-------|------------|
| **3.5a** | Wire MCP Server | Channel contract, bidirectional messaging, plugin packaging | — |
| **3.5b** | Session Registry | Registry, discovery, routing, TTL buffering, priority queue | 3.5a |
| **3.5c** | Governance Integration | Module, shim/launch, verification, hooks, config | 3.5a, 3.5b |
| **3.5d** | Behavioral Integration | Prompts, instructions, coordinator mode, model guidance | 3.5c |
| **3.5e** | /coordinate Skill | User-facing skill, Tungsten orchestration, end-to-end workflow | 3.5d |
| **3.5f** | Hardening | Error handling, reconnection, version resilience, docs, gaps | 3.5e |

## Key Technical Context

### Channels API Gate (z4_ / gateChannelServer)
Six layers, all currently passable:
1. Server declares `experimental["claude/channel"]` — we control this
2. `tengu_harbor` feature flag — currently True in cachedGrowthBookFeatures
3. OAuth authentication — requires `/login` (API key users blocked)
4. Team/Enterprise policy — N/A for individual users
5. `--channels` session flag — our shim passes this
6. Allowlist — bypassed by `--dangerously-load-development-channels`

### Message Flow
```
Session A: Claude calls Wire MCP reply tool
  → Wire MCP Server A routes to Wire MCP Server B
    → Server B sends notifications/claude/channel
      → Session B: Claude sees <channel source="wire" ...> message
        → Session B calls Wire MCP reply tool to respond
```

### Dynamo Wire Source (port material)
Location: `/Users/tom.kyser/Library/Mobile Documents/com~apple~CloudDocs/dev/dynamo/core/services/wire/`
- `protocol.cjs` (128 lines) — Typed envelopes, message types, urgency levels
- `registry.cjs` (238 lines) — Session registry with TTL buffering
- `queue.cjs` (141 lines) — Priority queue
- `transport.cjs` (184 lines) — Transport router
- `wire.cjs` (429 lines) — Main service composition

Adapt selectively. dynamo uses `ok()/err()/createContract()` patterns and
`@modelcontextprotocol/sdk` — adapt to our patterns and CC's MCP infrastructure.

### Binary Symbols (from RESEARCH.md)
| Symbol | Offset | Role |
|--------|--------|------|
| `vMH()` | 9985385 | `isChannelsEnabled()` — reads `tengu_harbor` |
| `z4_()` | 9986132 | `gateChannelServer()` — 6-layer gate |
| `A4_()` | 9985677 | `wrapChannelMessage()` — XML formatting |
| `vD()` | 4438081 | Prompt queue enqueue |
| `DWH` | 870835 | = "channel" (XML tag name) |

### Risk: GrowthBook Sync
`tengu_harbor: True` is from Anthropic's server. If they disable it, Channels stops.
Our PATCH 12 protects `clientDataCache` but NOT `cachedGrowthBookFeatures`. May need
a future patch if Anthropic reverts. Monitor during M-3.5 execution.

## Starting Phase 3.5a

Begin with the phase lifecycle:
1. **Research** — Read fakechat server.ts (268 lines, [fakechat1]), dynamo channel-server.cjs
   and protocol.cjs. Create `3.5a-wire-mcp-server/RESEARCH.md`.
2. **Planning** — Create PLANNING.md, TASKS.md. Key decisions: server language (TS vs CJS),
   packaging model (.mcp.json vs settings.json), protocol subset from dynamo.
3. **Act** — Build the MCP server, test with `--dangerously-load-development-channels`.
4. **Verify** — End-to-end: message in → Claude sees it → Claude replies → message out.
5. **Gap Analysis** — What's missing before 3.5b can start?
6. **Housekeeping** — HANDOFF.md, update ROADMAP, STATE, BOOTSTRAP.
