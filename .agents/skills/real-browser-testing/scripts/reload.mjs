// Usage: node reload.mjs CDP_PORT URL|- RUNS [INTERVAL_MS] [cold]
// Brings the page to the front. Navigates to URL and waits one interval, unless URL is "-".
// Then loads the page RUNS times, INTERVAL_MS apart (default 3000). Prints nothing on success.
// Default mode reloads: the browser keeps the old page on screen until the new one paints.
// "cold" mode needs a URL. For each run it opens about:blank, clears the HTTP cache, and
// navigates to URL: a first visit, where the browser has no old page of this site to keep.
import { connect, sleep } from "./cdp.mjs";

const [port, url, runsArg, intervalArg, mode] = process.argv.slice(2);
const runs = Number(runsArg);
const interval = Number(intervalArg ?? 3000);
const cold = mode === "cold";
const valid =
	port && url && Number.isInteger(runs) && runs >= 0 && interval > 0;
if (!valid || (mode !== undefined && !cold) || (cold && url === "-")) {
	console.error(
		"usage: node reload.mjs CDP_PORT URL|- RUNS [INTERVAL_MS] [cold]",
	);
	process.exit(2);
}

const cdp = await connect(port);
await cdp.send("Page.bringToFront");
if (url !== "-" && !cold) {
	await cdp.navigate(url);
	await sleep(interval);
}
for (let i = 0; i < runs; i++) {
	if (cold) {
		await cdp.navigate("about:blank");
		await sleep(1000);
		await cdp.send("Network.clearBrowserCache");
		await cdp.navigate(url);
	} else {
		await cdp.send("Page.reload");
	}
	await sleep(interval);
}
cdp.close();
