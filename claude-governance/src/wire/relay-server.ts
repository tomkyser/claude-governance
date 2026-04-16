import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createRegistry } from './registry';
import { createPriorityQueue, type PriorityQueue } from './queue';
import { validateEnvelope } from './protocol';
import type { Envelope, RelayConfig } from './types';

// ====================================================================
// Defaults
// ====================================================================

const DEFAULTS = {
  port: 9876,
  host: '127.0.0.1',
  idleTimeoutMs: 300_000,
  pollTimeoutMs: 25_000,
  maxSessions: 50,
  portRange: 10,
} as const;

// ====================================================================
// Server
// ====================================================================

export function createRelayServer(config: Partial<RelayConfig> = {}) {
  const basePort = config.port || DEFAULTS.port;
  const host = config.host || DEFAULTS.host;
  const idleTimeoutMs = config.idleTimeoutMs || DEFAULTS.idleTimeoutMs;
  const pollTimeoutMs = config.pollTimeoutMs || DEFAULTS.pollTimeoutMs;
  const maxSessions = config.maxSessions || DEFAULTS.maxSessions;

  const wireDir = path.join(os.homedir(), '.claude-governance', 'wire');
  const pidFile = config.pidFile || path.join(wireDir, 'relay.pid');
  const portFile = config.portFile || path.join(wireDir, 'relay.port');
  const logFile = config.logFile || path.join(wireDir, 'relay.log');

  const registry = createRegistry();
  const mailboxes = new Map<string, PriorityQueue>();
  const pendingPolls = new Map<
    string,
    { res: http.ServerResponse; timer: ReturnType<typeof setTimeout> }
  >();

  let httpServer: http.Server | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let actualPort = 0;
  const startTime = Date.now();

  // ====================================================================
  // Helpers
  // ====================================================================

  function log(message: string): void {
    const line = `${new Date().toISOString()} ${message}\n`;
    try {
      fs.appendFileSync(logFile, line);
    } catch {
      // Best-effort logging — detached process can't use stdout
    }
  }

  function parseBody(req: http.IncomingMessage): Promise<unknown> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        try {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve(text ? JSON.parse(text) : null);
        } catch {
          resolve(null);
        }
      });
      req.on('error', () => resolve(null));
    });
  }

  function json(
    res: http.ServerResponse,
    data: unknown,
    status = 200,
  ): void {
    if (res.headersSent) return;
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  // ====================================================================
  // Delivery
  // ====================================================================

  function deliverToMailbox(envelope: Envelope): boolean {
    const targetId = envelope.to;
    const entry = registry.lookup(targetId);
    if (!entry) return false;

    const pending = pendingPolls.get(targetId);
    if (pending) {
      clearTimeout(pending.timer);
      pendingPolls.delete(targetId);
      json(pending.res, { messages: [envelope] });
      return true;
    }

    if (!mailboxes.has(targetId)) {
      mailboxes.set(targetId, createPriorityQueue());
    }
    mailboxes.get(targetId)!.enqueue(envelope);
    return true;
  }

  function deliverBroadcast(envelope: Envelope): number {
    const sessions = registry.getSessions();
    let delivered = 0;
    for (const [sid] of sessions) {
      if (sid === envelope.from) continue;
      const copy: Envelope = { ...envelope, to: sid };
      if (deliverToMailbox(copy)) delivered++;
    }
    return delivered;
  }

  // ====================================================================
  // Request handler
  // ====================================================================

  async function handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    const url = new URL(
      req.url || '/',
      `http://${req.headers.host || 'localhost'}`,
    );
    const method = req.method || 'GET';
    const pathname = url.pathname;

    // POST /register
    if (pathname === '/register' && method === 'POST') {
      const body = (await parseBody(req)) as Record<string, unknown> | null;
      if (!body || !body.sessionId) {
        json(res, { error: 'Missing sessionId' }, 400);
        return;
      }

      if (registry.getSessions().length >= maxSessions) {
        json(res, { error: 'Max sessions reached' }, 429);
        return;
      }

      const sid = body.sessionId as string;
      registry.register(sid, {
        identity: (body.identity as string) || 'unknown',
        capabilities: (body.capabilities as string[]) || [],
      });
      mailboxes.set(sid, createPriorityQueue());
      resetIdleTimer();
      log(`Registered: ${sid} (${body.identity || 'unknown'})`);
      json(res, { ok: true });
      return;
    }

    // POST /unregister
    if (pathname === '/unregister' && method === 'POST') {
      const body = (await parseBody(req)) as Record<string, unknown> | null;
      if (!body || !body.sessionId) {
        json(res, { error: 'Missing sessionId' }, 400);
        return;
      }

      const sid = body.sessionId as string;

      const pending = pendingPolls.get(sid);
      if (pending) {
        clearTimeout(pending.timer);
        pendingPolls.delete(sid);
        json(pending.res, { messages: [] });
      }

      mailboxes.delete(sid);
      registry.unregister(sid);
      resetIdleTimer();
      log(`Unregistered: ${sid}`);
      json(res, { ok: true });
      return;
    }

    // POST /send
    if (pathname === '/send' && method === 'POST') {
      const body = await parseBody(req);
      if (!body) {
        json(res, { error: 'Invalid JSON body' }, 400);
        return;
      }

      const validation = validateEnvelope(body);
      if (!validation.ok) {
        json(res, { error: validation.error }, 400);
        return;
      }

      const envelope = validation.value;

      if (envelope.to === 'broadcast') {
        const count = deliverBroadcast(envelope);
        json(res, { ok: true, delivered: count > 0, recipients: count });
        return;
      }

      const delivered = deliverToMailbox(envelope);
      json(res, { ok: true, delivered });
      return;
    }

    // POST /send-batch
    if (pathname === '/send-batch' && method === 'POST') {
      const body = await parseBody(req);
      if (!body || !Array.isArray(body)) {
        json(res, { error: 'Body must be a JSON array' }, 400);
        return;
      }

      const results = [];
      for (const raw of body as unknown[]) {
        const validation = validateEnvelope(raw);
        if (!validation.ok) {
          results.push({
            id: (raw as Record<string, unknown>)?.id || null,
            ok: false,
            error: validation.error,
          });
          continue;
        }
        const envelope = validation.value;
        const delivered =
          envelope.to === 'broadcast'
            ? deliverBroadcast(envelope) > 0
            : deliverToMailbox(envelope);
        results.push({ id: envelope.id, ok: true, delivered });
      }

      json(res, { ok: true, results });
      return;
    }

    // GET /poll
    if (pathname === '/poll' && method === 'GET') {
      const sessionId = url.searchParams.get('sessionId');
      if (!sessionId) {
        json(res, { error: 'Missing sessionId query param' }, 400);
        return;
      }

      const entry = registry.lookup(sessionId);
      if (!entry) {
        json(res, { error: 'Session not registered' }, 404);
        return;
      }

      entry.lastSeen = Date.now();

      const mailbox = mailboxes.get(sessionId);
      if (mailbox && !mailbox.isEmpty()) {
        const messages = mailbox.flush();
        json(res, { messages });
        return;
      }

      const timeout = parseInt(
        url.searchParams.get('timeout') || String(pollTimeoutMs),
        10,
      );
      const timer = setTimeout(() => {
        pendingPolls.delete(sessionId);
        json(res, { messages: [] });
      }, timeout);

      pendingPolls.set(sessionId, { res, timer });

      req.on('close', () => {
        const p = pendingPolls.get(sessionId);
        if (p && p.res === res) {
          clearTimeout(p.timer);
          pendingPolls.delete(sessionId);
        }
      });
      return;
    }

    // GET /sessions
    if (pathname === '/sessions' && method === 'GET') {
      const sessions = registry
        .getSessions()
        .map(([sessionId, entry]) => ({ sessionId, ...entry }));
      json(res, { sessions });
      return;
    }

    // GET /health
    if (pathname === '/health' && method === 'GET') {
      json(res, {
        status: 'ok',
        sessions: registry.getSessions().length,
        uptime: Math.floor((Date.now() - startTime) / 1000),
        port: actualPort,
      });
      return;
    }

    json(res, { error: 'Not found' }, 404);
  }

  // ====================================================================
  // Lifecycle
  // ====================================================================

  function resetIdleTimer(): void {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (registry.getSessions().length === 0) {
        log('Idle timeout — no sessions, shutting down');
        shutdown();
      }
    }, idleTimeoutMs);
  }

  function writeStateFiles(): void {
    fs.mkdirSync(path.dirname(pidFile), { recursive: true });
    fs.writeFileSync(pidFile, String(process.pid));
    fs.writeFileSync(portFile, String(actualPort));
  }

  function cleanStateFiles(): void {
    try {
      fs.unlinkSync(pidFile);
    } catch {
      /* already gone */
    }
    try {
      fs.unlinkSync(portFile);
    } catch {
      /* already gone */
    }
  }

  function shutdown(): void {
    log('Shutting down');
    cleanStateFiles();

    for (const [, pending] of pendingPolls) {
      clearTimeout(pending.timer);
      try {
        json(pending.res, { messages: [] });
      } catch {
        /* client already disconnected */
      }
    }
    pendingPolls.clear();

    registry.destroy();
    mailboxes.clear();

    if (httpServer) {
      httpServer.close();
    }
    if (idleTimer) {
      clearTimeout(idleTimer);
    }

    process.exit(0);
  }

  async function start(): Promise<number> {
    fs.mkdirSync(wireDir, { recursive: true });

    for (let p = basePort; p <= basePort + DEFAULTS.portRange; p++) {
      try {
        actualPort = await new Promise<number>((resolve, reject) => {
          const srv = http.createServer((req, res) => {
            handleRequest(req, res).catch((err) => {
              log(`Request error: ${err}`);
              if (!res.headersSent) {
                json(res, { error: 'Internal server error' }, 500);
              }
            });
          });
          srv.once('error', (err: NodeJS.ErrnoException) => {
            srv.close();
            reject(err);
          });
          srv.listen(p, host, () => {
            srv.removeAllListeners('error');
            httpServer = srv;
            resolve(p);
          });
        });

        writeStateFiles();
        resetIdleTimer();
        log(
          `Wire relay started on port ${actualPort} (PID ${process.pid})`,
        );

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

        return actualPort;
      } catch (err: unknown) {
        const nodeErr = err as NodeJS.ErrnoException;
        if (
          nodeErr.code !== 'EADDRINUSE' ||
          p === basePort + DEFAULTS.portRange
        ) {
          throw err;
        }
        log(`Port ${p} in use, trying ${p + 1}`);
      }
    }

    throw new Error('All ports in range exhausted');
  }

  return { start, shutdown };
}

// ====================================================================
// Main
// ====================================================================

const relay = createRelayServer({
  port: parseInt(process.env.WIRE_RELAY_PORT || '9876', 10),
  pollTimeoutMs: parseInt(
    process.env.WIRE_POLL_TIMEOUT_MS || '25000',
    10,
  ),
  idleTimeoutMs: parseInt(
    process.env.WIRE_IDLE_TIMEOUT_MS || '300000',
    10,
  ),
});

relay.start().catch((err) => {
  process.stderr.write(`Wire relay fatal: ${err}\n`);
  process.exit(1);
});
