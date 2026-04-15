import { findTool, checkAbort, tracked, makeParentMessage, getCurrentContext } from '../vm';

export async function write(filePath: string, content: string): Promise<string> {
  checkAbort();
  const args = { file_path: filePath, content };

  return tracked('write', args, async () => {
    const tool = findTool('Write');
    if (!tool) throw new Error('Write tool not found in registry');
    const result = await tool.call(args, getCurrentContext(), undefined, makeParentMessage());
    try { return `${result.data.type}: ${result.data.filePath}`; }
    catch { return typeof result.data === 'string' ? result.data : JSON.stringify(result.data); }
  });
}
