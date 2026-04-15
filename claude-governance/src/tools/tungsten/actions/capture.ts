import { capture as tmuxCapture } from '../tmux';
import { getCurrentContext } from '../state';
import { ensureSession } from '../validate';

export async function handleCapture(args: { session?: string; lines?: number }) {
  const session = args.session || 'main';
  const lines = args.lines || 50;
  ensureSession(session);

  const output = tmuxCapture(session, lines);

  const ctx = getCurrentContext();
  if (ctx && typeof ctx.setAppState === 'function') {
    try {
      ctx.setAppState(function(prev) {
        return Object.assign({}, prev, { tungstenLastCapturedTime: Date.now() });
      });
    } catch {}
  }

  return {
    data: output || '(empty — no output in terminal)',
  };
}
