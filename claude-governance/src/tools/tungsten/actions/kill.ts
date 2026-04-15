import { TMUX_ENV_KEY, tmuxCmdSafe } from '../tmux';
import { getCurrentContext, writeAppState, writeStateFile, clearStateFile } from '../state';
import { validateSessionName } from '../validate';

export async function handleKill(args: { session?: string }) {
  const session = args.session || 'main';
  validateSessionName(session);
  const result = tmuxCmdSafe(['kill-session', '-t', session]);
  if (!result.ok) {
    return { data: `Session "${session}" not found or already killed.` };
  }

  const listResult = tmuxCmdSafe(['list-sessions', '-F', '#{session_name}']);
  if (!listResult.ok || !listResult.stdout?.trim()) {
    delete process.env[TMUX_ENV_KEY];
    clearStateFile();
    const ctx = getCurrentContext();
    if (ctx && typeof ctx.setAppState === 'function') {
      try {
        ctx.setAppState(function(prev) {
          return Object.assign({}, prev, {
            tungstenActiveSession: undefined,
            tungstenPanelVisible: false,
          });
        });
      } catch {}
    }
    return { data: `Session "${session}" killed. No sessions remaining.` };
  }

  const remaining = listResult.stdout.trim().split('\n').filter(Boolean);
  const nextSession = remaining[0];
  writeAppState(nextSession);
  writeStateFile(nextSession);

  return {
    data: `Session "${session}" killed. Active session: "${nextSession}".`,
  };
}
