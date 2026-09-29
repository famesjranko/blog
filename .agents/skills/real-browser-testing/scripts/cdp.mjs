// Minimal Chrome DevTools Protocol client on Node's built-in fetch and WebSocket.
// Usage: const cdp = await connect(9333); await cdp.navigate(url); await cdp.send("Page.reload");
// cdp.on("Page.screencastFrame", (params) => ...) receives events.
// The browser must run with --remote-debugging-port=<port> and a throwaway --user-data-dir.

export const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function openSocket(url) {
	const ws = new WebSocket(url);
	await new Promise((open, fail) => {
		ws.onopen = open;
		ws.onerror = () => fail(new Error(`cannot open ${url}`));
	});
	return ws;
}

// Tracks requests by id. When the socket closes, every pending request fails and
// later sends fail at once, so a crashed browser is an error, not a silent stall.
function requests(ws) {
	let lastId = 0;
	let closed = null;
	const pending = new Map();
	ws.addEventListener("close", () => {
		closed = new Error("browser connection closed");
		for (const waiter of pending.values()) {
			waiter.fail(closed);
		}
		pending.clear();
	});
	const settle = (reply) => {
		const waiter = pending.get(reply.id);
		if (!waiter) {
			return;
		}
		pending.delete(reply.id);
		if (reply.error) {
			waiter.fail(new Error(`${waiter.method}: ${reply.error.message}`));
		} else {
			waiter.done(reply.result);
		}
	};
	const send = (method, params = {}) => {
		if (closed) {
			return Promise.reject(closed);
		}
		return new Promise((done, fail) => {
			lastId += 1;
			pending.set(lastId, { done, fail, method });
			ws.send(JSON.stringify({ id: lastId, method, params }));
		});
	};
	return { settle, send };
}

function client(ws) {
	const { settle, send } = requests(ws);
	const listeners = new Map();
	// Replies carry the id of their request; events carry none.
	ws.addEventListener("message", (message) => {
		const data = JSON.parse(message.data);
		if (data.id !== undefined) {
			settle(data);
			return;
		}
		for (const handler of listeners.get(data.method) ?? []) {
			handler(data.params);
		}
	});
	const evaluate = async (expression) => {
		const out = await send("Runtime.evaluate", {
			expression,
			returnByValue: true,
			awaitPromise: true,
		});
		if (out.exceptionDetails) {
			throw new Error(`page threw: ${out.exceptionDetails.text}`);
		}
		return out.result.value;
	};
	// CDP reports a failed navigation (refused connection, bad port) in the result,
	// not as a protocol error. Without this check a script measures the error page.
	const navigate = async (url) => {
		const out = await send("Page.navigate", { url });
		if (out.errorText) {
			throw new Error(`navigation to ${url} failed: ${out.errorText}`);
		}
		return out;
	};
	// Events (messages without an id) go to handlers registered for their method.
	const on = (method, handler) => {
		listeners.set(method, [...(listeners.get(method) ?? []), handler]);
	};
	return { send, evaluate, navigate, on, close: () => ws.close() };
}

// Connect to the first page target. With browser: true, connect to the browser
// target instead (needed for SystemInfo.* and Browser.*).
async function endpoint(port, path) {
	try {
		return await (await fetch(`http://127.0.0.1:${port}${path}`)).json();
	} catch {
		throw new Error(
			`no browser answers on CDP port ${port}; launch one with --remote-debugging-port=${port}`,
		);
	}
}

export async function connect(port, { browser = false } = {}) {
	if (browser) {
		const version = await endpoint(port, "/json/version");
		return client(await openSocket(version.webSocketDebuggerUrl));
	}
	const page = (await endpoint(port, "/json/list")).find(
		(t) => t.type === "page",
	);
	if (!page) {
		throw new Error(`no page target on port ${port}`);
	}
	return {
		...client(await openSocket(page.webSocketDebuggerUrl)),
		targetId: page.id,
	};
}
