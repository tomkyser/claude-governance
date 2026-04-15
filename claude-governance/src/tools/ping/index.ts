// Ping tool — governance tool injection test
// Echoes a message back to verify the tool injection pipeline is working.

export default {
  name: 'Ping',
  inputJSONSchema: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'A message to echo back' },
    },
    required: ['message'],
  },
  async prompt() {
    return 'Internal governance verification tool. Used automatically during setup and apply — not intended for use during normal sessions. If you need to test something, use REPL instead.';
  },
  async description() {
    return 'Internal governance verification (not for general use)';
  },
  async call(args: { message: string }) {
    return {
      data: `Ping response: ${args.message} [via claude-governance tool injection]`,
    };
  },
};
