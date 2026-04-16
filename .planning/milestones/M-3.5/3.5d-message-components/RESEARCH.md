# Phase 3.5d Research — Message Components Control

Date: 2026-04-16
Status: RESEARCH COMPLETE

---

## 1. Architecture Overview

### Message Rendering Pipeline

CC's TUI rendering pipeline for messages:

1. **Message.tsx** — Top-level dispatch component. Routes by `message.type` and `message.subtype`:
   - `type === "system"` → `SystemTextMessage`
   - `type === "assistant"`, content `tool_use` → `AssistantToolUseMessage`
   - `type === "assistant"`, content `text` → `AssistantTextMessage`
   - `type === "assistant"`, content `thinking` → `AssistantThinkingMessage`
   - `type === "user"` → `UserTextMessage`

2. **SystemTextMessage.tsx** (827 lines) — Dispatches by `message.subtype`:
   - `"agents_killed"` → styled error dot + "All background agents stopped"
   - `"thinking"` → **`return null`** (SUPPRESSED — line 122)
   - `"bridge_status"` → `BridgeStatusMessage`
   - `"scheduled_task_fire"` → teardrop + content
   - `"permission_retry"` → retry UI
   - `"stop_hook_summary"` → `StopHookSummaryMessage`
   - `"turn_duration"` → `TurnDurationMessage`
   - `"memory_saved"` → `MemorySavedMessage`
   - default → `SystemTextMessageInner` (generic text)
   - Internal: `ThinkingMessage` function exists at line 733 but is NEVER CALLED

3. **AssistantToolUseMessage.tsx** (368 lines) — Tool rendering pipeline:
   - Calls `findToolByName(tools, param.name)` to get tool object
   - Extracts `userFacingToolName`, `userFacingToolNameBackgroundColor`, `isTransparentWrapper`
   - **If `isTransparentWrapper === true`**: renders progress messages only (no tool header)
   - **If `userFacingToolName === ""`**: `return null` (HIDDEN)
   - Otherwise: renders tool header + result via `tool.renderToolUseMessage()`

4. **Tool.ts** (793 lines) — Tool interface with rendering methods:
   - `renderToolUseMessage()` — renders the tool invocation
   - `renderToolResultMessage()` — renders the tool result
   - `renderToolUseProgressMessage()` — renders progress while running
   - `isTransparentWrapper()` — if true, tool itself shows nothing; delegates to progress handler
   - `userFacingName()` — display name for tool header
   - `TOOL_DEFAULTS` (line 757) — defaults for external tools

### Minified Binary Patterns

| Source Pattern | Minified Pattern | Offset |
|---|---|---|
| `message.subtype === "thinking"` → `return null` | `q.subtype==="thinking")return null` | 8193543 |
| `isTransparentWrapper?.() ?? false` | `VH.isTransparentWrapper?.()??!1` | 8131136 |
| `if(userFacingToolName === "")` | `if(i==="")` | ~8131405+ |
| SystemTextMessage function | `r6.createElement` patterns in minified scope | ~8192000-8195000 |

### React Runtime

Components use React Compiler with `_c()` memoization cache slots. Variable names are
single-letter in minified (`r6` = React, `m` = Box, `L` = Text, `$` = bg from useSelectedMessageBg).

---

## 2. REPL Tool Use Not Appearing in TUI — Root Cause

### Finding

Our injected REPL tool's `renderToolUseMessage` returns `null` (set by tool-injection.ts default).
CC's `AssistantToolUseMessage` pipeline:

1. Looks up tool via `findToolByName(tools, param.name)`
2. Gets `userFacingToolName` from `tool.userFacingName(input)`
3. Our tool returns `"REPL"` (we override `userFacingName` to return `_t.name`)
4. Gets `isTransparentWrapper` — we don't set this, defaults to `false`
5. Calls `tool.renderToolUseMessage(input, options)` — **returns null** (our default)
6. `if(fH===null)return null` — **entire message hidden**

### Why It Previously Worked

