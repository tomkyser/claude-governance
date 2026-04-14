# REPL vs Bare Primitives — Benchmark Results
Date: 2026-04-13 (original), updated 2026-04-13
Methodology: Identical operations run through both tool modes in the same session.

## Architecture Note

Both REPL and bare primitives use **the same CC native tool implementations**. REPL's
internal functions (`read()`, `write()`, `edit()`, `bash()`, `grep()`, `glob()`) delegate
to CC's actual tools via `tool.call()` — the same code path that bare Read/Write/Edit use.
Permission checks, file tracking, error formatting — all inherited.

Search operations use CC's embedded tools: `grep()` delegates to the Bash tool which
sources a shell snapshot containing `grep→ugrep 7.5.0` and `find→bfs 4.1` shadow
functions (see F18). `glob()` uses `rg --files --glob` (ripgrep 14.1.1) matching CC's
native GlobTool semantics.

The difference between REPL and bare primitives is **structural**, not implementation:
REPL batches multiple operations into a single tool call, reducing context consumption
from O(2N+2) to O(1).

---

## First Half: REPL-Only Session (primitives disabled)

### Function Status (post-fix)

| Function | Status | Notes |
|---|---|---|
| read() | WORKING | Delegates to CC's Read tool. 10K token cap on large files |
| write() | WORKING | Delegates to CC's Write tool |
| edit() | WORKING | Delegates to CC's Edit tool |
| bash() | WORKING | Delegates to CC's Bash tool (full shell access) |
| grep() | WORKING | Via Bash tool → ugrep 7.5.0 (embedded, via shell snapshot) |
| glob() | WORKING | rg --files --glob (ripgrep 14.1.1). Supports ** recursion. Respects .gitignore by default |
| notebook_edit() | WORKING | Delegates to CC's NotebookEdit tool |

### Benchmark 1: READ (REPL)

| Test | Time | Result |
|---|---|---|
| Small file (96B) | ~3ms | Correct |
| Medium file (200 lines) | ~4ms | Correct |
| Large file (170KB) | ~5ms | Capped at ~10K tokens (silent truncation) |
| With offset/limit | ~3ms | Correct |
| 10 files sequential | ~5ms total | All correct |

### Benchmark 2: BASH / GREP / GLOB (REPL)

| Test | Time | Result |
|---|---|---|
| Simple command (echo) | 12ms | Correct |
| Pipeline (find\|wc) | 36ms | Correct |
| grep pattern search | 21-45ms | Correct (ugrep 7.5.0 via shell snapshot) |
| grep -rn recursive | ~30ms | Correct |
| glob simple pattern | ~15ms | Correct |
| glob ** recursive | WORKING | rg --files --glob handles ** natively |
| glob with cwd | ~15ms | Uses rg --files --glob |

### Benchmark 3: WRITE (REPL, post-fix)

| Test | Time | Result |
|---|---|---|
| Create new file | 7ms | Correct |
| Overwrite existing | 3ms | Correct |
| Multi-line (50 lines) | 10ms | Correct, 50 lines verified |
| Nested path (auto-mkdir) | 7ms | Correct |
| Batch 5 files | 14ms total | All correct |

### Benchmark 4: EDIT (REPL, post-fix)

| Test | Time | Result |
|---|---|---|
| Single replacement | 2ms | Correct |
| replace_all (4 occurrences) | 3ms | All 4 replaced |
| Multiline target | 1ms | Correct |
| Not-found error | 0ms | Proper error thrown |
| Batch 5 files | 2ms total | All correct |

### Benchmark 5: NOTEBOOK_EDIT (REPL, post-fix)

| Test | Time | Result |
|---|---|---|
| Replace cell content | 2ms | Correct |

### Benchmark 6: ERROR HANDLING (REPL)

| Test | Result |
|---|---|
| Read missing file | Error caught gracefully |
| Edit missing string | "String not found" error |
| Write to nested path | Auto-creates directories |

### Benchmark 7: COMPOSITE BATCH (REPL)

#### 7a: Glob->Read->Edit->Verify pipeline (10 files)
- **Total execution time:** 447ms
- **Inner operations:** 41 (10 write + 1 glob + 10 read + 10 edit + 10 verify)
- **REPL tool calls:** 1
- **All correct:** YES

#### 7b: Cross-file rename (grep->edit->verify, 8 files)
- **Total execution time:** 35ms
- **Inner operations:** 23 (8 write + 1 grep + 7 edit + 7 verify)
- **REPL tool calls:** 1
- **All correct:** YES

