// What the shell's checks share: the fixture app built against `@orthograph/shell` (resolved through its own exports, never imported), served on a
// loopback port with the single-page fallback a router needs, the generated app data of the declared map, and a page opened in Chromium.
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { project, generated, repo, type Project } from "../map/support.ts";

export const shellDir = join(repo, "packages/shell");
const fixture = join(import.meta.dirname, "../fixtures/shell");
export type Layout = "sidebar" | "topNav" | "none";
export type Caller = "anonymous" | "person";

/** The shell's entry, through its package's exports: the check fails with this message while the package does not exist. */
export const shellEntry = (): string => {
  if (!existsSync(join(shellDir, "package.json"))) throw new Error(`@orthograph/shell can't be resolved: ${join(shellDir, "package.json")} does not exist`);
  try { return createRequire(join(shellDir, "package.json")).resolve("@orthograph/shell"); }
  catch (error) { throw new Error(`@orthograph/shell can't be resolved through its exports ("."): ${String(error).split("\n")[0]}`, { cause: error }); }
};

const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".map": "application/json", ".svg": "image/svg+xml" };

export interface Fixture {
  readonly url: string;
  readonly data: Record<string, any>;
  readonly open: (path: string, options?: { readonly layout?: Layout; readonly caller?: Caller; readonly roles?: ReadonlyArray<string>; readonly slots?: boolean; readonly extras?: ReadonlyArray<object>; readonly notFound?: boolean }) => Promise<Page>;
  readonly close: () => Promise<void>;
}

/** Build the fixture app, serve it, and hold a browser: `styles` are the stylesheets the page links, in order (UI SDK's, then the theme's). */
export const serveFixture = async (stylesOf: () => ReadonlyArray<string>): Promise<Fixture> => {
  const entry = shellEntry();
  const styles = stylesOf();
  // Whatever is made is undone, last first, if anything after it fails: the caller has no fixture to close then.
  const undo: Array<() => Promise<void> | void> = [];
  try {
  const out = mkdtempSync(join(tmpdir(), "shell-fixture-"));
  undo.push(() => { rmSync(out, { recursive: true, force: true }); });
  const { build } = await import("vite");
  await build({ root: fixture, configFile: false, logLevel: "silent", resolve: { alias: { "@orthograph/shell": entry } }, build: { outDir: out, emptyOutDir: true, minify: false, rollupOptions: { input: join(fixture, "index.html") } } });
  const p: Project = project(["good", "mount"]);
  undo.push(() => { p.remove(); });
  generated(p);
  const data = { routes: p.json("generated/app/routes.json"), navigation: p.json("generated/app/navigation.json"), palette: p.json<{ entries: unknown }>("generated/app/palette.json").entries, map: p.json("generated/app/map.json") };
  const html = readFileSync(join(out, "index.html"), "utf8").replace("<!--styles-->", styles.map((_, i) => `<link rel="stylesheet" href="/style-${String(i)}.css">`).join(""));
  const server: Server = createServer((req, res) => {
    const pathname = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
    const style = /^\/style-(\d+)\.css$/.exec(pathname);
    const file = style === null ? join(out, pathname) : styles[Number(style[1])] ?? "";
    const send = (status: number, type: string, body: string | Uint8Array) => { res.writeHead(status, { "content-type": type, "cache-control": "no-store" }); res.end(body); };
    if (file.startsWith(out) || style !== null) {
      if (existsSync(file) && statSync(file).isFile() && pathname !== "/index.html") return send(200, TYPES[extname(file)] ?? "application/octet-stream", readFileSync(file));
    }
    // A route: any path that is not a file is the app (the history API's fallback).
    return extname(pathname) in TYPES ? send(404, "text/plain", "not found") : send(200, TYPES[".html"]!, html);
  });
  await new Promise<void>((resolve) => { server.listen(0, "127.0.0.1", resolve); });
  undo.push(() => new Promise<void>((resolve) => { server.close(() => { resolve(); }); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
  const browser: Browser = await chromium.launch({ headless: true });
  undo.push(() => browser.close());
  return {
    url, data,
    open: async (path, options = {}) => {
      const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: "light" })).newPage();
      const layout = options.layout ?? data.navigation.layout;
      await page.addInitScript(`globalThis.__DATA__ = ${JSON.stringify({ ...data, navigation: { ...data.navigation, layout }, map: { ...data.map, layout }, caller: options.caller ?? "person", roles: options.roles ?? [], slots: options.slots ?? true, ...(options.extras === undefined ? {} : { extras: options.extras }), ...(options.notFound === true ? { notFound: true } : {}) })};`);
      await page.goto(`${url}${path}`);
      await page.waitForSelector('[data-shell="root"]', { timeout: 15_000 });
      return page;
    },
    close: async () => { for (const step of undo.reverse()) await step(); },
  };
  } catch (error) {
    for (const step of undo.reverse()) await Promise.resolve(step()).catch(() => undefined);
    throw error;
  }
};
