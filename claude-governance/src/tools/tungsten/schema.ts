export const inputJSONSchema = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: ['send', 'capture', 'create', 'list', 'kill', 'interrupt'],
      description:
        'send: execute a command in the session. ' +
        'capture: read current terminal output. ' +
        'create: create a new named session. ' +
        'list: show all active sessions. ' +
        'kill: end a session. ' +
        'interrupt: send Ctrl-C to the session.',
    },
    command: {
      type: 'string',
      description: 'Command to execute (required for "send" action)',
    },
    session: {
      type: 'string',
      description: 'Session name (default: "main")',
    },
    lines: {
      type: 'number',
      description: 'Lines of terminal output to capture (default: 50 for capture, 30 for send)',
    },
  },
  required: ['action'],
};
