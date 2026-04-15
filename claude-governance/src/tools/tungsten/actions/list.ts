import { SOCKET_NAME, isInitialized, checkTmux, tmuxCmdSafe } from '../tmux';

export async function handleList() {
  if (!isInitialized() || !checkTmux()) {
    return { data: 'No active Tungsten sessions.' };
  }
  const result = tmuxCmdSafe([
    'list-sessions', '-F',
    '#{session_name}: #{session_windows} window(s)',
  ]);
  if (!result.ok) {
    return { data: 'No active Tungsten sessions.' };
  }
  return { data: `Active sessions (socket: ${SOCKET_NAME}):\n${result.stdout}` };
}
