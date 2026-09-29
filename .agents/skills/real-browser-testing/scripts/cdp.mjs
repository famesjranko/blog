// Minimal Chrome DevTools Protocol client on Node's built-in fetch and WebSocket.
// Usage: const cdp = await connect(9333); await cdp.send("Page.reload");
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

function client(ws) {
	let lastId = 0;
	const pending = new Map();
	const listeners = new Map();
	const emit = (event) => {
		for (const handler of listeners.get(event.method) ?? []) {
			handler(event.params);
		}
	};
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
	// Replies carry the id of their request; events carry none.
	ws.onmessage = (message) => {
		const data = JSON.parse(message.data);
		if (data.id === undefined) {
			emit(data);
		} else {
			settle(data);
		}
	};
	const send = (method, params = {}) =>
		new Promise((done, fail) => {
			lastId += 1;
			pending.set(lastId, { done, fail, method });
			ws.send(JSON.stringify({ id: lastId, method, params }));
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
	// Events (messages without an id) go to handlers registered for their method.
	const on = (method, handler) => {
		listeners.set(method, [...(listeners.get(method) ?? []), handler]);
	};
	return { send, evaluate, on, close: () => ws.close() };
}

// Connect to the first page target. With browser: true, connect to the browser
// target instead (needed for SystemInfo.* and Browser.*).
export async function connect(port, { browser = false } = {}) {
	const base = `http://127.0.0.1:${port}`;
	if (browser) {
		const version = await (await fetch(`${base}/json/version`)).json();
		return client(await openSocket(version.webSocketDebuggerUrl));
	}
	const page = (await (await fetch(`${base}/json/list`)).json()).find(
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
