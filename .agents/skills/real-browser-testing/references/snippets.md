# Snippets

Each snippet imports `scripts/cdp.mjs`. Save a snippet as a `.mjs` file in the session scratchpad, change the import path to the skill's `scripts/cdp.mjs`, and run it with `node`. Port 9333 is an example; use the port you launched with.

## Record by hand

`scripts/rec.sh` runs these steps. Use them when you need a different crop or frame range. Launch the browser as in `setup.md`, section 4.

```bash
"$K/winid.sh" "$S/p1"                                   # window id
ffmpeg -f x11grab -framerate 60 -window_id <id> -i "$DISPLAY" -c:v libx264 -qp 0 -preset ultrafast out.mkv
ffmpeg -i out.mkv -vf "crop=W:H:X:Y,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=yavg.txt" -f null -
ffmpeg -i out.mkv -vf "select='between(n,A,B)',scale=360:-1,tile=4x2" -frames:v 1 tiles.png
```

## Back/Forward cache restore

Usage: `node bfcache.mjs URL LINK_SELECTOR STATE_EXPRESSION`. The state expression runs in the restored page, for example `document.querySelector("canvas")?.style.visibility`.

```js
import { connect, sleep } from "./cdp.mjs";
const [url, link, state] = process.argv.slice(2);
const cdp = await connect(9333);
await cdp.send("Page.navigate", { url });
await sleep(3500);
await cdp.evaluate(`addEventListener("pageshow", (e) => { window.__persisted = e.persisted; })`);
await cdp.evaluate(`document.querySelector(${JSON.stringify(link)}).click()`);
await sleep(2500);
await cdp.evaluate("history.back()");
await sleep(2500);
console.log(await cdp.evaluate(`JSON.stringify({ persisted: window.__persisted ?? false,
  state: ${state}, path: location.pathname })`));
cdp.close();
```

`persisted: true` means the page came from the cache. Run it once with the restore code removed, and confirm that the state changes.

## Reported hardware per origin

```js
import { connect, sleep } from "./cdp.mjs";
const cdp = await connect(9333);
for (const url of process.argv.slice(2)) {
  await cdp.send("Page.navigate", { url });
  await sleep(3000);
  console.log(await cdp.evaluate(`JSON.stringify({ host: location.host,
    cores: navigator.hardwareConcurrency, memoryGB: navigator.deviceMemory,
    uaData: "userAgentData" in navigator, secure: isSecureContext })`));
}
cdp.close();
```

Pass each origin twice. A value that changes between origins in one profile is farbling.

## GPU error lines per reload

```js
import { readFileSync } from "node:fs";
import { connect, sleep } from "./cdp.mjs";
const [log, pattern, url, runs] = process.argv.slice(2);
const count = () => (readFileSync(log, "utf8").match(new RegExp(pattern, "g")) ?? []).length;
const cdp = await connect(9333);
await cdp.send("Page.navigate", { url });
await sleep(4000);
const before = count();
for (let i = 0; i < Number(runs); i++) { await cdp.send("Page.reload"); await sleep(4000); }
console.log(`${count() - before} matches of /${pattern}/ in ${runs} reloads`);
cdp.close();
```

Example pattern: `non-existent mailbox`. `log` is the browser's stderr file from the launch command.

## Window bounds

```js
import { connect } from "./cdp.mjs";
const page = await connect(9333);
const browser = await connect(9333, { browser: true });
console.log(await browser.send("Browser.getWindowForTarget", { targetId: page.targetId }));
page.close(); browser.close();
```

## GPU feature status

```js
import { connect } from "./cdp.mjs";
const browser = await connect(9333, { browser: true });
const { gpu } = await browser.send("SystemInfo.getInfo");
const aux = Object.entries(gpu.auxAttributes)
  .filter(([key]) => /gl_renderer|gl_version|angle|vulkan|skia|display|ozone|graphite|backend/i.test(key));
console.log(JSON.stringify({ devices: gpu.devices.map((d) => [d.vendorString, d.deviceString, d.driverVersion]),
  featureStatus: gpu.featureStatus, aux: Object.fromEntries(aux) }, null, 1));
browser.close();
```
