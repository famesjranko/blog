// Usage: node screencast.mjs CDP_PORT URL RUNS OUTDIR [INTERVAL_MS]
// Captures the renderer's frames (CDP Page.startScreencast) while the page reloads RUNS
// times, INTERVAL_MS apart (default 3000). Writes OUTDIR/frame-00001.jpg ... and
// OUTDIR/times.txt (frame number and page timestamp). Works headless or headed.
// This sees what the renderer paints. It does not see what the compositor presents:
// use rec.sh for that. Measure the frames with the ffmpeg command in setup.md.
import { mkdirSync, writeFileSync } from "node:fs";
import { connect, sleep } from "./cdp.mjs";

const [port, url, runsArg, out, intervalArg] = process.argv.slice(2);
const runs = Number(runsArg);
const interval = Number(intervalArg ?? 3000);
if (!port || !url || !out || !Number.isInteger(runs) || runs < 1) {
	console.error(
		"usage: node screencast.mjs CDP_PORT URL RUNS OUTDIR [INTERVAL_MS]",
	);
	process.exit(2);
}
mkdirSync(out, { recursive: true });

const cdp = await connect(port);
const times = [];
cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
	const n = times.length + 1;
	writeFileSync(
		`${out}/frame-${String(n).padStart(5, "0")}.jpg`,
		Buffer.from(data, "base64"),
	);
	times.push(`${n} ${metadata.timestamp}`);
	await cdp.send("Page.screencastFrameAck", { sessionId });
});
await cdp.send("Page.enable");
await cdp.send("Page.navigate", { url });
await sleep(interval);
await cdp.send("Page.startScreencast", {
	format: "jpeg",
	quality: 90,
	maxWidth: 640,
	maxHeight: 400,
});
for (let i = 0; i < runs; i++) {
	await cdp.send("Page.reload");
	await sleep(interval);
}
await cdp.send("Page.stopScreencast");
writeFileSync(`${out}/times.txt`, `${times.join("\n")}\n`);
console.log(`${times.length} frames in ${out}`);
cdp.close();
