// Mounts the real shell (`goal-6/shell-build`) on Plugged In's derived map in Chromium and writes UI SDK's snapshot() to derived/.
// Bundle first: esbuild tools/snapshot-harness.tsx to out/harness.js (iife, jsx automatic, nodePaths the kit's node_modules, json loader).
//   node tools/snapshot.mjs <kit> <out dir>       (writes snapshot-closed.json and snapshot-palette-open.json)
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const kit = resolve(process.argv[2]);
const out = resolve(process.argv[3]);
const { chromium } = createRequire(`${kit}/package.json`)("playwright-core");
const exe = process.env.CHROMIUM ?? `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1255/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.setContent('<!doctype html><html data-theme="dark"><body><div id="root"></div></body></html>');
await p.addScriptTag({ path: resolve("out/harness.js") });
await p.waitForTimeout(500);
writeFileSync(`${out}/snapshot-closed.json`, JSON.stringify(await p.evaluate(() => window.agent.snapshot()), null, 2));
const open = await p.evaluate(async () => {
  const res = await window.agent.act({ steps: [{ ref: "c4", action: "setOpen", args: [true] }] });
  return { res, snap: window.agent.snapshot() };
});
writeFileSync(`${out}/snapshot-palette-open.json`, JSON.stringify(open, null, 2));
await b.close();
