export const inputJSONSchema = {
  type: 'object',
  properties: {
    script: {
      type: 'string',
      description: 'JavaScript code to execute. Use await for async operations. Return a value to include it in the response.',
    },
    description: {
      type: 'string',
      description: 'Brief description of what this script does',
    },
  },
  required: ['script'],
};
