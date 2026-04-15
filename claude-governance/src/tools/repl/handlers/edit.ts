import { findTool, checkAbort, tracked, makeParentMessage, getCurrentContext } from '../vm';

export async function edit(filePath: string, oldString: string, newString: string, opts?: { replace_all?: boolean }): Promise<string> {
  checkAbort();
  const args: Record<string, unknown> = { file_path: filePath, old_string: oldString, new_string: newString };
  if (opts?.replace_all !== undefined) args.replace_all = opts.replace_all;

  return tracked('edit', args, async () => {
    const tool = findTool('Edit');
    if (!tool) throw new Error('Edit tool not found in registry');
    const result = await tool.call(args, getCurrentContext(), undefined, makeParentMessage());
    try { return `edited: ${result.data.filePath}`; }
    catch { return typeof result.data === 'string' ? result.data : JSON.stringify(result.data); }
  });
}
