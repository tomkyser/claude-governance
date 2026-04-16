import type {
  Envelope,
  PollResponse,
  DiscoverResult,
  RelayHealthResponse,
} from './types';

// ====================================================================
// Types
// ====================================================================

export interface RelayClientConfig {
  baseUrl: string;
  pollTimeoutMs?: number;
}

export interface RelayClient {
  register(
    sessionId: string,
    identity: string,
    capabilities: string[],
  ): Promise<boolean>;
  unregister(sessionId: string): Promise<boolean>;
  send(envelope: Envelope): Promise<{ delivered: boolean }>;
  poll(sessionId: string, timeout?: number): Promise<PollResponse>;
  discover(): Promise<DiscoverResult>;
  health(): Promise<RelayHealthResponse>;
  startPollLoop(
    sessionId: string,
    onMessage: (envelope: Envelope) => void,
  ): void;
  stopPollLoop(): void;
  isConnected(): boolean;
}

// ====================================================================
// Client
// ====================================================================

export function createRelayClient(
  config: RelayClientConfig,
): RelayClient {
  const baseUrl = config.baseUrl;
  const pollTimeoutMs = config.pollTimeoutMs || 25_000;
  let connected = false;
  let polling = false;
  let pollAbort: AbortController | null = null;

  async function register(
    sessionId: string,
    identity: string,
    capabilities: string[],
  ): Promise<boolean> {
    try {
      const response = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, identity, capabilities }),
      });
      connected = response.ok;
      return response.ok;
    } catch {
      connected = false;
      return false;
    }
  }

  async function unregister(sessionId: string): Promise<boolean> {
    connected = false;
    polling = false;
    if (pollAbort) {
      pollAbort.abort();
      pollAbort = null;
    }
    try {
      const response = await fetch(`${baseUrl}/unregister`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async function send(
    envelope: Envelope,
  ): Promise<{ delivered: boolean }> {
    try {
      const response = await fetch(`${baseUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });
      if (!response.ok) return { delivered: false };
      const data = (await response.json()) as { delivered: boolean };
      return { delivered: data.delivered };
    } catch {
      return { delivered: false };
    }
  }

  async function poll(
    sessionId: string,
    timeout?: number,
  ): Promise<PollResponse> {
    try {
      const t = timeout || pollTimeoutMs;
      const abort = new AbortController();
      pollAbort = abort;
      const response = await fetch(
        `${baseUrl}/poll?sessionId=${encodeURIComponent(sessionId)}&timeout=${t}`,
        { signal: abort.signal },
      );
      if (!response.ok) return { messages: [] };
      return (await response.json()) as PollResponse;
    } catch {
      return { messages: [] };
    }
  }

  async function discover(): Promise<DiscoverResult> {
    try {
      const response = await fetch(`${baseUrl}/sessions`);
      if (!response.ok) return { sessions: [] };
      return (await response.json()) as DiscoverResult;
    } catch {
      return { sessions: [] };
    }
  }

  async function health(): Promise<RelayHealthResponse> {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (!response.ok)
        return { status: 'error', sessions: 0, uptime: 0 };
      return (await response.json()) as RelayHealthResponse;
    } catch {
      return { status: 'unreachable', sessions: 0, uptime: 0 };
    }
  }

  function startPollLoop(
    sessionId: string,
    onMessage: (envelope: Envelope) => void,
  ): void {
    polling = true;

    (async () => {
      let backoff = 1000;

      while (polling && connected) {
        try {
          pollAbort = new AbortController();
          const response = await fetch(
            `${baseUrl}/poll?sessionId=${encodeURIComponent(sessionId)}&timeout=${pollTimeoutMs}`,
            { signal: pollAbort.signal },
          );

          if (!response.ok) {
            await new Promise((r) => setTimeout(r, backoff));
            backoff = Math.min(backoff * 2, 30_000);
            continue;
          }

          backoff = 1000;
          const data = (await response.json()) as PollResponse;
          for (const msg of data.messages) {
            onMessage(msg);
          }
        } catch (e) {
          if ((e as Error).name === 'AbortError') break;
          await new Promise((r) => setTimeout(r, backoff));
          backoff = Math.min(backoff * 2, 30_000);
        }
      }
    })();
  }

  function stopPollLoop(): void {
    polling = false;
    if (pollAbort) {
      pollAbort.abort();
      pollAbort = null;
    }
  }

  function isConnected(): boolean {
    return connected;
  }

  return {
    register,
    unregister,
    send,
    poll,
    discover,
    health,
    startPollLoop,
    stopPollLoop,
    isConnected,
  };
}
