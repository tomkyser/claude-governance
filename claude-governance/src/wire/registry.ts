import { EventEmitter } from 'node:events';
import type { Envelope, RegistryEntry } from './types';

export interface RegistryConfig {
  reconnectTTL?: number;
}

export interface Registry {
  register(
    sessionId: string,
    info: { identity: string; capabilities: string[] },
  ): void;
  unregister(sessionId: string): void;
  lookup(sessionId: string): RegistryEntry | null;
  getSessions(): [string, RegistryEntry][];
  disconnect(sessionId: string): void;
  reconnect(sessionId: string): Envelope[];
  bufferMessage(sessionId: string, envelope: Envelope): void;
  getBufferedMessages(sessionId: string): Envelope[];
  on(event: string, listener: (...args: unknown[]) => void): void;
  off(event: string, listener: (...args: unknown[]) => void): void;
  destroy(): void;
}

export function createRegistry(config: RegistryConfig = {}): Registry {
  const sessions = new Map<string, RegistryEntry>();
  const emitter = new EventEmitter();
  const buffers = new Map<string, Envelope[]>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const reconnectTTL = config.reconnectTTL || 30000;

  function register(
    sessionId: string,
    {
      identity,
      capabilities,
    }: { identity: string; capabilities: string[] },
  ): void {
    const now = Date.now();
    sessions.set(sessionId, {
      identity,
      capabilities,
      connectedAt: now,
      lastSeen: now,
      status: 'active',
    });
    emitter.emit('session:registered', {
      sessionId,
      identity,
      capabilities,
    });
  }

  function unregister(sessionId: string): void {
    const session = sessions.get(sessionId);
    if (!session) return;

    const { identity } = session;

    if (timers.has(sessionId)) {
      clearTimeout(timers.get(sessionId)!);
      timers.delete(sessionId);
    }

    buffers.delete(sessionId);
    sessions.delete(sessionId);
    emitter.emit('session:lost', { sessionId, identity });
  }

  function lookup(sessionId: string): RegistryEntry | null {
    return sessions.get(sessionId) || null;
  }

  function getSessions(): [string, RegistryEntry][] {
    return Array.from(sessions.entries());
  }

  function disconnect(sessionId: string): void {
    const session = sessions.get(sessionId);
    if (!session) return;

    session.status = 'disconnected';

    if (!buffers.has(sessionId)) {
      buffers.set(sessionId, []);
    }

    const timer = setTimeout(() => {
      timers.delete(sessionId);
      unregister(sessionId);
    }, reconnectTTL);

    timers.set(sessionId, timer);
  }

  function reconnect(sessionId: string): Envelope[] {
    const session = sessions.get(sessionId);
    if (!session) return [];

    if (timers.has(sessionId)) {
      clearTimeout(timers.get(sessionId)!);
      timers.delete(sessionId);
    }

    session.status = 'active';
    session.lastSeen = Date.now();
    emitter.emit('session:reconnected', {
      sessionId,
      identity: session.identity,
    });

    const buffered = buffers.get(sessionId) || [];
    buffers.set(sessionId, []);
    return buffered;
  }

  function bufferMessage(
    sessionId: string,
    envelope: Envelope,
  ): void {
    const session = sessions.get(sessionId);
    if (!session || session.status !== 'disconnected') return;

    if (!buffers.has(sessionId)) {
      buffers.set(sessionId, []);
    }
    buffers.get(sessionId)!.push(envelope);
  }

  function getBufferedMessages(sessionId: string): Envelope[] {
    return buffers.get(sessionId) || [];
  }

  function destroy(): void {
    for (const timer of timers.values()) {
      clearTimeout(timer);
    }
    timers.clear();
    sessions.clear();
    buffers.clear();
    emitter.removeAllListeners();
  }

  return {
    register,
    unregister,
    lookup,
    getSessions,
    disconnect,
    reconnect,
    bufferMessage,
    getBufferedMessages,
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    destroy,
  };
}