#### 7c: Totals
- Total inner operations: **64**
- REPL tool calls consumed: **3** (setup + pipeline + rename)
- Actual REPL wall time: **~482ms** execution + 3 model turns

---

## Second Half: Bare Primitives Session (REPL also available)

### Benchmark 1: READ (Bare Read)

| Test | Tool Calls | Result |
|---|---|---|
| Small file (58B) | 1 | Correct, with line numbers |
| Medium file (200 lines, 19KB) | 1 | All 200 lines returned |
| Large file (429KB) | 1 | **ERROR: 256KB hard limit** — refuses file |
| With offset/limit | 1 | Correct (lines 50-59) |
| 4 reads parallel | 4 (1 turn) | All 4 dispatched and returned in parallel |

**Key difference:** Bare Read has a hard 256KB file size limit and returns an error.
REPL's read() silently truncates at ~10K tokens but doesn't error. Bare Read returns
line-numbered output by default (useful for Edit references). Bare Read supports
parallel dispatch — multiple reads in one model turn.

### Benchmark 2: WRITE (Bare Write)

| Test | Tool Calls | Result |
|---|---|---|
| Create new file | 1 | Correct |
| Multi-line (10 lines) | 1 | Correct |
| Nested path (existing dirs) | 1 | Correct |
| 3 writes parallel | 3 (1 turn) | All succeeded in parallel |

**Key difference:** Bare Write confirms with "file state is current in your context."
This means a subsequent Edit does NOT require a Read for Write-created files.
REPL's write() requires no such tracking — it just writes.

### Benchmark 3: EDIT (Bare Edit)

| Test | Tool Calls | Result |
|---|---|---|
| Single replacement (Write-created file) | 1 | Correct — no Read prerequisite |
| replace_all (Write-created file) | 1 | All occurrences replaced |
| Multiline expansion | 1 + **1 Read** | **Required Read first** for Bash-created file |
| 9 edits parallel (pre-Read files) | 9 (1 turn) | All succeeded in parallel |

**Key difference:** Bare Edit enforces a Read-before-edit gate on files not created by
Write in the current session. This adds 1 extra tool call per file for pre-existing files.
REPL's edit() has no such prerequisite — it operates directly.

### Benchmark 4: BASH (Bare Bash)

| Test | Tool Calls | Result |
|---|---|---|
| Simple echo | 1 | Correct |
| Pipeline (find\|wc) | 1 | Correct |
| grep -rn recursive | 1 | Correct (9 matches) |
| find pattern match | 1 | Correct (10 files sorted) |
| 4 bash parallel | 4 (1 turn) | All succeeded in parallel |

**Key difference:** Functionally identical. Both support parallel dispatch.

### Benchmark 5: ERROR HANDLING (Bare Primitives)

| Test | Result |
|---|---|
| Read missing file | "File does not exist" error with cwd hint |
| Edit missing string | "String to replace not found" error |
| Edit without prior Read | **Blocked** — "File has not been read yet" |

**Key difference:** Bare primitives give more informative error messages (include cwd,
suggest fixes). REPL errors are raw exceptions.

### Benchmark 6: COMPOSITE BATCH (Bare Primitives)

#### 6a: grep->read->edit->verify across 9 files
- **Step 1:** grep for targets -> 1 Bash call -> 9 files found
- **Step 2:** Read all 9 files -> 9 Read calls (1 turn, parallel)
- **Step 3:** Edit all 9 files -> 9 Edit calls (1 turn, parallel)
- **Step 4:** Verify -> 1 Bash call
- **Total tool calls:** 20
- **Total model turns:** 4
- **All correct:** YES (9/9 replaced, 0 remaining)

---

## Head-to-Head Comparison

### Per-Operation Characteristics

| Dimension | Bare Primitives | REPL Functions |
|---|---|---|
| **Implementation** | CC native tools | CC native tools (via delegation) |
| **Read: large file** | 256KB hard limit (error) | ~10K token soft cap (truncation) |
| **Read: output format** | Line-numbered (cat -n style) | Raw content string |
| **Write: tracking** | Creates file state (skips Read req) | No state tracking |
| **Edit: prerequisites** | Read-before-edit required | No prerequisites |
| **Edit: user approval** | Shows diff for user review | Silent (no approval flow) |
| **Grep** | Via Bash tool (ugrep 7.5.0) | Via Bash tool (ugrep 7.5.0) |
| **Glob** | Via Bash (find/bfs) | Via rg --files --glob (respects .gitignore) |
| **Error messages** | Contextual (cwd hints, suggestions) | Raw exceptions |
| **Parallel dispatch** | Yes (multi-call per turn) | Yes (within single script) |