Unclear. Possible explanations:
- CC version change altered the rendering pipeline to check renderToolUseMessage return value
- Our tool injection defaults may have changed at some point
- The "previously worked" observation may have been the native Read/Write/Edit tools showing
  through REPL's inner operations, not REPL itself

### Fix

Two options:
1. **Simple**: Override `renderToolUseMessage` in tool-injection.ts to return a basic React element
2. **Correct**: Implement proper `renderToolUseMessage` in our REPL tool that shows script + description

The problem is our tools are CJS modules loaded at runtime — they can't easily return JSX/React
elements because they don't have access to React or Ink. The tool-injection loader runs in the
binary's context where React IS available, but the tool file itself doesn't import React.

**Solution**: The tool-injection loader code already has access to the rendering context. We can
either:
- Inject a `renderToolUseMessage` factory in the loader that creates React elements
- Have tools return a plain-text string that the loader wraps in React elements
- Access the React reference available in the binary scope (like render-tree.ts does with `b_`)

---

## 3. Thinking Blocks Suppression — Binary Analysis

### Current State

Line 122 of SystemTextMessage.tsx / offset 8193543 in minified:
```javascript
if(q.subtype==="thinking")return null;
```

The `ThinkingMessage` component EXISTS (line 733, renders teardrop + dimColor content)
but is never called because the dispatch returns null before reaching it.

### Patch Strategy

Replace `return null` with a call to `ThinkingMessage`:
- **Source**: `if(q.subtype==="thinking")return null;`
- **Minified**: `q.subtype==="thinking")return null;`
- **Replacement**: Change `return null` to render the ThinkingMessage component

The tricky part: `ThinkingMessage` is a locally-scoped function. In minified code it's nearby
but we need to identify its minified name. The function at line 733 in source becomes a function
in the same scope — we need to find what it's called in minified.

### Minified ThinkingMessage Location

Need to find the function that creates: `createElement(Box, {minWidth:2}, createElement(Text, {dimColor:true}, zm))`
where `zm` is the TEARDROP_ASTERISK constant, and renders `message.content` in dim text.

---

## 4. Message Component Override Architecture

### Requirements (from ROADMAP)
1. Complete override capability for each message component
2. Must survive CC version upgrades (resilient matching)
3. Users can edit components independently
4. Governance provides defaults, users customize

### Proposed Architecture

**Layer 1: Binary Patching (per-component patches)**
Each patchable component gets a detector + replacer in `src/patches/governance/`:
- `message-thinking.ts` — restore thinking blocks
- `message-tool-rendering.ts` — fix external tool rendering
- Future: `message-X.ts` for each component

**Layer 2: Runtime Component Override System**
A globalThis-based override registry that components check at render time:
```
globalThis.__govMessageOverrides = {
  'system.thinking': (message, React, Ink) => React.createElement(...),
  'tool.REPL': (input, React, Ink) => React.createElement(...)
}
```

Binary patches inject an override check at the TOP of each component's dispatch:
```javascript
// Injected at start of SystemTextMessage dispatch
if(globalThis.__govMessageOverrides?.['system.'+q.subtype]) {
  return globalThis.__govMessageOverrides['system.'+q.subtype](q, r6, {Box:m, Text:L})
}
```

**Layer 3: User-Customizable Override Files**
Users place override JS files in `~/.claude-governance/components/`:
- `system-thinking.js` — custom thinking block rendering
- `tool-REPL.js` — custom REPL output rendering
- Each file exports a render function

**Layer 4: Governance Defaults**
Governance ships default overrides in `data/components/` that are deployed on `apply()`.

### Matching Strategy

Multi-detector pattern (same as existing patches):
1. **Primary detector**: Exact minified pattern match
2. **Fallback detector**: Structural pattern (createElement sequence + subtype checks)
3. **Content-based detector**: Known string constants (subtype values are string literals, not minified)

String literals in message subtypes (`"thinking"`, `"bridge_status"`, etc.) are NEVER minified —
they're runtime values, not identifiers. This makes them extremely stable anchors.

---

## 5. Component Inventory

