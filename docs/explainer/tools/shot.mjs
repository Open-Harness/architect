// Draws single frames, to look at: node tools/shot.mjs <film> 12.5 40 …  ->  out/<film>/shots/<seconds>.png
import { createRequire } from "node:module"; import { mkdirSync } from "node:fs"; import { join, resolve } from "node:path";
const { chromium } = createRequire(import.meta.url)("playwright");
const film = process.argv[2], here = resolve(import.meta.dirname, ".."), out = join(here, "out", film), dir = join(out, "shots"); mkdirSync(dir, { recursive: true });
const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: Number(process.env.SCALE ?? 1) });
page.on("pageerror", (e) => console.log("page error:", e.message)); page.on("console", (m) => { if (m.type() !== "log") console.log(m.type() + ":", m.text()); });
await page.addInitScript(() => { window.__RENDER__ = true; });
await page.goto("file://" + join(out, "film.html")); await page.waitForFunction(() => window.__ready, null, { timeout: 30000 });
for (const arg of process.argv.slice(3)) {
  const t = Number(arg); await page.evaluate((s) => window.__seek(s), t);
  const file = join(dir, t.toFixed(2).padStart(6, "0") + ".png"); await page.screenshot({ path: file }); console.log(file);
}
await browser.close();
