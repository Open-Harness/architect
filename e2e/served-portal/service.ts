import { existsSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { chromium, type Browser, type BrowserContext } from "playwright";
import { pagesOf } from "./internal/pages.ts";
import { listen } from "./internal/static.ts";
import { CLOCK_ISO, HOOKS, ServedPortalUnavailable, type OpenOptions, type Fetched, type PortalServerModule, type RenderedPage, type ServedPortal, type ServedPortalsApi } from "./types.ts";

const DEFAULT_CLIENT = join(import.meta.dirname, "../../packages/portal/dist/client");
const READY_MS = 15_000;

let browser: Promise<Browser> | undefined;
const opened = new Set<ServedPortal>();

const unavailable = (error: unknown): never => {
  throw new ServedPortalUnavailable("no-browser", `K19: the served portal is read in headless Chromium and it did not start (${String(error).split("\n")[0]}); run \`pnpm exec playwright install chromium\` in e2e`);
};

/** One headless Chromium for the process, from Playwright's own download (`playwright install chromium`), never a container. */
const chromiumBrowser = (launch?: () => Promise<Browser>): Promise<Browser> => {
  if (launch !== undefined) return launch().catch(unavailable);
  browser ??= chromium.launch({ headless: true }).catch((error: unknown) => { browser = undefined; return unavailable(error); });
  return browser;
};

const serverOf = async (given: PortalServerModule | undefined, specifier = "@orthograph/portal/server"): Promise<PortalServerModule> => {
  if (given !== undefined) return given;
  const loaded = await import(/* @vite-ignore */ specifier).catch((error: unknown) => {
    throw new ServedPortalUnavailable("no-server", `K19: ${specifier} does not load (${String(error).split("\n")[0]}). The portal's server half is its own entry, exporting \`PortalServer.handle(context, request)\` for \`/_portal/v1/*\`, with no React and no HeroUI.`);
  }) as Partial<PortalServerModule>;
  if (typeof loaded.PortalServer?.handle !== "function") throw new ServedPortalUnavailable("no-server", `K19: ${specifier} loads but exports no \`PortalServer.handle(context, request)\`.`);
  return loaded as PortalServerModule;
};

const newContext = (b: Browser): Promise<BrowserContext> =>
  b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, reducedMotion: "reduce", colorScheme: "light", locale: "en-US", timezoneId: "UTC", serviceWorkers: "block" });

/** The two halves of the Worker, played here: the data API from the server module, the built client from a folder. */
const playWorker = async (options: OpenOptions): Promise<{ readonly url: string; readonly answer: (request: Request) => Promise<Response>; readonly stop: () => Promise<void> }> => {
  const clientDir = options.clientDir ?? DEFAULT_CLIENT;
  const server = await serverOf(options.server, options.serverSpecifier);
  if (!existsSync(join(clientDir, "index.html"))) {
    throw new ServedPortalUnavailable("no-client", `K19: the portal's client is not built: ${join(clientDir, "index.html")} is missing. \`@orthograph/portal\` builds its pages once, with portal-ui and HeroUI Pro, into dist/client (HTML, JS, CSS) at our build.`);
  }
  const run = options.run ?? ((effect: unknown) => Effect.runPromise(effect as Effect.Effect<Response>));
  const answer = (request: Request) => run(server.PortalServer.handle(options.context, request));
  const { url, server: http } = await listen(clientDir, answer);
  return { url, answer, stop: () => new Promise<void>((resolve) => { http.close(() => { resolve(); }); http.closeAllConnections(); }) };
};

const open: ServedPortalsApi["open"] = async (options) => {
  // `url`: a portal some other Worker serves (a world `ortho` started), read the same way; there is no Worker to play.
  const worker = options.url === undefined ? await playWorker(options) : { url: options.url, answer: (request: Request) => fetch(`${options.url}${new URL(request.url).pathname}${new URL(request.url).search}`), stop: () => Promise.resolve() };
  const { url, answer } = worker;
  // The Worker is already listening: if anything after it fails, release it, or `closeAll` could never reach it.
  const context = await chromiumBrowser(options.launch).then(newContext).catch(async (error: unknown) => { await worker.stop(); throw error; });
  // A fixed clock, long ago: a client that reads the time draws it, and the checks see it every run, not only when two runs differ.
  await context.clock.setFixedTime(new Date(CLOCK_ISO)).catch(async (error: unknown) => { await context.close().catch(() => undefined); await worker.stop(); throw error; });

  const visit = async <T>(route: string, keep: (page: import("playwright").Page) => Promise<T>): Promise<RenderedPage & { readonly kept: T | undefined }> => {
    const page = await context.newPage();
    const fetched: Array<Fetched> = [];
    const reads: Array<Promise<void>> = [];
    page.on("response", (response) => {
      const target = new URL(response.url());
      if (target.pathname.startsWith("/_portal/v1/")) reads.push(response.text().then((text) => { fetched.push({ path: `${target.pathname}${target.search}`, status: response.status(), text }); }, () => undefined));
    });
    try {
      const navigated = await page.goto(`${url}${route}`, { waitUntil: "load" });
      if (navigated !== null && navigated.status() !== 200) return { status: navigated.status(), html: await page.content(), fetched, kept: undefined };
      await page.waitForSelector(HOOKS.ready, { state: "attached", timeout: READY_MS }).catch(() => {
        throw new ServedPortalUnavailable("never-ready", `K19: ${route} never said it was ready: no \`[data-portal="page"][data-ready="true"]\` within ${READY_MS} ms. The client sets it once the page has drawn from \`/_portal/v1/*\`; \`data-status\` is the page's own status (404 for a route that is not a page).`);
      });
      const kept = await keep(page);
      await Promise.all(reads);
      const status = Number(await page.getAttribute(HOOKS.page, "data-status") ?? "200");
      return { status, html: await page.content(), fetched, kept };
    } finally { await page.close(); }
  };

  const portal: ServedPortal = {
    url,
    page: async (route) => { const { kept: _, ...page } = await visit(route, () => Promise.resolve(undefined)); return page; },
    // Each call keeps its own picture: calls in parallel on one portal never share one.
    shoot: async (route) => {
      const { kept } = await visit(route, (page) => page.screenshot({ animations: "disabled", caret: "hide", fullPage: true }));
      return kept ?? new Uint8Array();
    },
    evaluate: async <T>(route: string, expression: string) => (await visit(route, (page) => page.evaluate(expression) as Promise<T>)).kept as T,
    data: async (path) => {
      const response = await answer(new Request(`http://127.0.0.1${path}`));
      return { status: response.status, text: await response.text() };
    },
    close: async () => {
      opened.delete(portal);
      await context.close().catch(() => undefined);
      await worker.stop();
    },
  };
  opened.add(portal);
  return portal;
};

export const ServedPortals: ServedPortalsApi = {
  open,
  pages: (wire, serve, onUnavailable) => pagesOf(open, wire, serve, onUnavailable),
  closeAll: async () => {
    await Promise.all([...opened].map((p) => p.close()));
    const b = browser;
    browser = undefined;
    if (b !== undefined) await (await b.catch(() => undefined))?.close();
  },
};
