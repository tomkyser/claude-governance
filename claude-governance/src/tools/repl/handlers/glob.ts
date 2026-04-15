import * as nodePath from 'node:path';
import { findTool, checkAbort, tracked, makeParentMessage, getCurrentContext } from '../vm';

interface GlobOpts {
  cwd?: string;
  noIgnore?: boolean;
  hidden?: boolean;
  maxDepth?: number;
  ignore?: string[];
}

export async function glob(pattern: string, opts?: GlobOpts): Promise<string> {
  checkAbort();
  const dir = opts?.cwd || '.';
  const parts = ['rg', '--files'];
  const isCatchAll = (pattern === '*' || pattern === '**/*' || pattern === '**');
  if (!isCatchAll) {
    parts.push('--glob', JSON.stringify(pattern));
  }
  parts.push('--sort=modified');
  if (opts?.noIgnore) parts.push('--no-ignore');
  if (opts?.hidden) parts.push('--hidden');
  if (opts?.maxDepth) parts.push('--max-depth', String(opts.maxDepth));
  if (opts?.ignore && Array.isArray(opts.ignore)) {
    for (const excl of opts.ignore) {
      parts.push('--glob', JSON.stringify('!' + excl));
    }
  }
  parts.push(JSON.stringify(dir));
  const cmd = parts.join(' ');
  const args = { command: cmd };

  return tracked('glob', args, async () => {
    const tool = findTool('Bash');
    if (!tool) throw new Error('Bash tool not found in registry');
    try {
      const result = await tool.call(args, getCurrentContext(), undefined, makeParentMessage());
      const output = (result.data.stdout || '').trim();
      if (!output) return '';

      const absDir = nodePath.isAbsolute(dir) ? dir : nodePath.resolve(process.cwd(), dir);
      return output.split('\n').map((line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        return nodePath.isAbsolute(trimmed) ? trimmed : nodePath.resolve(absDir, trimmed);
      }).filter(Boolean).join('\n');
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('Shell command failed')) return '';
      throw e;
    }
  });
}
