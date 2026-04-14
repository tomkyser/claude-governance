# Phase 2c Tracker — Clean-Room Tungsten

**Status:** RESEARCHED — ready to implement
**Started:** 2026-04-13
**Scope:** 6 deliverables, persistent execution context tool + binary patches + UI injection

## Deliverables

### D1: tungsten.js — Persistent Execution Context Tool
**Status:** Not started
**File:** data/tools/tungsten.js

- [ ] Tool contract (name, inputJSONSchema, prompt, description, call)
- [ ] Socket isolation: claude-<PID> per CC process
- [ ] Actions: send, capture, create, list, kill, interrupt
- [ ] Lazy session creation (ensureSession on first send/create)
- [ ] Auto-capture after send (brief delay + capture output)
- [ ] Shell escaping for command injection prevention
- [ ] tmux availability check (graceful error if missing)
- [ ] Cleanup on process exit (kill-server for our socket)
- [ ] Socket info storage for FS9 patch communication
- [ ] AppState write via context.setAppState()
- [ ] prompt() with usage guidance (when Tungsten vs Bash vs REPL)

### D2: FS9() Binary Patch — bashProvider tmux Activation
**Status:** Not started
**File:** src/patches/governance.ts, src/patches/index.ts

- [ ] Patch: replace function FS9(){return null} with socket-aware version
- [ ] FS9 reads socket info from D1 storage mechanism
- [ ] Verification signature in VERIFICATION_REGISTRY
- [ ] Already-applied detection
- [ ] Verify: native Bash commands inherit TMUX env after Tungsten create
- [ ] Verify: REPL bash() delegation inherits TMUX env

### D3: Render Tree Injection — Live Panel Mounting
**Status:** Not started
**File:** src/patches/governance.ts

- [ ] Patch: replace !1,null at unique signature with createElement call
- [ ] Unique match: cn7(O_)))),!1,null,b_.createElement(m,{flexGrow:1})
- [ ] Self-executing function: try/catch require() of panel component
- [ ] Pass props: React (b_), useAppState (Y_), Box (m), Text (L)
- [ ] Null fallback on load failure
- [ ] Verification signature + already-applied detection

### D4: tungsten-panel.js — Clean-Room Live Monitor
**Status:** Not started
**File:** data/tools/tungsten-panel.js

- [ ] React component receiving {R: React, S: useAppState, B: Box, T: Text} as props
- [ ] Read tungstenActiveSession from AppState
- [ ] Render nothing if no active session
- [ ] Render terminal content (tmux capture-pane) in bordered Box
- [ ] Show session name, last command, timestamp
- [ ] Respect tungstenPanelVisible / tungstenPanelAutoHidden
- [ ] Debounced capture (not every render frame)
- [ ] Graceful degradation if tmux capture fails

### D5: Statusline + Session Hooks
**Status:** Not started

- [ ] TNG segment in combined statusline
- [ ] tungsten-state.json: active sessions, socket, last command
- [ ] SessionEnd / process.exit cleanup: kill tmux server
- [ ] Statusline reads tungsten-state.json

### D6: REPL Prompt Update — Tungsten Awareness
**Status:** Not started
**File:** data/tools/repl.js

- [ ] Coexist prompt: mention Tungsten for persistent processes
- [ ] Replace prompt: mention Tungsten for persistent processes
- [ ] Guidance: Tungsten for long-running, REPL bash() for one-shot

## Verification Targets

- [ ] Build clean (pnpm build)
- [ ] check: 19+/19+ SOVEREIGN
- [ ] Functional probe: claude -p creates session, sends command, captures output
- [ ] Bash inheritance: after Tungsten create, native Bash cd persists
- [ ] REPL inheritance: after Tungsten create, REPL bash() cd persists
- [ ] Live panel renders in interactive session
- [ ] Statusline shows TNG segment
- [ ] Fresh session test: natural language prompt triggers Tungsten use

## Research Findings (2026-04-13-b)

- FS9() at offset 6339467: stubbed to return null — patch target
- !1,null at offset 11998161: render tree injection point
- useAppState (Y_) at offset 6146092: Zustand-like hook
- React (b_), Box (m), Text (L): accessible at render site
- All tmuxSocket.ts functions DCE'd except FS9 stub
- All tungsten AppState fields DCE'd but writable (plain JS object)
- tmux 3.5a available on build machine
- REPL agent() delegation verified working

## Decisions

1. Tungsten is a persistent execution context, not just a tmux tool
2. Implementation order: D1 > D2 (highest risk) > D3+D4 (UI) > D5+D6 (polish)
3. Socket info sharing: process.env or temp file, synchronous, no race
4. Panel receives React primitives as props, renders inside existing AppStateProvider

## Issues Found

(None yet — implementation not started)