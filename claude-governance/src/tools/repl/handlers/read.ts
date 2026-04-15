import * as fs from 'node:fs';
import * as nodePath from 'node:path';
import { findTool, checkAbort, tracked, makeParentMessage, getCurrentContext } from '../vm';
import { getMaxReadFileSize } from '../config';
import { agent } from './agent';

const HARD_CAP = 10 * 1024 * 1024;
const AGENT_CHUNK_SIZE = 256 * 1024;

function unlimitedContext(): Record<string, unknown> {
  const ctx = getCurrentContext();
  return {
    ...ctx,
    fileReadingLimits: { maxSizeBytes: HARD_CAP, maxTokens: Infinity },
  };
}

async function nativeRead(args: Record<string, unknown>): Promise<string> {
  const tool = findTool('Read');
  if (!tool) throw new Error('Read tool not found in registry');
  const result = await tool.call(args, unlimitedContext(), undefined, makeParentMessage());
  try {
    if (result?.data?.file?.content !== undefined) return result.data.file.content;
    if (result?.data !== undefined) return typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2);
    return String(result);
  } catch { return String(result); }
}

async function agentChunkedRead(filePath: string, fileSize: number): Promise<string> {
  const bashTool = findTool('Bash');
  if (!bashTool) throw new Error('Bash tool not found');

  let totalLines: number;
  try {
    const wcResult = await bashTool.call(
      { command: `wc -l < ${JSON.stringify(filePath)}` },
      getCurrentContext(), undefined, makeParentMessage()
    );
    totalLines = parseInt((wcResult.data.stdout || '0').trim(), 10);
  } catch {
    throw new Error(`Cannot determine line count for ${filePath}`);
  }

  if (totalLines <= 0) throw new Error(`File appears empty or binary: ${filePath}`);

  const numChunks = Math.ceil(fileSize / AGENT_CHUNK_SIZE);
  const linesPerChunk = Math.ceil(totalLines / numChunks);
  const basename = nodePath.basename(filePath);
  const chunks: string[] = [];

  for (let i = 0; i < numChunks; i++) {
    checkAbort();
    const startLine = i * linesPerChunk + 1;
    const endLine = Math.min((i + 1) * linesPerChunk, totalLines);

    const result = await agent(
      `Read lines ${startLine}-${endLine} of ${filePath} using the Read tool ` +
      `with parameters: file_path="${filePath}", offset=${startLine}, limit=${endLine - startLine + 1}. ` +
      `Return ONLY the raw file content. No commentary, no formatting, no markdown.`,
      { description: `Read ${basename} chunk ${i + 1}/${numChunks}` }
    );
    chunks.push(result);
  }

  return chunks.join('\n');
}

export async function read(filePath: string, opts?: { offset?: number; limit?: number; pages?: string }): Promise<string> {
  checkAbort();

  const resolved = nodePath.isAbsolute(filePath) ? filePath : nodePath.resolve(process.cwd(), filePath);
  const args: Record<string, unknown> = { file_path: resolved };
  if (opts?.offset !== undefined) args.offset = opts.offset;
  if (opts?.limit !== undefined) args.limit = opts.limit;
  if (opts?.pages !== undefined) args.pages = opts.pages;

  return tracked('read', args, async () => {
    let fileSize: number;
    try {
      fileSize = fs.statSync(resolved).size;
    } catch {
      return nativeRead(args);
    }

    if (fileSize > HARD_CAP) {
      throw new Error(
        `File too large: ${Math.round(fileSize / 1024 / 1024)}MB exceeds ${Math.round(HARD_CAP / 1024 / 1024)}MB hard cap. ` +
        `Process with bash() pipelines (grep, awk, sed) or read sections with read(path, {offset, limit}).`
      );
    }

    try {
      return await nativeRead(args);
    } catch (err) {
      if (fileSize > getMaxReadFileSize()) {
        return agentChunkedRead(resolved, fileSize);
      }
      throw err;
    }
  });
}