### SystemTextMessage Subtypes (all patchable)
| Subtype | Current Behavior | Override Potential |
|---------|-----------------|-------------------|
| `thinking` | null (hidden) | HIGH — ThinkingMessage exists, just suppressed |
| `agents_killed` | Error dot + text | LOW — works fine |
| `bridge_status` | BridgeStatusMessage | MEDIUM — customize bridge UI |
| `scheduled_task_fire` | Teardrop + content | LOW — works fine |
| `permission_retry` | Retry UI | LOW |
| `stop_hook_summary` | Duration/hook summary | MEDIUM — add more detail |
| `turn_duration` | Duration + budget | MEDIUM — customize display |
| `memory_saved` | Memory save confirmation | LOW |

### AssistantToolUseMessage (tool rendering)
| Tool | Current Behavior | Override Potential |
|------|-----------------|-------------------|
| External tools (REPL, Tungsten, Ping) | renderToolUseMessage returns null → hidden | HIGH — need fix |
| Native tools (Bash, Read, Edit, etc.) | Full rendering | MEDIUM — customize |

### Other Components
| Component | File | Override Potential |
|-----------|------|-------------------|
| AssistantThinkingMessage | AssistantThinkingMessage.tsx | MEDIUM |
| AssistantRedactedThinkingMessage | AssistantRedactedThinkingMessage.tsx | MEDIUM |
| GroupedToolUseContent | GroupedToolUseContent.tsx | LOW |

---

## 6. Priority Order

1. **P0: Fix external tool rendering** — REPL/Tungsten/Ping not visible in TUI
2. **P1: Restore thinking blocks** — `subtype==="thinking"` → render ThinkingMessage
3. **P2: Build override registry** — globalThis-based component override system
4. **P3: User customization** — ~/.claude-governance/components/ file loading
5. **P4: Additional component patches** — based on user demand

---

## 7. Open Questions

1. **React access in tool files**: Can CJS tool files access the binary's React instance?
   The tool-injection loader runs in the binary scope — it can capture React and pass it.
   But tool files are required() at runtime. Need to verify scope chain.

2. **ThinkingMessage minified name**: Need to extract the exact function name from the binary
   to redirect the dispatch. Alternative: inline the rendering code in the patch.

3. **Performance**: Each override check adds a property lookup at render time. With React
   Compiler memoization, this should be cached after first render.

4. **Version resilience**: String literal anchors (`"thinking"`, `"bridge_status"`) are
   stable across versions. Component function boundaries may shift. Multi-detector strategy
   mitigates this.

---

## 8. Deep Dive: All Tool Visibility Suppression Patterns

### P0 Deliverable: "Every tool call should be visible — nothing hidden"

Three mechanisms suppress tool visibility in the TUI:

#### 8.1 Empty `userFacingName` → Entire tool use hidden

`AssistantToolUseMessage.tsx` line 158: `if(userFacingToolName === "") return null`

**Currently hidden tools (intentionally by Anthropic):**
| Tool | Code Location | Why Hidden |
|------|--------------|------------|
| `TaskStopTool` | TaskStopTool.ts:46 | Returns `''` for ant users only (`process.env.USER_TYPE === 'ant'`) |
| `ToolSearchTool` | ToolSearchTool.ts:438 | Always returns `''` |
| `BriefTool` | UI.tsx:58 | Returns `''` so UserToolSuccessMessage drops columns-5 |

#### 8.2 `renderToolUseMessage` returning null → Tool invocation hidden

Our injected tools (REPL, Tungsten, Ping) hit this path because tool-injection.ts defaults:
```javascript
if(!_t.renderToolUseMessage)_t.renderToolUseMessage=function(){return null};
```

The rendering pipeline calls `tool.renderToolUseMessage()` → if null → `return null` (entire message gone).

**Fix:** tool-injection.ts must provide a real `renderToolUseMessage` that creates React elements.
The loader runs in binary scope where React (`r6`/`b_`) and Ink (`m`/`L` = Box/Text) are available.

