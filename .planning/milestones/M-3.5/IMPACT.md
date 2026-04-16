# Milestone 3.5 Impact — Wire Inter-Session Communication

Created: 2026-04-15

## Scope

Wire adds inter-session communication to claude-governance, enabling multiple Claude
Code sessions to collaborate through typed messages. Built on CC's live Channels API
(`notifications/claude/channel`) — no binary patching needed for the transport itself.

## Cross-Phase Impact

| Phase | Impact Beyond Phase |
|-------|-------------------|
| 3.5a | MCP server pattern reusable for future channel integrations |
| 3.5b | Registry pattern applicable to any multi-session feature |
| 3.5c | Governance module pattern extends to all future modules |
| 3.5d | Prompt integration patterns carry to M-4 REPL re-eval |
| 3.5e | /coordinate skill establishes user-facing orchestration pattern |
| 3.5f | Version resilience testing informs M-9 survivability |

## Dependencies

- Channels API availability (tengu_harbor flag — currently True, risk if Anthropic disables)
- Tungsten (M-2, complete) — session spawning for 3.5e
- Tool injection (M-2, complete) — if any injected tool aspects needed
- Prompt override pipeline (M-3, complete) — for behavioral integration in 3.5d
