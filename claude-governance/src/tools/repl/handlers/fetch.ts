import { findTool, checkAbort, tracked, makeParentMessage, getCurrentContext } from '../vm';

export async function fetch_url(url: string, opts?: { prompt?: string }): Promise<string> {
  checkAbort();
  const args: Record<string, unknown> = { url };
  if (opts?.prompt !== undefined) args.prompt = opts.prompt;

  return tracked('fetch', args, async () => {
    const tool = findTool('WebFetch');
    if (!tool) throw new Error('WebFetch tool not found in registry');
    const result = await tool.call(args, getCurrentContext(), undefined, makeParentMessage());
    try { return typeof result.data === 'string' ? result.data : JSON.stringify(result.data); }
    catch { return String(result); }
  });
}