#### 8.3 `isTransparentWrapper` → Only shows progress, hides wrapper

`Tool.ts` line 529-533: "Transparent wrappers (e.g. REPL) delegate all rendering to their
progress handler, which emits native-looking blocks for each inner tool call."

No tools in the codebase currently implement this. It's defined as an optional interface
method only. Our external REPL does NOT use this pattern — it just returns null.

### Governance Fix Strategy

For the "nothing hidden" deliverable, the tool-injection loader needs to:

1. **Capture React + Ink references** at load time (they exist in the binary scope)
2. **Provide a default `renderToolUseMessage`** that creates a visible element:
   ```javascript
   _t.renderToolUseMessage = function(input) {
     return React.createElement(Text, {dimColor: true}, _t.name + ': ' + (input.description || ''));
   }
   ```
3. **For REPL specifically**: show the script description and operation summary
4. **For Tungsten**: show the action and session name
5. **For Ping**: show the message being echoed

Additionally, a binary patch to override the empty-name check would make ALL tools visible,
including `ToolSearchTool` and ant-hidden `TaskStopTool`.

---

## 9. Deep Dive: Hidden Thinking, Reasoning, and Effort Systems

### 9.1 Thinking Suppression Points (5 found)

| # | Location | Mechanism | What's Hidden |
|---|----------|-----------|---------------|
| 1 | `SystemTextMessage.tsx:122` | `subtype==="thinking" → return null` | System-level thinking status messages. ThinkingMessage component exists but never called |
| 2 | `AssistantThinkingMessage.tsx:36` | `hideInTranscript → return null` | Past thinking blocks hidden in transcript mode |
| 3 | `REPL.tsx:852` | `setTimeout(null, 30000)` | Streaming thinking auto-hides after 30 seconds of completion |
| 4 | `betas.ts:270-276` | `REDACT_THINKING_BETA_HEADER` | **API-side**: Haiku thinking summaries replaced with redacted_thinking stubs. Explicitly opt-out — users can re-enable via `showThinkingSummaries: true` in settings.json |
| 5 | `AssistantThinkingMessage.tsx:42-47` | Non-verbose: `"∴ Thinking" + CtrlOToExpand` | Full thinking text hidden by default — only shows "Thinking" stub with Ctrl+O hint. Visible in verbose mode or transcript mode |

### 9.2 Redacted Thinking

`AssistantRedactedThinkingMessage.tsx`: Simply shows `"✻ Thinking…"` in dim italic.
This is what users see instead of actual thinking content when `REDACT_THINKING_BETA_HEADER`
is active. The actual thinking is cryptographically signed and opaque.

**Key insight from betas.ts:264-269:**
> "Skip the API-side Haiku thinking summarizer — the summary is only used for ctrl+o display,
> which interactive users rarely open. The API returns redacted_thinking blocks instead."

This means Anthropic actively chose to hide thinking summaries because users "rarely open" them.

### 9.3 Ultrathink System

`utils/thinking.ts`:
- **Feature gate**: `feature('ULTRATHINK')` (build-time DCE) + `tengu_turtle_carbon` (GrowthBook runtime)
- **Keyword trigger**: Typing "ultrathink" in a prompt triggers effort escalation to "high"
- **UI**: Rainbow-colored keyword highlighting in PromptInput, notification popup
- **Mechanism**: Creates an `ultrathink_effort` attachment that bumps effort level
- **Null-rendered**: Listed in `nullRenderingAttachments.ts` — the effort change happens silently

### 9.4 Effort Level System

`utils/effort.ts` (330 lines):
- **Levels**: `low`, `medium`, `high`, `max` (max = Opus 4.6 only)
- **`CLAUDE_CODE_EFFORT_LEVEL` env var**: Overrides all other settings
- **Default for Opus 4.6**: `medium` for Pro subscribers (!) — downgraded from what users might expect
- **`max` restriction**: Only Opus 4.6, only session-scoped for external users (ants can persist)
- **`CLAUDE_CODE_ALWAYS_ENABLE_EFFORT`**: Forces effort support for any model
- **Adaptive thinking**: Separate system (`CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` env var)
- **Effort suffix in spinner**: Shows `"thinking with {level} effort"` but ONLY if effort was explicitly set

