import { tmuxCmd, capture, sleep } from '../tmux';
import { writeLastCommand } from '../state';
import { ensureSession } from '../validate';

export async function handleSend(args: { session?: string; command?: string; lines?: number }) {
  const session = args.session || 'main';
  const command = args.command;
  if (!command) {
    throw new Error('The "command" parameter is required for the "send" action.');
  }
  ensureSession(session);

  tmuxCmd(['send-keys', '-t', session, '-l', command]);
  tmuxCmd(['send-keys', '-t', session, 'Enter']);

  writeLastCommand(command);

  await sleep(150);
  const output = capture(session, args.lines || 30);

  return {
    data: `$ ${command}\n${output}`,
  };
}
