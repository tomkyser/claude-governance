import { findTool, checkAbort, tracked, makeParentMessage, getCurrentContext } from '../vm';

interface AgentOpts {
  description?: string;
  subagent_type?: string;
  model?: string;
  name?: string;
  run_in_background?: boolean;
  team_name?: string;
  mode?: string;
  isolation?: string;
}

function extractAgentText(data: unknown): string {
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return extractAgentText(parsed);
    } catch {
      return data;
    }
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.content)) {
      const texts = obj.content
        .filter((c: unknown) => c && typeof c === 'object' && (c as Record<string, unknown>).type === 'text')
        .map((c: unknown) => String((c as Record<string, unknown>).text || ''));
      if (texts.length > 0) return texts.join('\n');
    }
    if (typeof obj.result === 'string') return obj.result;
    if (typeof obj.text === 'string') return obj.text;
    return JSON.stringify(data, null, 2);
  }
  return String(data);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeCanUseTool(): (...args: any[]) => Promise<any> {
  return async (_tool: unknown, input: unknown) => ({
    behavior: 'allow',
    updatedInput: input,
    decisionReason: { type: 'mode', mode: 'bypassPermissions' },
  });
}

export async function agent(prompt: string, opts?: AgentOpts): Promise<string> {
  checkAbort();
  if (!prompt) throw new Error('agent() requires a prompt string');
  const args: Record<string, unknown> = { prompt };
  if (opts) {
    for (const key of ['description', 'subagent_type', 'model', 'name',
      'run_in_background', 'team_name', 'mode', 'isolation'] as const) {
      if (opts[key] !== undefined) args[key] = opts[key];
    }
    if (!args.description) args.description = prompt.substring(0, 50);
  } else {
    args.description = prompt.substring(0, 50);
  }

  return tracked('agent', args, async () => {
    const tool = findTool('Agent');
    if (!tool) throw new Error('Agent tool not found in registry');
    const result = await tool.call(args, getCurrentContext(), makeCanUseTool(), makeParentMessage());
    return extractAgentText(result?.data);
  });
}
