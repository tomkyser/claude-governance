import { findTool, checkAbort, tracked, makeParentMessage, getCurrentContext } from '../vm';

interface NotebookEditOps {
  new_source?: string;
  source?: string;
  cell_id?: string;
  cell_type?: 'code' | 'markdown';
  edit_mode?: 'replace' | 'insert' | 'delete';
}

export async function notebook_edit(notebookPath: string, editOps: NotebookEditOps): Promise<string> {
  checkAbort();
  if (!editOps || typeof editOps !== 'object') {
    throw new Error('notebook_edit requires editOps: { new_source, cell_id?, cell_type?, edit_mode? }');
  }
  const ops = { ...editOps };
  if (ops.source !== undefined && ops.new_source === undefined) {
    ops.new_source = ops.source;
    delete ops.source;
  }
  if (!ops.new_source && ops.edit_mode !== 'delete') {
    throw new Error('notebook_edit requires new_source (the cell content to write)');
  }
  const args: Record<string, unknown> = { notebook_path: notebookPath, ...ops };

  return tracked('notebook_edit', args, async () => {
    const tool = findTool('NotebookEdit');
    if (!tool) throw new Error('NotebookEdit tool not found in registry');
    const result = await tool.call(args, getCurrentContext(), undefined, makeParentMessage());
    try {
      if (result.data?.error) return 'Error: ' + result.data.error;
      return typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
    } catch { return String(result); }
  });
}
