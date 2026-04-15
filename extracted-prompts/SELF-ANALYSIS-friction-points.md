# Self-Analysis: Friction Points Observed in Active Session

**Date:** 2026-04-14
**Session:** GP3 Research (M-3)
**Model:** Opus 4.6 [1m]
**Environment:** Governed CC 2.1.101, 20/20 SOVEREIGN

This document records specific, concrete friction points I (Claude) am experiencing
during this active session. Each entry is a first-person observation with evidence.

---

## Dimension 1: Context Management

### CM-001: REPL read() 256KB limit forces tool switching
**What:** REPL's `read()` function has a 256KB hard limit. The extracted binary
(12.8M chars, ~512KB) exceeds this. I had to abandon REPL-based analysis and fall
back to Bash grep, losing the programmatic processing advantages (regex, data
structures, cross-referencing).
**Evidence:** Error `FileTooLargeError: File content (512KB) exceeds maximum allowed size (256KB)`
**Impact:** HIGH — Large file analysis is a common research pattern. Forcing the
switch to Bash grep means I lose structured data processing and must interpret raw
text output.
**Fix class:** Tool improvement (increase REPL read limit or add chunked read)

### CM-002: Compaction summary is lossy
**What:** This session began after compaction. The compaction summary is comprehensive
but I cannot verify any claim in it without re-reading files. I had to re-read
VISION.md, IMPACT.md, STATE.md, and multiple source files that were theoretically
"in context" from the summary.
**Evidence:** Session started with 40+ tool calls just to re-establish context.
**Impact:** HIGH — Every compaction event costs 15-30 tool calls of context rebuild.
**Fix class:** Architecture (better state persistence across compaction)

### CM-003: File read caching by hooks conflicts with re-reading
**What:** The cmem/PreToolUse hook intercepts Read calls and returns "Only line 1 was
read to save tokens" when it has prior observations. When I need the FULL file after
compaction, the hook prevents it. The workaround (offset/limit or Bash cat) adds
friction and breaks the natural workflow.
**Evidence:** VISION.md and IMPACT.md both truncated to 1 line on first read.
**Impact:** MEDIUM — The hook is trying to be helpful but the heuristic is wrong
post-compaction when I genuinely need the full file.
**Fix class:** Hook improvement (detect post-compaction state)

