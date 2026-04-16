const require_protocol = require('./protocol-CXWKtyVA.cjs');
let node_path = require("node:path");
node_path = require_protocol.__toESM(node_path);
let node_fs = require("node:fs");
node_fs = require_protocol.__toESM(node_fs);
let node_os = require("node:os");
node_os = require_protocol.__toESM(node_os);
let node_http = require("node:http");
node_http = require_protocol.__toESM(node_http);
let node_events = require("node:events");

//#region src/wire/registry.ts
function createRegistry(config = {}) {
	const sessions = /* @__PURE__ */ new Map();
	const emitter = new node_events.EventEmitter();
	const buffers = /* @__PURE__ */ new Map();
	const timers = /* @__PURE__ */ new Map();
	const reconnectTTL = config.reconnectTTL || 3e4;
	function register(sessionId, { identity, capabilities }) {
		const now = Date.now();
		sessions.set(sessionId, {
			identity,
			capabilities,
			connectedAt: now,
			lastSeen: now,
			status: "active"
		});
		emitter.emit("session:registered", {
			sessionId,
			identity,
			capabilities
		});
	}
	function unregister(sessionId) {
		const session = sessions.get(sessionId);
		if (!session) return;
		const { identity } = session;
		if (timers.has(sessionId)) {
			clearTimeout(timers.get(sessionId));
			timers.delete(sessionId);
		}
		buffers.delete(sessionId);
		sessions.delete(sessionId);
		emitter.emit("session:lost", {
			sessionId,
			identity
		});
	}
	function lookup(sessionId) {
		return sessions.get(sessionId) || null;
	}
	function getSessions() {
		return Array.from(sessions.entries());
	}
	function disconnect(sessionId) {
		const session = sessions.get(sessionId);
		if (!session) return;
		session.status = "disconnected";
		if (!buffers.has(sessionId)) buffers.set(sessionId, []);
		const timer = setTimeout(() => {
			timers.delete(sessionId);
			unregister(sessionId);
		}, reconnectTTL);
		timers.set(sessionId, timer);
	}
	function reconnect(sessionId) {
		const session = sessions.get(sessionId);
		if (!session) return [];
		if (timers.has(sessionId)) {
			clearTimeout(timers.get(sessionId));
			timers.delete(sessionId);
		}
		session.status = "active";
		session.lastSeen = Date.now();
		emitter.emit("session:reconnected", {
			sessionId,
			identity: session.identity
		});
		const buffered = buffers.get(sessionId) || [];
		buffers.set(sessionId, []);
		return buffered;
	}
	function bufferMessage(sessionId, envelope) {
		const session = sessions.get(sessionId);
		if (!session || session.status !== "disconnected") return;
		if (!buffers.has(sessionId)) buffers.set(sessionId, []);
		buffers.get(sessionId).push(envelope);
	}
	function getBufferedMessages(sessionId) {
		return buffers.get(sessionId) || [];
	}
	function destroy() {
		for (const timer of timers.values()) clearTimeout(timer);
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
		destroy
	};
}

//#endregion
//#region src/wire/queue.ts
function createPriorityQueue(config = {}) {
	const queues = {
		[require_protocol.URGENCY_LEVELS.URGENT]: [],
		[require_protocol.URGENCY_LEVELS.DIRECTIVE]: [],
		[require_protocol.URGENCY_LEVELS.ACTIVE]: [],
		[require_protocol.URGENCY_LEVELS.BACKGROUND]: []
	};
	const limits = {
		[require_protocol.URGENCY_LEVELS.URGENT]: Infinity,
		[require_protocol.URGENCY_LEVELS.DIRECTIVE]: config.directiveQueueDepth || 100,
		[require_protocol.URGENCY_LEVELS.ACTIVE]: config.activeQueueDepth || 200,
		[require_protocol.URGENCY_LEVELS.BACKGROUND]: config.backgroundQueueDepth || 50
	};
	const dequeueOrder = [
		require_protocol.URGENCY_LEVELS.URGENT,
		require_protocol.URGENCY_LEVELS.DIRECTIVE,
		require_protocol.URGENCY_LEVELS.ACTIVE,
		require_protocol.URGENCY_LEVELS.BACKGROUND
	];
	function enqueue(envelope) {
		const urgency = envelope.urgency || require_protocol.URGENCY_LEVELS.ACTIVE;
		const queue = queues[urgency];
		const limit = limits[urgency];
		if (queue.length >= limit) queue.shift();
		queue.push(envelope);
	}
	function dequeue() {
		for (const level of dequeueOrder) {
			const queue = queues[level];
			if (queue.length > 0) return queue.shift();
		}
		return null;
	}
	function peek() {
		for (const level of dequeueOrder) {
			const queue = queues[level];
			if (queue.length > 0) return queue[0];
		}
		return null;
	}
	function getDepth() {
		let total = 0;
		const depth = {};
		for (const level of dequeueOrder) {
			const count = queues[level].length;
			depth[level] = count;
			total += count;
		}
		depth.total = total;
		return depth;
	}
	function isEmpty() {
		return dequeueOrder.every((u) => queues[u].length === 0);
	}
	function flush() {
		const result = [];
		for (const level of dequeueOrder) {
			const queue = queues[level];
			if (queue.length > 0) result.push(...queue.splice(0));
		}
		return result;
	}
	return {
		enqueue,
		dequeue,
		peek,
		getDepth,
		isEmpty,
		flush
	};
}

