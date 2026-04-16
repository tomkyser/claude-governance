# 3.5b-session-registry — Tracker

Status: PLANNING COMPLETE → Act next
Phase: ~~Research~~ → ~~Planning~~ → **Act** → Verify → Gap → Housekeeping

## Decisions

- D-01: HTTP relay (node:http), not filesystem or UDS — simplest cross-platform approach
- D-02: Long-polling for message delivery (WebSocket deferred to optimization phase)
- D-03: Relay auto-started by first MCP server as detached child process
- D-04: File-based coordination: ~/.claude-governance/wire/{relay.pid, relay.port}
- D-05: Port 9876 default with 9877-9886 fallback range
- D-06: In-memory messages only — no disk persistence for 3.5b
- D-07: New wire_discover tool for session discovery

## Blockers

None identified.

## Status Updates

- 2026-04-16: Research complete. 12 findings. All dynamo source files studied (registry, queue, relay-server, transport, channels-transport, relay-transport, wire main, protocol). Architecture decisions made. Ready for planning.
