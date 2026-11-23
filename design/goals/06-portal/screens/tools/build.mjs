// Builds and renders the screens. Run from design/goals/06-portal/screens/:
//   node tools/build.mjs <kit>   where <kit> is a directory with `npm i @ui-sdk/core@0.1.0-beta.10 @ui-sdk/react@0.1.0-beta.10
//                                react@19.3.1 react-dom@19.3.1 lucide-react@0.468.0 esbuild playwright-core` run in it.
// It writes out/*.html (static, no script) and out/*-{dark,light}.png (1440 wide, Chromium).
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

const kit = resolve(process.argv[2] ?? ".");
const { build } = createRequire(`${kit}/package.json`)("esbuild");
await build({ entryPoints: ["src/render.tsx"], bundle: true, outfile: "out/render.cjs", platform: "node", format: "cjs", jsx: "automatic", nodePaths: [`${kit}/node_modules`], logLevel: "error", loader: { ".css": "empty" } });
execFileSync(process.execPath, ["out/render.cjs"], { stdio: "inherit" });
copyFileSync(`${kit}/node_modules/@ui-sdk/core/dist/web.css`, "out/web.css");
const { chromium } = createRequire(`${kit}/package.json`)("playwright-core");
const exe = process.env.CHROMIUM ?? `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1255/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const browser = await chromium.launch({ executablePath: exe });
for (const scheme of ["dark", "light"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
  const p = await ctx.newPage();
  for (const name of ["map-derived", "map-declared", "agent-view"]) {
    await p.setViewportSize({ width: 1440, height: name === "agent-view" ? 1260 : 900 });
    await p.goto(`file://${resolve("out", name + ".html")}`);
    await p.evaluate((s) => document.documentElement.setAttribute("data-theme", s), scheme);
    await p.waitForTimeout(700);
    await p.screenshot({ path: `out/${name}-${scheme}.png`, fullPage: true });
  }
  await ctx.close();
}
await browser.close();
