# P3 Research — User Customization

## Scope
T17-T20: Component override directory loading, default overrides, hidden command unhiding, API docs.

## Architecture Findings

### Component Override Loading (T17)
The override system is already in place from P2:
- Binary patches inject checks at the top of oOY() (message renderer) and sOY() (content block renderer)
- Override handlers registered on `globalThis.__govMessageOverrides[type]` and `globalThis.__govContentOverrides[type]`
- `defaults.js` at `~/.claude-governance/overrides/` initializes empty registries
- Lazy-loaded on first render via require() in the binary patch

**T17 requires**: A new deploy directory `~/.claude-governance/components/` scanned for .js files.
Each file exports handlers that get registered on the globalThis registries. The loading
happens in defaults.js (which is already require'd by the binary patch) — extend it to
scan and load the components directory.

### Deploy Pipeline
`deploy.ts` has a consistent pattern: deployTools(), deployUiComponents(), deployOverrides().
Adding deployComponents() follows the same pattern exactly. Source: `data/components/*.js`.
Destination: `~/.claude-governance/components/`.

### Default Component Overrides (T18)
Ship example overrides in `data/components/`. Candidates:
- Attachment visibility override (make null-rendered attachments visible)
- Thinking expansion override (auto-expand thinking blocks)
- React refs available via `globalThis.__govReactRefs` (R, Box, Text)

### Hidden Commands (T19)
`isHidden` is a boolean property on command objects (`types/command.ts:182`).
Set dynamically in:
- `builtinPlugins.ts:155`: `isHidden: !(definition.userInvocable ?? true)`
- `loadPluginCommands.ts:321`: `isHidden: !userInvocable`
- Filtered in `commandSuggestions.ts:36`: `.filter(cmd => !cmd.isHidden)`

In the binary, the filter is at multiple locations:
- idx 13610517: `!x.isHidden` (command list rendering)
- idx 15735658: `!z6.isHidden` (typeahead suggestions)
- idx 15738415: `!T.isHidden` (command grouping)

**Patch strategy**: Override isHidden to false on all commands. The cleanest approach is
to patch the filter predicates to always pass (`!x.isHidden` → `true||x.isHidden`), or
alternatively mutate command objects post-registration to set isHidden = false.

### Handler Signature (T20)
From the binary patch injection:
```
handler(message, props, React) → element | null
```
- `message` or content block object (`_` in the binary)
- `props` (the full component props, `q` in the binary)
- `React` — the React import from the renderer scope
- Return a React element to override, or null to fall through to default

## Key Files
- `claude-governance/src/patches/orchestration/deploy.ts` — add deployComponents()
- `claude-governance/data/overrides/defaults.js` — extend to load components dir
- `claude-governance/data/components/` — new directory for default overrides
- `claude-governance/src/patches/governance/message-override.ts` — existing binary patch
- `docs/README.md` — API documentation target

## Risks
- Component .js files run in the binary's CJS context — errors could crash CC
- Need defensive try/catch around each component load
- isHidden patch must handle both esbuild and minified patterns
