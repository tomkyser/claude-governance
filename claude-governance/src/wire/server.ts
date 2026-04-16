import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as path from 'node:path';
import {
  MESSAGE_TYPES,
  URGENCY_LEVELS,
  type Envelope,
  type Result,
} from './types';
import { createEnvelope, envelopeToMeta } from './protocol';
import {
  createRelayClient,
  type RelayClient,
} from './relay-client';
import { ensureRelay } from './relay-lifecycle';

// ====================================================================
// State
// ====================================================================

function resolveSessionId(): string {
  if (process.env.WIRE_SESSION_NAME) return process.env.WIRE_SESSION_NAME;
  const base = path.basename(process.cwd());
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

function resolveRelayScript(): string {
  const serverScript = process.argv[1];
  if (serverScript) {
    return path.join(
      path.dirname(path.resolve(serverScript)),
      'wire-relay.cjs',
    );
  }
  return 'wire-relay.cjs';
}

const SESSION_ID = resolveSessionId();
const RELAY_SCRIPT = resolveRelayScript();
const startTime = Date.now();
const messageLog: Envelope[] = [];
let relayClient: RelayClient | null = null;
let relayPort: number | null = null;

// ====================================================================
// Server
// ====================================================================

const server = new Server(
  { name: 'wire', version: '0.2.0' },
  {
    capabilities: {
      tools: {},
      experimental: { 'claude/channel': {} },
    },
    instructions: [
      'Wire enables communication between Claude Code sessions.',
      'Messages from other sessions arrive as <channel source="wire" ...> in your conversation.',
      'To send a message to another session, use the wire_send tool.',
      'To check Wire connection status, use the wire_status tool.',
      'To discover other connected sessions, use the wire_discover tool.',
      'Your session ID is available via wire_status — share it so others can message you.',
      'Wire messages have urgency levels: urgent (immediate), directive, active (default), background.',
      'Messages have types: text (general), request (expects response), response, heartbeat, status.',
      'When you receive a request-type message, respond using wire_send with type "response" and the correlation_id from the original.',
    ].join('\n'),
  },
);

// ====================================================================
// Tool definitions
// ====================================================================

const TOOLS = [
  {
    name: 'wire_send',
    description:
      'Send a message to another Claude Code session via Wire.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        to: {
          type: 'string',
          description:
            'Recipient session ID, or "broadcast" to send to all connected sessions.',
        },
        message: {
          type: 'string',
          description: 'The message content to send.',
        },
        type: {
          type: 'string',
          enum: Object.values(MESSAGE_TYPES),
          description: 'Message type. Defaults to "text".',
        },
        urgency: {
          type: 'string',
          enum: Object.values(URGENCY_LEVELS),
          description: 'Urgency level. Defaults to "active".',
        },
        correlation_id: {
          type: 'string',
          description:
            'For response-type messages, the envelope_id of the message being replied to.',
        },
      },
      required: ['to', 'message'],
    },
  },
  {
    name: 'wire_discover',
    description:
      'Discover other Claude Code sessions connected to Wire.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'wire_status',
    description:
      'Check Wire connection status, session ID, relay health, and message history.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        include_log: {
          type: 'boolean',
          description:
            'Include recent message log in the response. Defaults to false.',
        },
      },
    },
  },
];

// ====================================================================
// Handlers
// ====================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'wire_send')
    return handleWireSend(args as unknown as WireSendArgs);
  if (name === 'wire_discover') return handleWireDiscover();
  if (name === 'wire_status')
    return handleWireStatus(args as unknown as WireStatusArgs);

  return {
    content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
    isError: true,
  };
});

// ====================================================================
// wire_send
// ====================================================================

interface WireSendArgs {
  to: string;
  message: string;
  type?: string;
  urgency?: string;
  correlation_id?: string;
}

