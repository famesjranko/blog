import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, normalize, sep } from "node:path";

const root = join(process.cwd(), "dist");
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

createServer(async (request, response) => {
	const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
	const relative = normalize(decodeURIComponent(pathname)).replace(
		/^[/\\]+/,
		"",
	);
	if (relative.startsWith(`..${sep}`) || relative === "..") {
		response.writeHead(403).end();
		return;
	}
	const file = join(root, relative, pathname.endsWith("/") ? "index.html" : "");
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
}).listen(4173, "127.0.0.1");
