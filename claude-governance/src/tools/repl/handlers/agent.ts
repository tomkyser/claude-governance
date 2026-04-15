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
    const result = await tool.call(args, getCurrentContext(), undefined, makeParentMessage());
    try { return typeof result.data === 'string' ? result.data : JSON.stringify(result.data); }
    catch { return String(result); }
  });
}
