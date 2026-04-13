# REPL Benchmark Results — First Half
Date: 2026-04-13
Tool version: Post-fix (write/edit/notebook_edit rebuilt)
Session: REPL-only (bare primitives disabled)

## Function Status

| Function | Status | Notes |
|---|---|---|
| read() | WORKING | 10K token cap on large files |
| write() | WORKING | Fixed — was A.uuid crash |
| edit() | WORKING | Fixed — was A.uuid crash |
| bash() | WORKING | Full shell access |
| grep() | WORKING | Wraps system grep |
| glob() | DEGRADED | ** recursive patterns fail (G15) |
| notebook_edit() | WORKING | Fixed — was A.uuid crash |

## Benchmark 1: READ

| Test | Time | Result |
|---|---|---|
| Small file (96B) | ~3ms | Correct |
| Medium file (200 lines) | ~4ms | Correct |
| Large file (170KB) | ~5ms | Capped at ~10K tokens |
| With offset/limit | ~3ms | Correct |
| 10 files sequential | ~5ms total | All correct |

## Benchmark 2: BASH / GREP / GLOB

| Test | Time | Result |
|---|---|---|
| Simple command (echo) | 12ms | Correct |
| Pipeline (find|wc) | 36ms | Correct |
| grep pattern search | 21-45ms | Correct |
| grep -rn recursive | ~30ms | Correct |
| glob simple pattern | ~15ms | Correct |
| glob ** recursive | FAIL | Known gap G15 |
| glob with cwd | ~412ms | Works but slow (uses find) |

## Benchmark 3: WRITE (post-fix)

| Test | Time | Result |
|---|---|---|
| Create new file | 7ms | Correct |
| Overwrite existing | 3ms | Correct |
| Multi-line (50 lines) | 10ms | Correct, 50 lines verified |
| Nested path (auto-mkdir) | 7ms | Correct |
| Batch 5 files | 14ms total | All correct |

## Benchmark 4: EDIT (post-fix)

| Test | Time | Result |
|---|---|---|
| Single replacement | 2ms | Correct |
| replace_all (4 occurrences) | 3ms | All 4 replaced |
| Multiline target | 1ms | Correct |
| Not-found error | 0ms | Proper error thrown |
| Batch 5 files | 2ms total | All correct |

## Benchmark 5: NOTEBOOK_EDIT (post-fix)

| Test | Time | Result |
|---|---|---|
| Replace cell content | 2ms | Correct |

## Benchmark 6: ERROR HANDLING

| Test | Result |
|---|---|
| Read missing file | Error caught gracefully |
| Edit missing string | "String not found" error |
| Write to nested path | Auto-creates directories |

## Benchmark 7: COMPOSITE BATCH (the key comparison)

### 7a: Glob→Read→Edit→Verify pipeline (10 files)
- **Total time:** 447ms (412ms was glob/find overhead)
- **Operations:** 41 (10 write + 1 glob + 10 read + 10 edit + 10 verify)
- **REPL tool calls:** 1
- **All correct:** YES

### 7b: Cross-file rename (grep→edit→verify, 8 files)
- **Total time:** 35ms
- **Operations:** 23 (8 write + 1 grep + 7 edit + 7 verify)
- **REPL tool calls:** 1
- **7/8 files had references, all renamed correctly:** YES

### 7c: Operation count comparison
- Total inner operations across 7a + 7b: **64**
- REPL tool calls used: **3** (setup + pipeline + rename)
- Bare primitive calls that would be needed: **64**
- Estimated bare primitive wall time: 64 × 3-8s model turn = **192-512 seconds**
- Actual REPL wall time: **~482ms** execution + 3 model turns (~15s)

## Key Findings

### REPL Advantages
1. **Batch throughput:** 64 operations in 482ms vs estimated 192-512s with bare primitives
2. **Pipeline logic:** Conditional flows (grep→filter→edit) in a single call
3. **Loop constructs:** for/while loops over file sets without model re-inference
4. **Error handling:** try/catch within a single execution context
5. **State within call:** Variables persist across operations in one script

### REPL Disadvantages
1. **No user approval per-operation:** Bare primitives show diffs for approval; REPL batches silently
2. **Glob degradation:** ** patterns don't work (G15)
3. **Large file cap:** read() truncates at ~10K tokens
4. **No streaming:** Can't see partial results during execution
5. **Debugging:** Errors in complex scripts harder to diagnose than single tool failures

### For Second Half
Run identical benchmarks 1-7 using bare Read/Write/Edit/Bash tools.
Key metrics to capture:
- Per-call wall time (including model inference overhead)
- Total wall time for composite scenarios
- Whether user approval flow adds overhead
- Whether Read handles large files differently
- Glob behavior with ** patterns via bare tool
