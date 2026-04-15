import { getOrCreateVM, getOperations } from './vm';
import { getMaxResultSize } from './config';

export function formatResult(
  description: string | undefined,
  startTime: number,
  returnValue: unknown,
  error: unknown,
  handlers: Record<string, Function>
): string {
  const duration = Date.now() - startTime;
  const ctx = getOrCreateVM(handlers);
  const capturedConsole = ctx.console;
  const maxSize = getMaxResultSize();
  const operations = getOperations();

  const parts: string[] = [];

  const header = description ? `=== REPL: ${description} ===` : '=== REPL ===';
  const failCount = operations.filter(op => !op.success).length;
  const opSummary = failCount > 0
    ? `${operations.length} (${failCount} failed)`
    : String(operations.length);
  parts.push(header);
  parts.push(`Duration: ${duration}ms | Operations: ${opSummary}`);

  if (operations.length > 0) {
    parts.push('');
    parts.push('--- Operations ---');
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const argStr = String(op.args.command || op.args.file_path || op.args.prompt || '');
      const truncArg = argStr.length > 60 ? argStr.substring(0, 57) + '...' : argStr;
      if (op.success) {
        const summary = op.resultSummary || 'ok';
        const truncSummary = summary.length > 60 ? summary.substring(0, 57) + '...' : summary;
        parts.push(`${i + 1}. ${op.tool}(${truncArg}) → ${truncSummary} [${op.duration}ms]`);
      } else {
        parts.push(`${i + 1}. ${op.tool}(${truncArg}) → ERROR: ${op.error} [${op.duration}ms]`);
      }
    }
  }

  const stdout = capturedConsole.getStdout();
  const stderr = capturedConsole.getStderr();
  if (stdout || stderr) {
    parts.push('');
    parts.push('--- Console Output ---');
    if (stdout) parts.push(stdout);
    if (stderr) parts.push('[stderr] ' + stderr);
  }

  if (error) {
    parts.push('');
    parts.push('--- Error ---');
    const e = error as { stack?: string; message?: string };
    parts.push(e.stack || e.message || String(error));
  } else if (returnValue !== undefined) {
    parts.push('');
    parts.push('--- Result ---');
    const rendered = typeof returnValue === 'string'
      ? returnValue
      : JSON.stringify(returnValue, null, 2);
    parts.push(rendered);
  }

  let result = parts.join('\n');

  if (result.length > maxSize) {
    result = result.substring(0, maxSize - 50) +
      `\n\n[Truncated — ${result.length} chars exceeded ${maxSize} limit]`;
  }

  return result;
}
