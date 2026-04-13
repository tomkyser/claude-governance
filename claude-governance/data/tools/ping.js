// Ping tool — governance tool injection test
// Echoes a message back to verify the tool injection pipeline is working.

module.exports = {
  name: 'Ping',
  inputJSONSchema: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'A message to echo back' },
    },
    required: ['message'],
  },
  async prompt() {
    return 'Echo a message back. Use this tool to verify that custom tools are working. Pass a message and it will be returned unchanged.';
  },
  async description() {
    return 'Echo a message (governance tool injection test)';
  },
  async call(args) {
    return {
      data: `Ping response: ${args.message} [via claude-governance tool injection]`,
    };
  },
};
