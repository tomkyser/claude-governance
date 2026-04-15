import { SOCKET_NAME, isInitialized, tmuxCmdSafe } from '../tmux';
import { validateSessionName, createSession } from '../validate';

export async function handleCreate(args: { session?: string }) {
  const session = args.session || 'main';
  validateSessionName(session);
  if (isInitialized()) {
    const exists = tmuxCmdSafe(['has-session', '-t', session]);
    if (exists.ok) {
      return {
        data: `Session "${session}" already exists on socket ${SOCKET_NAME}.`,
      };
    }
  }
  createSession(session);
  return {
    data: `Session "${session}" created on socket ${SOCKET_NAME}.\n` +
      'Environment variables, working directory, and processes will persist across tool calls.',
  };
}
