// Usage: node perf.mjs CDP_PORT ROUNDS URL_A URL_B [OUT_JSON]
// Loads A and B alternately (A,B then B,A ...) in the real browser, ROUNDS times each.
// Prints the median of each metric per build. Writes all raw rows to OUT_JSON if given.
import { writeFileSync } from "node:fs";
import { connect, sleep } from "./cdp.mjs";

const [port, roundsArg, urlA, urlB, outFile] = process.argv.slice(2);
const rounds = Number(roundsArg);
if (!port || !Number.isInteger(rounds) || rounds < 1 || !urlA || !urlB) {
	console.error("usage: node perf.mjs CDP_PORT ROUNDS URL_A URL_B [OUT_JSON]");
	process.exit(2);
}

// Observers must exist before page scripts run, so they go on every new document.
// __contextAt records when the page first asks a connected canvas for a context.
// The IIFE keeps every name out of the page's global scope: a top-level const here
// would make a page script that declares the same name fail to run.
const OBSERVERS = `(() => {
  window.__lcp = 0; window.__long = 0; window.__contextAt = 0;
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; })
    .observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((l) => { window.__long += l.getEntries().length; })
    .observe({ type: "longtask", buffered: true });
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (...args) {
    if (this.isConnected && !window.__contextAt) window.__contextAt = performance.now();
    return getContext.apply(this, args);
  };
})();`;

const LOAD = `(() => {
  const nav = performance.getEntriesByType("navigation")[0];
  const fcp = performance.getEntriesByName("first-contentful-paint")[0];
  return { fcp: fcp?.startTime, lcp: window.__lcp, dcl: nav.domContentLoadedEventEnd,
    load: nav.loadEventEnd, contextAt: window.__contextAt };
})()`;

// Four seconds of requestAnimationFrame timestamps give fps, p95 frame time, and slow frames.
const RUNTIME = `new Promise((ok) => {
  const ts = []; const t0 = performance.now(); const long0 = window.__long;
  const tick = (t) => {
    ts.push(t);
    if (t - t0 < 4000) return requestAnimationFrame(tick);
    const d = ts.slice(1).map((x, i) => x - ts[i]).sort((a, b) => a - b);
    ok({ fps: (ts.length - 1) / ((ts.at(-1) - ts[0]) / 1000), p95FrameMs: d[Math.floor(d.length * 0.95)],
      over25ms: d.filter((x) => x > 25).length, longTasks: window.__long - long0 });
  };
  requestAnimationFrame(tick);
})`;

async function measure(cdp, url) {
	await cdp.navigate(url);
	await sleep(3500);
	const load = await cdp.evaluate(LOAD);
	const runtime = await cdp.evaluate(RUNTIME);
	const { metrics } = await cdp.send("Performance.getMetrics");
	const heap = metrics.find((m) => m.name === "JSHeapUsedSize").value / 1048576;
	return { ...load, ...runtime, heapMB: heap };
}

const median = (values) => {
	const sorted = values
		.filter((v) => typeof v === "number")
		.sort((a, b) => a - b);
	return sorted.length ? sorted[Math.floor(sorted.length / 2)] : Number.NaN;
};

const cdp = await connect(port);
// Page.enable must come first; without it addScriptToEvaluateOnNewDocument silently does nothing.
await cdp.send("Page.enable");
await cdp.send("Performance.enable");
await cdp.send("Page.bringToFront");
await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: OBSERVERS });

const rows = { A: [], B: [] };
for (let i = 0; i < rounds; i++) {
	for (const label of i % 2 ? ["B", "A"] : ["A", "B"]) {
		rows[label].push(await measure(cdp, label === "A" ? urlA : urlB));
	}
}
if (outFile) {
	writeFileSync(outFile, JSON.stringify({ urlA, urlB, rows }, null, 1));
}
for (const label of ["A", "B"]) {
	const keys = Object.keys(rows[label][0]);
	console.log(
		label,
		keys
			.map((k) => `${k}=${median(rows[label].map((r) => r[k])).toFixed(1)}`)
			.join(" "),
	);
}
cdp.close();
