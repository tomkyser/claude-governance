import { initSocket, tmuxCmd, tmuxCmdSafe, discoverSocketInfo, isInitialized } from './tmux';
import { writeAppState, writeStateFile } from './state';

export function validateSessionName(name: string): void {
  if (!name || !name.trim()) {
    throw new Error('Session name cannot be empty.');
  }
  if (/[.:]/.test(name)) {
    throw new Error(
      `Invalid session name "${name}". Names cannot contain "." or ":" (tmux reserved characters).`
    );
  }
  if (name !== name.trim()) {
    throw new Error(
      `Invalid session name "${name}". Names cannot have leading/trailing whitespace.`
    );
  }
}

export function ensureSession(name: string): void {
  validateSessionName(name);
  if (!isInitialized()) initSocket();
  const result = tmuxCmdSafe(['has-session', '-t', name]);
  if (!result.ok) createSession(name);
}

export function createSession(name: string): void {
  if (!isInitialized()) initSocket();
  tmuxCmd(['new-session', '-d', '-s', name, '-x', '200', '-y', '50']);
  discoverSocketInfo();
  writeAppState(name);
  writeStateFile(name);
}
