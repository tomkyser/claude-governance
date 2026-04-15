
//#region src/tools/ping/index.ts
var ping_default = {
	name: "Ping",
	inputJSONSchema: {
		type: "object",
		properties: { message: {
			type: "string",
			description: "A message to echo back"
		} },
		required: ["message"]
	},
	async prompt() {
		return "Internal governance verification tool. Used automatically during setup and apply — not intended for use during normal sessions. If you need to test something, use REPL instead.";
	},
	async description() {
		return "Internal governance verification (not for general use)";
	},
	async call(args) {
		return { data: `Ping response: ${args.message} [via claude-governance tool injection]` };
	}
};

//#endregion
module.exports = ping_default;