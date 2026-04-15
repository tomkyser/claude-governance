import { findTool, checkAbort, tracked, makeParentMessage, getCurrentContext } from '../vm';

export async function grep(pattern: string, searchPath?: string, opts?: { flags?: string }): Promise<string> {
  checkAbort();
  const safePath = searchPath || '.';
  const flags = opts?.flags || '-rn';
  const cmd = `grep ${flags} ${JSON.stringify(pattern)} ${JSON.stringify(safePath)}`;
  const args = { command: cmd };

  return tracked('grep', args, async () => {
    const tool = findTool('Bash');
    if (!tool) throw new Error('Bash tool not found in registry');
    try {
      const result = await tool.call(args, getCurrentContext(), undefined, makeParentMessage());
      return result.data.stdout || '';
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('Shell command failed')) return '';
      throw e;
    }
  });
}