**Key governance insight**: Default Opus 4.6 effort is `medium` for Pro users. Users paying for
the most capable model are silently receiving reduced reasoning effort unless they explicitly
set effort to `high` or `max`.

### 9.5 Connector Text Summarization (Anti-Distillation)

`betas.ts:279-298`: Ant-only feature (`tengu_slate_prism` GrowthBook flag):
- API buffers assistant text between tool calls, summarizes it
- Returns summary with cryptographic signature so original can be restored
- Purpose: "anti-distillation" — prevents competitors from training on CC's reasoning chains
- Uses same mechanism as thinking blocks (redaction + signature)
- `USE_CONNECTOR_TEXT_SUMMARIZATION` env var: tri-state (1=force on, 0=force off, unset=GB)

### 9.6 Null-Rendering Attachments (Complete List)

`nullRenderingAttachments.ts` — 27 attachment types that are INVISIBLE in the TUI:
```
hook_success, hook_additional_context, hook_cancelled,
command_permissions, agent_mention, budget_usd,
critical_system_reminder, edited_image_file, edited_text_file,
opened_file_in_ide, output_style, plan_mode, plan_mode_exit,
plan_mode_reentry, structured_output, team_context, todo_reminder,
context_efficiency, deferred_tools_delta, mcp_instructions_delta,
companion_intro, token_usage, ultrathink_effort, max_turns_reached,
task_reminder, auto_mode, auto_mode_exit, output_token_usage,
pen_mode_enter, pen_mode_exit, verify_plan_reminder,
current_session_memory, compaction_reminder, date_change
```

These consume no render budget (200-message cap) but ARE part of the conversation context.
Users have no visibility into when these are injected or what they contain.

### 9.7 Hidden Commands

Commands with `isHidden: true`:
- `/rate-limit-options` — "Hidden from help - only used internally"
- `/output-style` — hidden
- `/thinkback-play` — hidden
- `/heapdump` — hidden

Commands conditionally hidden:
- `/advisor`, `/context`, `/remote-setup`, `/sandbox-toggle`, `/cost`, `/fast`,
  `/bridge`, `/passes`, `/extra-usage`, `/voice`, `/desktop`, `/session`, `/remote-env`
  — all have `get isHidden()` getters that evaluate conditions at runtime

---

## 10. Updated Deliverables for Phase 3.5d

1. **P0: Fix external tool rendering** — REPL/Tungsten/Ping visible in TUI
   - Update tool-injection.ts loader to provide real `renderToolUseMessage`
   - Capture React/Ink refs in loader scope

2. **P0: Full tool visibility** — NOTHING hidden from the user
   - Binary patch: override `userFacingToolName === ""` check in AssistantToolUseMessage
   - Make ToolSearchTool, TaskStopTool, BriefTool all visible
   - Governance users see every tool call that occurs

3. **P1: Restore thinking blocks** — `subtype==="thinking"` → render ThinkingMessage
   - Binary patch in SystemTextMessage dispatch
   - Show the ThinkingMessage component that already exists

4. **P1: Disable thinking auto-hide** — Remove 30-second timeout
   - Binary patch the setTimeout in REPL.tsx streaming thinking handler

5. **P1: Show full thinking by default** — Skip the "∴ Thinking Ctrl+O" stub
   - Make `shouldShowFullThinking = true` regardless of verbose mode

6. **P2: Expose null-rendered attachments** — User-configurable visibility
   - Binary patch or override for nullRenderingAttachments filter
   - Show `critical_system_reminder`, `token_usage`, `output_token_usage`,
     `compaction_reminder` at minimum — these are user-relevant

7. **P2: Build override registry** — globalThis-based component override system

8. **P3: User customization** — ~/.claude-governance/components/ file loading

9. **P3: Unhide hidden commands** — Make all /commands visible in help

