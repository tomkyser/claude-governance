import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { SOCKET_NAME, getSocketPath, getServerPid } from './tmux';

export interface TungstenContext {
  setAppState?: (fn: (prev: Record<string, unknown>) => Record<string, unknown>) => void;
  abortController?: { signal: { aborted: boolean } };
  [key: string]: unknown;
}

let currentContext: TungstenContext | null = null;

export function getCurrentContext(): TungstenContext | null { return currentContext; }
export function setCurrentContext(ctx: TungstenContext | null): void { currentContext = ctx; }

export function getConfigDir(): string {
  const envDir = process.env['CLAUDE_GOVERNANCE_CONFIG_DIR'];
  return envDir || path.join(os.homedir(), '.claude-governance');
}

export function writeAppState(sessionName: string): void {
  if (!currentContext) return;
  try {
    if (typeof currentContext.setAppState === 'function') {
      currentContext.setAppState(function(prev) {
        return Object.assign({}, prev, {
          tungstenActiveSession: {
            sessionName: sessionName,
            socketName: SOCKET_NAME,
            target: `${sessionName}:0.0`,
          },
          tungstenPanelVisible: true,
        });
      });
    }
  } catch {}
}

export function writeLastCommand(command: string): void {
  if (!currentContext) return;
  try {
    if (typeof currentContext.setAppState === 'function') {
      currentContext.setAppState(function(prev) {
        return Object.assign({}, prev, {
          tungstenLastCommand: { command: command, timestamp: Date.now() },
          tungstenLastCapturedTime: Date.now(),
        });
      });
    }
  } catch {}
}

export function writeStateFile(sessionName: string): void {
  try {
    const stateDir = getConfigDir();
    const statePath = path.join(stateDir, 'tungsten-state.json');
    const state = {
      socket: SOCKET_NAME,
      socketPath: getSocketPath(),
      serverPid: getServerPid(),
      activeSession: sessionName,
      pid: process.pid,
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  } catch {}
}

export function clearStateFile(): void {
  try {
    const statePath = path.join(getConfigDir(), 'tungsten-state.json');
    if (fs.existsSync(statePath)) fs.unlinkSync(statePath);
  } catch {}
}
