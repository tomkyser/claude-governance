import { execFileSync } from 'node:child_process';
import * as path from 'node:path';

export const SOCKET_NAME = `claude-${process.pid}`;
export const TMUX_ENV_KEY = '__CLAUDE_GOVERNANCE_TMUX_ENV';

let socketPath: string | null = null;
let serverPid: number | null = null;
let initialized = false;
let tmuxChecked = false;
let tmuxAvailable = false;
let cleanupRegistered = false;

export function getSocketPath(): string | null { return socketPath; }
export function getServerPid(): number | null { return serverPid; }
export function isInitialized(): boolean { return initialized; }

export function checkTmux(): boolean {
  if (tmuxChecked) return tmuxAvailable;
  tmuxChecked = true;
  try {
    execFileSync('which', ['tmux'], { stdio: 'pipe' });
    tmuxAvailable = true;
  } catch { tmuxAvailable = false; }
  return tmuxAvailable;
}

export function tmuxCmd(args: string[], opts?: Record<string, unknown>): string {
  return execFileSync('tmux', ['-L', SOCKET_NAME, ...args], {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 10000,
    ...opts,
  }) as string;
}

export function tmuxCmdSafe(args: string[]): { ok: boolean; stdout?: string; stderr?: string } {
  try {
    return { ok: true, stdout: tmuxCmd(args).trim() };
  } catch (e: unknown) {
    const err = e as { stderr?: string; message?: string };
    return { ok: false, stderr: (err.stderr || err.message || '').trim() };
  }
}

export function initSocket(): void {
  if (initialized) return;
  if (!checkTmux()) {
    throw new Error(
      'tmux is not installed. Tungsten requires tmux for persistent sessions.\n' +
      'Install: brew install tmux (macOS) | apt install tmux (Debian/Ubuntu)'
    );
  }
  initialized = true;
  registerCleanup();
}

export function discoverSocketInfo(): void {
  try {
    const info = tmuxCmd(
      ['display-message', '-p', '#{socket_path},#{pid}'],
      { timeout: 5000 }
    ).trim();
    const [sp, pidStr] = info.split(',');
    if (sp && pidStr) {
      socketPath = sp;
      serverPid = parseInt(pidStr, 10);
      process.env[TMUX_ENV_KEY] = `${socketPath},${serverPid},0`;
    }
  } catch {
    const uid = process.getuid?.() ?? 0;
    const tmpDir = process.env.TMPDIR || '/tmp';
    socketPath = path.join(tmpDir, `tmux-${uid}`, SOCKET_NAME);
  }
}

export function capture(session: string, lines: number): string {
  try {
    const output = tmuxCmd(
      ['capture-pane', '-t', session, '-p', '-S', `-${lines}`]
    );
    return output.replace(/\n+$/, '');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    return `[capture failed: ${msg.split('\n')[0]}]`;
  }
}

function registerCleanup(): void {
  if (cleanupRegistered) return;
  cleanupRegistered = true;

  const cleanup = () => {
    try {
      execFileSync('tmux', ['-L', SOCKET_NAME, 'kill-server'], {
        stdio: 'pipe',
        timeout: 5000,
      });
    } catch {}
    delete process.env[TMUX_ENV_KEY];
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(130); });
  process.on('SIGTERM', () => { cleanup(); process.exit(143); });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
