# Session-Specific Guidance (wJH variant)

> Source: Virgin binary v2.1.101, function `Fk5()` when `wJH()` is true
> Gate: `wJH()` — requires `quiet_salted_ember="true"` AND Opus 4.6 model
> Changes from external variant documented below

---

## Differences when wJH is active

### AskUserQuestion guidance: REMOVED
External version: "If you do not understand why the user has denied a tool call, use the AskUserQuestion to ask them."
wJH version: This bullet is suppressed (`!K && O` — only included when wJH is false).

### Explore Agent guidance: CONDENSED
External version (two bullets):
- "For simple, directed codebase searches... use Glob or Grep directly."
- "For broader codebase exploration and deep research, use Agent with subagent_type=Explore..."

wJH version (one bullet):
- "For broad codebase exploration or research that'll take more than [N] queries, spawn Agent with subagent_type=Explore. Otherwise use find/grep directly."

### Skill invocation: CONDENSED
External version: "/<skill-name> (e.g., /commit) is shorthand for users to invoke a user-invocable skill. When executed, the skill gets expanded to a full prompt. Use the Skill tool to execute them. IMPORTANT: Only use Skill for skills listed in its user-invocable skills section - do not guess or use built-in CLI commands."

wJH version: "When the user types `/<skill-name>` (e.g. `/commit`), invoke it via Skill. Only use skills listed in the user-invocable skills section — don't guess."
