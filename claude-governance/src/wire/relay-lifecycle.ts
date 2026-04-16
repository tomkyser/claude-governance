import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawn } from 'node:child_process';

// ====================================================================
// Paths
// ====================================================================

const WIRE_DIR = path.join(os.homedir(), '.claude-governance', 'wire');
const PID_FILE = path.join(WIRE_DIR, 'relay.pid');
const PORT_FILE = path.join(WIRE_DIR, 'relay.port');

// ====================================================================
// State queries
// ====================================================================

export function isRelayRunning(): boolean {
  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
    if (isNaN(pid)) return false;
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === 'EPERM') return true;
    return false;
  }
}

export function getRelayPort(): number | null {
  try {
    const port = parseInt(
      fs.readFileSync(PORT_FILE, 'utf8').trim(),
      10,
    );
    return isNaN(port) ? null : port;
  } catch {
    return null;
  }
}

// ====================================================================
// Lifecycle
// ====================================================================

export function cleanStaleState(): void {
  if (isRelayRunning()) return;
  try {
    fs.unlinkSync(PID_FILE);
  } catch {
    /* already gone */
  }
  try {
    fs.unlinkSync(PORT_FILE);
  } catch {
    /* already gone */
  }
}

export function startRelay(relayScript: string): Promise<number> {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(WIRE_DIR, { recursive: true });

    const child = spawn('node', [relayScript], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env },
    });

    child.unref();

    const maxWait = 10_000;
    const interval = 100;
    let elapsed = 0;

    const check = setInterval(() => {
      elapsed += interval;

      const port = getRelayPort();
      if (port !== null) {
        clearInterval(check);
        resolve(port);
        return;
      }

      if (elapsed >= maxWait) {
        clearInterval(check);
        reject(new Error('Relay failed to start within 10s'));
      }
    }, interval);
  });
}

export async function ensureRelay(
  relayScript: string,
): Promise<number> {
  if (isRelayRunning()) {
    const port = getRelayPort();
    if (port !== null) {
      try {
        const response = await fetch(
          `http://127.0.0.1:${port}/health`,
        );
        if (response.ok) return port;
      } catch {
        // PID alive but not responding — restart
      }
    }
  }

  cleanStaleState();

  try {
    return await startRelay(relayScript);
  } catch (err) {
    if (isRelayRunning()) {
      const port = getRelayPort();
      if (port !== null) return port;
    }
    throw err;
  }
}
