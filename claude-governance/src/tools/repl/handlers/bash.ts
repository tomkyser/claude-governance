import { findTool, checkAbort, tracked, makeParentMessage, getCurrentContext } from '../vm';

export async function bash(command: string, opts?: { timeout?: number; description?: string }): Promise<string> {
  checkAbort();
  const args: Record<string, unknown> = { command };
  if (opts?.timeout !== undefined) args.timeout = opts.timeout;
  if (opts?.description !== undefined) args.description = opts.description;

  return tracked('bash', args, async () => {
    const tool = findTool('Bash');
    if (!tool) throw new Error('Bash tool not found in registry');
    const result = await tool.call(args, getCurrentContext(), undefined, makeParentMessage());
    try {
      let output = result.data.stdout || '';
      if (result.data.stderr) output += (output ? '\n' : '') + result.data.stderr;
      return output;
    } catch { return typeof result.data === 'string' ? result.data : JSON.stringify(result.data); }
  });
}
