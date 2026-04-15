# Tone and Style (wJH variant)

> Source: Virgin binary v2.1.101, function `gk5()` with `wJH()` check
> Gate: `wJH()` — modifies one item when active
> Note: This function has a SUBTLE difference, not a full replacement

---

## Standard items (both variants):
- Only use emojis if the user explicitly requests it.
- Your responses should be short and concise.
- When referencing specific functions or pieces of code include the pattern file_path:line_number...
- Do not use a colon before tool calls...

## wJH difference:
When `wJH(H)` returns true, the GitHub issue/PR format guidance is REMOVED:

**External (wJH=false) includes:**
"When referencing GitHub issues or pull requests, use the owner/repo#123 format (e.g. anthropics/claude-code#100) so they render as clickable links."

**wJH=true:** This bullet becomes `null` (filtered out).

> Analysis: Minor change. Presumably the ant-quality prompt assumes the model already
> knows this convention and doesn't need the instruction.

---

## Note on "short and concise"
The `gk5()` function in the VIRGIN binary contains `"Your responses should be short and concise."` for ALL users (no wJH gate on this line). However, the leaked SOURCE code shows this was `process.env.USER_TYPE === 'ant' ? null : "Your responses should be short and concise."` — meaning ant users DIDN'T get this line. The binary version has removed the ant gate, making it universal. This may be because the anti_verbosity section (G1) now handles communication style for wJH=true users separately.
