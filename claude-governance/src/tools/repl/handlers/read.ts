import { findTool, checkAbort, tracked, makeParentMessage, getCurrentContext } from '../vm';

export async function read(filePath: string, opts?: { offset?: number; limit?: number; pages?: string }): Promise<string> {
  checkAbort();
  const args: Record<string, unknown> = { file_path: filePath };
  if (opts?.offset !== undefined) args.offset = opts.offset;
  if (opts?.limit !== undefined) args.limit = opts.limit;
  if (opts?.pages !== undefined) args.pages = opts.pages;

  return tracked('read', args, async () => {
    const tool = findTool('Read');
    if (!tool) throw new Error('Read tool not found in registry');
    const result = await tool.call(args, getCurrentContext(), undefined, makeParentMessage());
    try {
      if (result?.data?.file?.content !== undefined) return result.data.file.content;
      if (result?.data !== undefined) return typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2);
      return String(result);
    } catch { return String(result); }
  });
}
