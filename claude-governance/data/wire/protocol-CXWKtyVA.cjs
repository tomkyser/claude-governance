//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") {
		for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) {
				__defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
		}
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let node_crypto = require("node:crypto");
node_crypto = __toESM(node_crypto);

//#region src/wire/types.ts
const MESSAGE_TYPES = {
	TEXT: "text",
	REQUEST: "request",
	RESPONSE: "response",
	HEARTBEAT: "heartbeat",
	STATUS: "status"
};
const URGENCY_LEVELS = {
	URGENT: "urgent",
	DIRECTIVE: "directive",
	ACTIVE: "active",
	BACKGROUND: "background"
};
const URGENCY_PRIORITY = {
	[URGENCY_LEVELS.URGENT]: 0,
	[URGENCY_LEVELS.DIRECTIVE]: 1,
	[URGENCY_LEVELS.ACTIVE]: 2,
	[URGENCY_LEVELS.BACKGROUND]: 3
};

//#endregion
//#region src/wire/protocol.ts
const META_KEY_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const VALID_TYPES = new Set(Object.values(MESSAGE_TYPES));
const VALID_URGENCIES = new Set(Object.values(URGENCY_LEVELS));
function createEnvelope(input) {
	if (!input.from) return {
		ok: false,
		error: "Missing required field: from"
	};
	if (!input.to) return {
		ok: false,
		error: "Missing required field: to"
	};
	if (!input.type) return {
		ok: false,
		error: "Missing required field: type"
	};
	if (!VALID_TYPES.has(input.type)) return {
		ok: false,
		error: `Invalid message type: ${input.type}`
	};
	const urgency = input.urgency || URGENCY_LEVELS.ACTIVE;
	if (!VALID_URGENCIES.has(urgency)) return {
		ok: false,
		error: `Invalid urgency level: ${input.urgency}`
	};
	return {
		ok: true,
		value: {
			id: node_crypto.randomUUID(),
			from: input.from,
			to: input.to,
			type: input.type,
			urgency,
			payload: input.payload,
			timestamp: (/* @__PURE__ */ new Date()).toISOString(),
			correlationId: input.correlationId ?? null
		}
	};
}
function validateEnvelope(obj) {
	if (!obj || typeof obj !== "object") return {
		ok: false,
		error: "Envelope must be a non-null object"
	};
	const e = obj;
	if (!e.id) return {
		ok: false,
		error: "Missing required field: id"
	};
	if (!e.from) return {
		ok: false,
		error: "Missing required field: from"
	};
	if (!e.to) return {
		ok: false,
		error: "Missing required field: to"
	};
	if (!e.type || !VALID_TYPES.has(e.type)) return {
		ok: false,
		error: `Invalid or missing message type: ${e.type}`
	};
	if (!e.urgency || !VALID_URGENCIES.has(e.urgency)) return {
		ok: false,
		error: `Invalid or missing urgency: ${e.urgency}`
	};
	if (!e.timestamp) return {
		ok: false,
		error: "Missing required field: timestamp"
	};
	return {
		ok: true,
		value: obj
	};
}
function filterMetaKeys(meta) {
	const filtered = {};
	for (const [key, value] of Object.entries(meta)) if (META_KEY_REGEX.test(key)) filtered[key] = value;
	return filtered;
}
function envelopeToMeta(envelope) {
	const meta = {
		envelope_id: envelope.id,
		message_type: envelope.type,
		urgency: envelope.urgency,
		sender: envelope.from
	};
	if (envelope.correlationId) meta.correlation_id = envelope.correlationId;
	return filterMetaKeys(meta);
}

//#endregion
Object.defineProperty(exports, 'MESSAGE_TYPES', {
  enumerable: true,
  get: function () {
    return MESSAGE_TYPES;
  }
});
Object.defineProperty(exports, 'URGENCY_LEVELS', {
  enumerable: true,
  get: function () {
    return URGENCY_LEVELS;
  }
});
Object.defineProperty(exports, '__commonJSMin', {
  enumerable: true,
  get: function () {
    return __commonJSMin;
  }
});
Object.defineProperty(exports, '__toESM', {
  enumerable: true,
  get: function () {
    return __toESM;
  }
});
Object.defineProperty(exports, 'createEnvelope', {
  enumerable: true,
  get: function () {
    return createEnvelope;
  }
});
Object.defineProperty(exports, 'envelopeToMeta', {
  enumerable: true,
  get: function () {
    return envelopeToMeta;
  }
});
Object.defineProperty(exports, 'validateEnvelope', {
  enumerable: true,
  get: function () {
    return validateEnvelope;
  }
});