### Batch Scenario: "Replace a string across N files"

For N=9 files (the benchmark scenario):

| Metric | Bare Primitives | REPL |
|---|---|---|
| **Tool calls** | 20 (1 grep + 9 read + 9 edit + 1 verify) | 1 |
| **Model turns** | 4 | 1 |
| **Execution time** | ~20ms tool execution + 4 turns x model inference | ~35ms total |
| **Read-before-edit overhead** | 9 extra Read calls (mandatory) | None |
| **User visibility** | Full: every edit shows diff for approval | None: batch runs silently |
| **Error granularity** | Per-file error isolation | try/catch within script |

### Scaling: Tool Calls as N Grows

| Files | Bare Primitives Tool Calls | REPL Tool Calls |
|---|---|---|
| 1 | 4 (grep + read + edit + verify) | 1 |
| 5 | 12 (1 + 5 + 5 + 1) | 1 |
| 10 | 22 (1 + 10 + 10 + 1) | 1 |
| 50 | 102 (1 + 50 + 50 + 1) | 1 |
| 100 | 202 (1 + 100 + 100 + 1) | 1 |

Bare primitives scale at **O(2N+2)** tool calls. REPL is **O(1)** tool calls.

However, bare primitives can parallelize within a turn (all N reads in 1 turn, all N
edits in 1 turn), so model turns scale at **O(4)** constant — grep, read-batch,
edit-batch, verify. The real cost is context window consumption: 202 tool call results
for N=100 vs 1 REPL result.

### Context Window Cost

This is the hidden dimension. Each tool call result consumes context:
- Bare Read returns full file content with line numbers per call
- 9 Read results = 9x the file content in context
- 9 Edit results = 9x "success" messages plus hook warnings
- REPL returns a single result string (can be as terse as needed)

For the N=9 benchmark, bare primitives injected **~40 tool result messages** into
context (including hook system-reminders). REPL injected **1**.

### When to Use Each

| Scenario | Winner | Why |
|---|---|---|
| Single file read | **Bare Read** | Line numbers, optimized, 256KB explicit limit |
| Single file edit | **Bare Edit** | Diff visibility, user approval, safety gate |
| Bulk rename/replace (5+ files) | **REPL** | O(1) tool calls, minimal context cost |
| Exploratory search | **Bare Bash** | grep/find with description audit trail |
| Scan->filter->act pipeline | **REPL** | Conditional logic in one execution |
| Files >256KB | **REPL read()** | Bare Read errors; REPL truncates but works |
| Safety-critical edits | **Bare Edit** | Read-before-edit gate prevents blind changes |
| Context-constrained session | **REPL** | 1 result vs N results in context |
| Debugging/inspection | **Bare tools** | Per-call visibility and error isolation |

---

## Findings & Recommendations

### F1: REPL write/edit parity achieved
After the parentMessage fix (F17), REPL's write() and edit() are functionally equivalent
to bare primitives for correctness. The difference is purely in safety features (approval
flow, read-before-edit gate).

### F2: Read-before-edit is the biggest primitive tax
For batch edit scenarios, the mandatory Read-before-edit prerequisite doubles the tool
call count. REPL bypasses this entirely. This single requirement accounts for most of
the scaling difference.

### F3: Context window consumption is the real cost
At N=9 files, bare primitives generated ~40 tool result messages vs REPL's 1. At N=50,
this becomes 102 results. In long sessions, this accelerates context compaction and
increases the risk of context decay.

### F4: Parallel dispatch partially closes the gap
Bare primitives support multi-tool-call-per-turn parallelism, so the model turn count
stays at O(4) regardless of N. But it doesn't help the context consumption problem.

### F5: Glob respects .gitignore by default
The glob() function uses `rg --files --glob` with .gitignore respected by default (no
`--no-ignore`). Opt-in to include ignored files with `{ noIgnore: true }`, hidden files
with `{ hidden: true }`, and custom exclusions with `{ ignore: ['pattern'] }`.

### F6: Large file handling differs in failure mode
- Bare Read: hard 256KB limit -> explicit error -> user knows to use offset/limit
- REPL read(): soft ~10K token cap -> silent truncation -> user may not realize data is missing
- Neither is strictly better — explicit errors are safer, but blocking is less useful

### F7: Same implementation, different ergonomics
Both REPL and bare primitives delegate to the same CC native tools. The only differences
are ergonomic: REPL batches operations (O(1) context cost), bare primitives give per-call
visibility (diff review, error isolation, hook enforcement).
