import { tmuxCmd, capture, sleep } from '../tmux';
import { ensureSession } from '../validate';

export async function handleInterrupt(args: { session?: string }) {
  const session = args.session || 'main';
  ensureSession(session);

  tmuxCmd(['send-keys', '-t', session, 'C-c'], { timeout: 5000 });

  await sleep(150);
  const output = capture(session, 10);

  return {
    data: `Interrupt (Ctrl-C) sent to "${session}".\n${output}`,
  };
}