async function handleWireSend(args: WireSendArgs) {
  const result: Result<Envelope> = createEnvelope({
    from: SESSION_ID,
    to: args.to,
    type: (args.type as Envelope['type']) || MESSAGE_TYPES.TEXT,
    urgency:
      (args.urgency as Envelope['urgency']) || URGENCY_LEVELS.ACTIVE,
    payload: args.message,
    correlationId: args.correlation_id,
  });

  if (!result.ok) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Wire error: ${result.error}`,
        },
      ],
      isError: true,
    };
  }

  const envelope = result.value;
  messageLog.push(envelope);

  if (relayClient?.isConnected()) {
    const sendResult = await relayClient.send(envelope);
    return {
      content: [
        {
          type: 'text' as const,
          text: `Sent (${envelope.id}) to ${envelope.to} [${envelope.type}/${envelope.urgency}] — ${sendResult.delivered ? 'delivered' : 'queued'}`,
        },
      ],
    };
  }

  const meta = envelopeToMeta(envelope);
  try {
    await server.notification({
      method: 'notifications/claude/channel',
      params: {
        content: `[Wire from ${envelope.from} to ${envelope.to}] ${args.message}`,
        meta,
      },
    });
  } catch {
    // Notification failure is non-fatal
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: `Sent (${envelope.id}) to ${envelope.to} [${envelope.type}/${envelope.urgency}] — local only (no relay)`,
      },
    ],
  };
}

// ====================================================================
// wire_discover
// ====================================================================

async function handleWireDiscover() {
  if (!relayClient?.isConnected()) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'Wire relay not connected. No peers discoverable.',
        },
      ],
    };
  }

  const result = await relayClient.discover();
  if (result.sessions.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'No sessions connected to Wire relay.',
        },
      ],
    };
  }

  const lines = [`Connected sessions (${result.sessions.length}):`];
  for (const s of result.sessions) {
    const tag = s.sessionId === SESSION_ID ? ' (you)' : '';
    lines.push(
      `  ${s.sessionId}${tag} — ${s.identity} [${s.status}]`,
    );
  }

  return {
    content: [{ type: 'text' as const, text: lines.join('\n') }],
  };
}

// ====================================================================
// wire_status
// ====================================================================

interface WireStatusArgs {
  include_log?: boolean;
}

async function handleWireStatus(args: WireStatusArgs) {
  const uptimeMs = Date.now() - startTime;
  const uptimeMin = Math.floor(uptimeMs / 60000);
  const uptimeSec = Math.floor((uptimeMs % 60000) / 1000);

  const connected = relayClient?.isConnected() ?? false;

  const lines = [
    `Session ID: ${SESSION_ID}`,
    `Uptime: ${uptimeMin}m ${uptimeSec}s`,
    `Messages: ${messageLog.length}`,
    `Relay: ${connected ? `connected (port ${relayPort})` : 'disconnected'}`,
    'Server version: 0.2.0',
  ];

  if (connected && relayClient) {
    const health = await relayClient.health();
    lines.push(`Relay peers: ${health.sessions}`);
    lines.push(`Relay uptime: ${health.uptime}s`);
  }

  if (args.include_log && messageLog.length > 0) {
    lines.push('', 'Recent messages:');
    const recent = messageLog.slice(-10);
    for (const env of recent) {
      const dir = env.from === SESSION_ID ? '→' : '←';
      const peer = env.from === SESSION_ID ? env.to : env.from;
      lines.push(
        `  ${env.timestamp} [${env.type}/${env.urgency}] ${dir} ${peer}: ${String(env.payload).substring(0, 80)}`,
      );
    }
  }

  return {
    content: [{ type: 'text' as const, text: lines.join('\n') }],
  };
}

// ====================================================================
// Relay connection
// ====================================================================

function handleIncomingMessage(envelope: Envelope): void {
  messageLog.push(envelope);
  const meta = envelopeToMeta(envelope);

  server
    .notification({
      method: 'notifications/claude/channel',
      params: {
        content: `[Wire from ${envelope.from}] ${String(envelope.payload)}`,
        meta,
      },
    })
    .catch(() => {});
}

async function connectToRelay(): Promise<void> {
  try {
    relayPort = await ensureRelay(RELAY_SCRIPT);

    relayClient = createRelayClient({
      baseUrl: `http://127.0.0.1:${relayPort}`,
    });

    const registered = await relayClient.register(
      SESSION_ID,
      SESSION_ID,
      ['send', 'receive'],
    );

    if (registered) {
      relayClient.startPollLoop(SESSION_ID, handleIncomingMessage);
    }
  } catch {
    // Relay failure is non-fatal — Wire works locally without relay
  }
}

async function disconnectFromRelay(): Promise<void> {
  if (relayClient) {
    relayClient.stopPollLoop();
    await relayClient.unregister(SESSION_ID);
    relayClient = null;
  }
}

// ====================================================================
// Main
// ====================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  await connectToRelay();

  process.on('SIGTERM', async () => {
    await disconnectFromRelay();
    process.exit(0);
  });
  process.on('SIGINT', async () => {
    await disconnectFromRelay();
    process.exit(0);
  });
}

main().catch((err) => {
  process.stderr.write(`Wire server fatal: ${err}\n`);
  process.exit(1);
});