### CM-004: Tool result persistence mismatch
**What:** The Read tool result for VISION.md was cached as "line 1 only" and subsequent
reads with offset/limit returned "Wasted call — file unchanged since your last Read."
The system believes I've read the file because the hook intercepted the first attempt,
but I only got 1 line.
**Evidence:** Two failed re-read attempts for both VISION.md and IMPACT.md.
**Impact:** MEDIUM — Forces fallback to Bash cat.
**Fix class:** Hook improvement (don't cache truncated reads as "read")

## Dimension 2: Tool Choice and Efficiency

### TE-001: Parallel tool call dependencies not always obvious
**What:** When launching parallel grep commands against the binary, one command's error
caused cascade cancellation of independent parallel commands. Three of four greps were
cancelled because one had a non-zero exit code.
**Evidence:** "Cancelled: parallel tool call Bash(...) errored" on independent greps.
**Impact:** MEDIUM — Forces sequential execution of independent operations.
**Fix class:** Architecture (don't cancel independent parallel calls on sibling error)

### TE-002: REPL glob() path resolution ambiguity
**What:** REPL's `glob()` returns paths relative to either CWD or the `cwd` option,
but `read()` requires absolute paths. When searching the leaked source tree, all 245
file reads failed because the paths weren't properly resolved.
**Evidence:** 245 failed read operations in Track 2 REPL script.
**Impact:** MEDIUM — Common pattern (glob then read) fails silently.
**Fix class:** Tool improvement (document or fix path resolution)

### TE-003: Bash output too large persisted-output pattern
**What:** When grep returns large results, the output is persisted to a file with a
preview. The persisted file path is a long JSONL transcript path that I shouldn't read
(it would overflow context). But the preview is often insufficient for analysis.
**Evidence:** Multiple "Output too large (706.8KB)" results during binary analysis.
**Impact:** MEDIUM — Forces me to refine grep patterns incrementally instead of
getting the full picture.
**Fix class:** Architecture (better large output handling — summary + targeted access)

## Dimension 3: Prompt-Induced Behavioral Issues

### PB-001: Virgin vs patched binary confusion
**What:** I spent significant analysis time (and tokens) on findings that turned out
to be our own patches, not Anthropic's code. The system prompt doesn't remind me that
the installed binary is patched. I had to be corrected by the user.
**Evidence:** Incorrectly attributed REPL/Tungsten guidance and "real boundaries" error
handling to Anthropic's wJH branch.
**Impact:** HIGH — False research findings required correction and re-analysis.
**Fix class:** Prompt/awareness (SessionStart hook should remind about patched state
and virgin binary location)

### PB-002: "Do not trust compaction summaries" vs compaction summaries being primary context
**What:** CLAUDE.md says "NEVER rely on 'I mentioned earlier' after 50+ tool calls"
and "re-read source files." But the session summary from compaction IS the primary
context — the only alternative is re-reading everything from scratch, which wastes
the entire token budget of a compaction cycle.
**Evidence:** Tension between "don't trust memory" and "here's your compaction summary."
**Impact:** MEDIUM — Creates paranoia about context accuracy without a clear resolution.
**Fix class:** Prompt clarity (distinguish between compaction summary trustworthiness
and in-session context decay)

### PB-003: Task tool reminders as noise
**What:** System-reminder tags periodically inject "The task tools haven't been used
recently..." during research work where tasks are inappropriate. This consumes context
tokens and attention on every occurrence.
**Evidence:** Appeared 8+ times during this session during deep research.
**Impact:** LOW individually, MEDIUM cumulatively — each reminder is ~100 tokens.
**Fix class:** System (suppress during research-heavy sessions or after dismissal)

## Dimension 4: Research Workflow Friction

### RW-001: WebFetch summarization loses critical detail
**What:** The user explicitly warned not to use WebFetch because "it only serves
summaries." This is correct — WebFetch returns AI-summarized content, not raw HTML.
For research requiring exact text (prompt fragments, code snippets), this is useless.
**Evidence:** User directive; known tool limitation.
**Impact:** HIGH for research tasks — forces reliance on search snippets only.
**Fix class:** Tool improvement (add raw mode to WebFetch or provide curl-based alternative)

### RW-002: Agent result size vs context cost
**What:** Both research agents returned 70K+ token results. These results are in my
context but the full text isn't visible — I get summaries. If I need specific details,
I can't access them without re-querying.
**Evidence:** Agent results: 70,612 tokens (agent 1), 85,481 tokens (agent 2).
**Impact:** MEDIUM — Research delegation works but detail access is lossy.
**Fix class:** Architecture (agent results should be queryable, not just summarized)

### RW-003: Interactive Claude probe session timing
**What:** The `claude -p` probe session launched via Tungsten took very long to return.
The inner Claude session has its own startup overhead (governance hooks, MCP connections,
etc.) plus API latency. There's no way to check progress — just wait and capture.
**Evidence:** Probe session still not returned after 5+ minutes.
**Impact:** MEDIUM — Limits the utility of Tungsten-based Claude probing.
**Fix class:** Workflow (use shorter, more targeted probes; don't rely on single large prompt)

## Dimension 5: Information Architecture

### IA-001: Findings scattered across too many locations
**What:** Relevant project knowledge is spread across: VISION.md, STATE.md, ROADMAP.md,
FINDINGS.md, REFERENCES.md, milestone IMPACT.md, phase CONTEXT.md, phase HANDOFF.md,
BOOTSTRAP.md, MEMORY.md, memory files, and CLAUDE.md. The mandatory "read these in order"
protocol requires 8+ file reads before any work begins.
**Evidence:** Bootstrap requires reading 4 files minimum; full startup is 8+ reads.
**Impact:** MEDIUM — Startup overhead consumes ~2000 tokens per session.
**Fix class:** Information architecture (consider consolidation or lazy loading)

### IA-002: CLAUDE.md is overloaded
**What:** CLAUDE.md contains project instructions, execution rules, PM process, git policy,
testing requirements, anti-patterns, reference citations, and the REPL observation
directive. At ~800 lines, it's the largest single prompt injection in the session. Much
of it is process overhead that's irrelevant to any given task.
**Evidence:** CLAUDE.md token count likely exceeds 5K tokens, present in every turn.
**Impact:** MEDIUM — Consumes significant cache space with content that's often irrelevant
to the immediate task.
**Fix class:** Information architecture (split CLAUDE.md into role-based sections that
load contextually)
