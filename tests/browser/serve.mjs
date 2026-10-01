import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, normalize, sep } from "node:path";

const requestedPort = process.argv[2] ?? "";
const port = Number(requestedPort);
if (!/^\d+$/.test(requestedPort) || port < 1 || port > 65535) {
	throw new Error(
		`serve.mjs needs a port from 1 to 65535 as its first argument, got "${requestedPort}"`,
	);
}

const root = join(process.cwd(), "dist");
/** @type {Record<string, string>} */
const types = {
	".avif": "image/avif",
	".css": "text/css",
	".html": "text/html; charset=utf-8",
	".jpg": "image/jpeg",
	".js": "text/javascript",
	".svg": "image/svg+xml",
	".webp": "image/webp",
	".woff2": "font/woff2",
};

/**
 * A malformed request target is the client's error, so it answers 400
 * instead of rejecting the handler and taking the server down.
 * @param {string} target
 * @returns {{ pathname: string, decoded: string } | null}
 */
function parseTarget(target) {
	if (!URL.canParse(target, "http://localhost")) {
		return null;
	}
	const { pathname } = new URL(target, "http://localhost");
	try {
		return { pathname, decoded: decodeURIComponent(pathname) };
	} catch (error) {
		if (error instanceof URIError) {
			return null;
		}
		throw error;
	}
}

createServer(async (request, response) => {
	const target = parseTarget(request.url ?? "/");
	if (target === null) {
		response.writeHead(400).end("Bad request");
		return;
	}
	const relative = normalize(target.decoded).replace(/^[/\\]+/, "");
	if (relative.startsWith(`..${sep}`) || relative === "..") {
		response.writeHead(403).end();
		return;
	}
	const index = target.pathname.endsWith("/") ? "index.html" : "";
	const file = join(root, relative, index);
	try {
		const content = await readFile(file);
		const extension = file.slice(file.lastIndexOf("."));
		response
			.writeHead(200, {
				"content-type": types[extension] ?? "application/octet-stream",
			})
			.end(content);
	} catch {
		response.writeHead(404).end("Not found");
	}
}).listen(port, "127.0.0.1");