//#endregion
//#region src/wire/relay-server.ts
const DEFAULTS = {
	port: 9876,
	host: "127.0.0.1",
	idleTimeoutMs: 3e5,
	pollTimeoutMs: 25e3,
	maxSessions: 50,
	portRange: 10
};
function createRelayServer(config = {}) {
	const basePort = config.port || DEFAULTS.port;
	const host = config.host || DEFAULTS.host;
	const idleTimeoutMs = config.idleTimeoutMs || DEFAULTS.idleTimeoutMs;
	const pollTimeoutMs = config.pollTimeoutMs || DEFAULTS.pollTimeoutMs;
	const maxSessions = config.maxSessions || DEFAULTS.maxSessions;
	const wireDir = node_path.join(node_os.homedir(), ".claude-governance", "wire");
	const pidFile = config.pidFile || node_path.join(wireDir, "relay.pid");
	const portFile = config.portFile || node_path.join(wireDir, "relay.port");
	const logFile = config.logFile || node_path.join(wireDir, "relay.log");
	const registry = createRegistry();
	const mailboxes = /* @__PURE__ */ new Map();
	const pendingPolls = /* @__PURE__ */ new Map();
	let httpServer = null;
	let idleTimer = null;
	let actualPort = 0;
	const startTime = Date.now();
	function log(message) {
		const line = `${(/* @__PURE__ */ new Date()).toISOString()} ${message}\n`;
		try {
			node_fs.appendFileSync(logFile, line);
		} catch {}
	}
	function parseBody(req) {
		return new Promise((resolve) => {
			const chunks = [];
			req.on("data", (chunk) => chunks.push(chunk));
			req.on("end", () => {
				try {
					const text = Buffer.concat(chunks).toString("utf8");
					resolve(text ? JSON.parse(text) : null);
				} catch {
					resolve(null);
				}
			});
			req.on("error", () => resolve(null));
		});
	}
	function json(res, data, status = 200) {
		if (res.headersSent) return;
		res.writeHead(status, { "Content-Type": "application/json" });
		res.end(JSON.stringify(data));
	}
	function deliverToMailbox(envelope) {
		const targetId = envelope.to;
		if (!registry.lookup(targetId)) return false;
		const pending = pendingPolls.get(targetId);
		if (pending) {
			clearTimeout(pending.timer);
			pendingPolls.delete(targetId);
			json(pending.res, { messages: [envelope] });
			return true;
		}
		if (!mailboxes.has(targetId)) mailboxes.set(targetId, createPriorityQueue());
		mailboxes.get(targetId).enqueue(envelope);
		return true;
	}
	function deliverBroadcast(envelope) {
		const sessions = registry.getSessions();
		let delivered = 0;
		for (const [sid] of sessions) {
			if (sid === envelope.from) continue;
			if (deliverToMailbox({
				...envelope,
				to: sid
			})) delivered++;
		}
		return delivered;
	}
	async function handleRequest(req, res) {
		const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
		const method = req.method || "GET";
		const pathname = url.pathname;
		if (pathname === "/register" && method === "POST") {
			const body = await parseBody(req);
			if (!body || !body.sessionId) {
				json(res, { error: "Missing sessionId" }, 400);
				return;
			}
			if (registry.getSessions().length >= maxSessions) {
				json(res, { error: "Max sessions reached" }, 429);
				return;
			}
			const sid = body.sessionId;
			registry.register(sid, {
				identity: body.identity || "unknown",
				capabilities: body.capabilities || []
			});
			mailboxes.set(sid, createPriorityQueue());
			resetIdleTimer();
			log(`Registered: ${sid} (${body.identity || "unknown"})`);
			json(res, { ok: true });
			return;
		}
		if (pathname === "/unregister" && method === "POST") {
			const body = await parseBody(req);
			if (!body || !body.sessionId) {
				json(res, { error: "Missing sessionId" }, 400);
				return;
			}
			const sid = body.sessionId;
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
		if (pathname === "/send" && method === "POST") {
			const body = await parseBody(req);
			if (!body) {
				json(res, { error: "Invalid JSON body" }, 400);
				return;
			}
			const validation = require_protocol.validateEnvelope(body);
			if (!validation.ok) {
				json(res, { error: validation.error }, 400);
				return;
			}
			const envelope = validation.value;
			if (envelope.to === "broadcast") {
				const count = deliverBroadcast(envelope);
				json(res, {
					ok: true,
					delivered: count > 0,
					recipients: count
				});
				return;
			}
			json(res, {
				ok: true,
				delivered: deliverToMailbox(envelope)
			});
			return;
		}
		if (pathname === "/send-batch" && method === "POST") {
			const body = await parseBody(req);
			if (!body || !Array.isArray(body)) {
				json(res, { error: "Body must be a JSON array" }, 400);
				return;
			}
			const results = [];
			for (const raw of body) {
				const validation = require_protocol.validateEnvelope(raw);
				if (!validation.ok) {
					results.push({
						id: raw?.id || null,
						ok: false,
						error: validation.error
					});
					continue;
				}
				const envelope = validation.value;
				const delivered = envelope.to === "broadcast" ? deliverBroadcast(envelope) > 0 : deliverToMailbox(envelope);
				results.push({
					id: envelope.id,
					ok: true,
					delivered
				});
			}
			json(res, {
				ok: true,
				results
			});
			return;
		}
		if (pathname === "/poll" && method === "GET") {
			const sessionId = url.searchParams.get("sessionId");
			if (!sessionId) {
				json(res, { error: "Missing sessionId query param" }, 400);
				return;
			}
			const entry = registry.lookup(sessionId);
			if (!entry) {
				json(res, { error: "Session not registered" }, 404);
				return;
			}
			entry.lastSeen = Date.now();
			const mailbox = mailboxes.get(sessionId);
			if (mailbox && !mailbox.isEmpty()) {
				json(res, { messages: mailbox.flush() });
				return;
			}
			const timeout = parseInt(url.searchParams.get("timeout") || String(pollTimeoutMs), 10);
			const timer = setTimeout(() => {
				pendingPolls.delete(sessionId);
				json(res, { messages: [] });
			}, timeout);
			pendingPolls.set(sessionId, {
				res,
				timer
			});
			req.on("close", () => {
				const p = pendingPolls.get(sessionId);
				if (p && p.res === res) {
					clearTimeout(p.timer);
					pendingPolls.delete(sessionId);
				}
			});
			return;
		}
		if (pathname === "/sessions" && method === "GET") {
			json(res, { sessions: registry.getSessions().map(([sessionId, entry]) => ({
				sessionId,
				...entry
			})) });
			return;
		}
		if (pathname === "/health" && method === "GET") {
			json(res, {
				status: "ok",
				sessions: registry.getSessions().length,
				uptime: Math.floor((Date.now() - startTime) / 1e3),
				port: actualPort
			});
			return;
		}
		json(res, { error: "Not found" }, 404);
	}
	function resetIdleTimer() {
		if (idleTimer) clearTimeout(idleTimer);
		idleTimer = setTimeout(() => {
			if (registry.getSessions().length === 0) {
				log("Idle timeout — no sessions, shutting down");
				shutdown();
			}
		}, idleTimeoutMs);
	}
	function writeStateFiles() {
		node_fs.mkdirSync(node_path.dirname(pidFile), { recursive: true });
		node_fs.writeFileSync(pidFile, String(process.pid));
		node_fs.writeFileSync(portFile, String(actualPort));
	}
	function cleanStateFiles() {
		try {
			node_fs.unlinkSync(pidFile);
		} catch {}
		try {
			node_fs.unlinkSync(portFile);
		} catch {}
	}
	function shutdown() {
		log("Shutting down");
		cleanStateFiles();
		for (const [, pending] of pendingPolls) {
			clearTimeout(pending.timer);
			try {
				json(pending.res, { messages: [] });
			} catch {}
		}
		pendingPolls.clear();
		registry.destroy();
		mailboxes.clear();
		if (httpServer) httpServer.close();
		if (idleTimer) clearTimeout(idleTimer);
		process.exit(0);
	}
	async function start() {
		node_fs.mkdirSync(wireDir, { recursive: true });
		for (let p = basePort; p <= basePort + DEFAULTS.portRange; p++) try {
			actualPort = await new Promise((resolve, reject) => {
				const srv = node_http.createServer((req, res) => {
					handleRequest(req, res).catch((err) => {
						log(`Request error: ${err}`);
						if (!res.headersSent) json(res, { error: "Internal server error" }, 500);
					});
				});
				srv.once("error", (err) => {
					srv.close();
					reject(err);
				});
				srv.listen(p, host, () => {
					srv.removeAllListeners("error");
					httpServer = srv;
					resolve(p);
				});
			});
			writeStateFiles();
			resetIdleTimer();
			log(`Wire relay started on port ${actualPort} (PID ${process.pid})`);
			process.on("SIGTERM", shutdown);
			process.on("SIGINT", shutdown);
			return actualPort;
		} catch (err) {
			if (err.code !== "EADDRINUSE" || p === basePort + DEFAULTS.portRange) throw err;
			log(`Port ${p} in use, trying ${p + 1}`);
		}
		throw new Error("All ports in range exhausted");
	}
	return {
		start,
		shutdown
	};
}
createRelayServer({
	port: parseInt(process.env.WIRE_RELAY_PORT || "9876", 10),
	pollTimeoutMs: parseInt(process.env.WIRE_POLL_TIMEOUT_MS || "25000", 10),
	idleTimeoutMs: parseInt(process.env.WIRE_IDLE_TIMEOUT_MS || "300000", 10)
}).start().catch((err) => {
	process.stderr.write(`Wire relay fatal: ${err}\n`);
	process.exit(1);
});

//#endregion
exports.createRelayServer = createRelayServer;