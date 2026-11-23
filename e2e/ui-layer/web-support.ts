// What ST1.26's checks share (Goal 5, slice 2; K29 section 3): the model they judge against, the generated pieces they need, a Plugged In world
// on real workerd and D1, a page that mounts the generated pieces (`page/*.tsx`, check code, bundled by esbuild), and headless Chromium.
// Written by the checks author; a builder never edits it (AGENTS.md, "Journeys and checks come first").
//
// The page is check code and imports only the generated pieces, UI SDK and the one host seam (`page/boot.tsx`). No jsdom anywhere.
/// <reference lib="dom" />
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, request as forward, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { build } from "esbuild";
import { Effect } from "effect";
import { copyOf, repo } from "../layer1/support.ts";
import { openLoop, type Loop } from "../m1/loop-world.ts";

export { repo };
export const pluggedIn = join(repo, "examples/plugged-in");
const here = import.meta.dirname;

// ---- the model: where every expected value comes from ----

export interface ModelOperation {
  readonly name: string;
  readonly thing: string;
  readonly verb: string;
  readonly description: string;
  readonly payload: Record<string, { readonly description?: string }>;
  readonly move: null | { readonly emits: string };
  readonly refusals: ReadonlyArray<string>;
  readonly needsApproval?: true;
}
export interface Model { readonly refusals: Record<string, string>; readonly operations: Record<string, ModelOperation>; readonly journeys: Record<string, { readonly name: string; readonly steps: ReadonlyArray<{ readonly title: string; readonly call: { readonly operation: string } }> }> }
export const model = (): Model => JSON.parse(readFileSync(join(pluggedIn, "generated/model/model.json"), "utf8")) as Model;

/** A refusal an operation declares, by name, with its code from the model's own table: `{ name: "HandleTaken", code: "HN-001" }`. */
export const declaredError = (m: Model, operation: string, name: string) => {
  const code = m.refusals[name];
  if (code === undefined || !m.operations[operation]!.refusals.includes(name)) throw new Error(`the model's ${operation} declares no refusal ${name}`);
  return { name, code };
};

/** The label a payload field's input has: the field's key with a capital (K29 section 3.2: "the label 'Name' from the field's key"). */
export const labelOf = (key: string) => key.charAt(0).toUpperCase() + key.slice(1);

// ---- the pieces, which the web projection writes (ST1.25) ----

/** The files K29 section 3 says each operation's piece has, and the one file per framework. */
export const pieceFiles = (...operations: ReadonlyArray<string>) => [
  "packages/web/src/index.ts",
  "examples/plugged-in/generated/web/react.tsx",
  ...operations.flatMap((op) => {
    const [thing, verb] = op.split(".");
    return [`examples/plugged-in/generated/web/${thing}/${verb}.ts`, `examples/plugged-in/generated/web/${thing}/${verb}.react.tsx`];
  }),
];
/** What is missing, as a sentence a builder can act on: empty when every file is there. */
export const piecesMissing = (...operations: ReadonlyArray<string>) => pieceFiles(...operations).filter((f) => !existsSync(join(repo, f)));
export const needPieces = (...operations: ReadonlyArray<string>) => {
  const missing = piecesMissing(...operations);
  return missing.length === 0 ? undefined : `the web projection has written no piece for ${operations.join(", ")} (K29 section 3); missing: ${missing.join(", ")}`;
};

// ---- the page ----

/** Bundles `page/<scene>.tsx` for Chromium; `@plugged-in/web`, `@plugged-in/sdk` and `@orthograph/web` are where K29 puts them. */
export const buildScene = async (scene: "claim" | "release" | "profile") => {
  const dir = mkdtempSync(join(tmpdir(), "ortho-ui-layer-"));
  await build({
    entryPoints: { main: join(here, "page", `${scene}.tsx`) },
    bundle: true, format: "esm", outdir: dir, jsx: "automatic", target: "es2023", logLevel: "silent",
    conditions: ["development"],
    alias: {
      "@plugged-in/web": join(pluggedIn, "generated/web"),
      "@plugged-in/sdk": join(pluggedIn, "generated/sdk/src/index.ts"),
      "@orthograph/web": join(repo, "packages/web/src/index.ts"),
    },
    nodePaths: [join(pluggedIn, "node_modules"), join(repo, "e2e/node_modules")],
    loader: { ".css": "css" },
    plugins: [{
      // One copy of React and UI SDK, the checks' own, however the pieces would resolve them.
      name: "one-copy",
      setup: (b) => b.onResolve({ filter: /^(react|react-dom|@ui-sdk\/core|@ui-sdk\/react)(\/.*)?$/ }, async (args) =>
        args.pluginData === "one-copy" ? undefined : b.resolve(args.path, { resolveDir: join(repo, "e2e"), kind: args.kind, pluginData: "one-copy" })),
    }],
  });
  writeFileSync(join(dir, "index.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>ui-layer check</title><link rel="stylesheet" href="/main.css"></head><body><main id="root"></main><script type="module" src="/main.js"></script></body></html>\n`);
  return { dir, remove: () => rmSync(dir, { recursive: true, force: true }) };
};

export interface Person { readonly name: string; readonly token: string }
export interface Site {
  readonly url: string;
  readonly loop: Loop;
  readonly chrome: Browser;
  readonly person: (name: string) => Promise<Person>;
  /** A page signed in as `who` (nobody: a visitor), the token handed in before the page loads and never printed. */
  readonly open: (who: Person | undefined, query?: Record<string, string>, beforeLoad?: (page: Page) => Promise<void>) => Promise<Page & { readonly problems: Array<string> }>;
  readonly close: () => Promise<void>;
}

const types: Record<string, string> = { html: "text/html", js: "text/javascript", css: "text/css" };

/** A world of Plugged In (as `ortho prove` makes one), the page of one scene on the same origin, and headless Chromium. */
export const openSite = async (scene: "claim" | "release" | "profile"): Promise<Site> => {
  const copy = copyOf(pluggedIn);
  const dist = await buildScene(scene).catch((error) => { copy.remove(); throw error; });
  const loop = await openLoop(copy.root).catch((error) => { copy.remove(); dist.remove(); throw error; });
  const server: Server = createServer((req, res) => {
    const path = (req.url ?? "/").split("?")[0]!;
    const name = path === "/" ? "index.html" : path.slice(1);
    const type = types[name.split(".").at(-1) ?? ""];
    if (req.method === "GET" && type !== undefined && !name.includes("..") && existsSync(join(dist.dir, name))) {
      res.writeHead(200, { "content-type": type }).end(readFileSync(join(dist.dir, name)));
      return;
    }
    const target = new URL(req.url ?? "/", loop.url);
    req.pipe(forward(target, { method: req.method, headers: { ...req.headers, host: target.host } }, (answer) => { res.writeHead(answer.statusCode ?? 502, answer.headers); answer.pipe(res); }));
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const chrome = await chromium.launch({ headless: true });
  const open: Site["open"] = async (who, query = {}, beforeLoad) => {
    const page = await chrome.newPage();
    const problems: Array<string> = [];
    page.on("pageerror", (error) => problems.push(`page error: ${error.message}`));
    page.on("console", (message) => { if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) problems.push(`console: ${message.text()}`); });
    await page.addInitScript((token) => { (window as unknown as { __ortho: unknown }).__ortho = { token }; }, who?.token);
    await beforeLoad?.(page);
    await page.goto(`${url}/?${new URLSearchParams(query)}`);
    await page.waitForFunction(() => (window as unknown as { __ortho?: { ready?: boolean } }).__ortho?.ready === true, undefined, { timeout: 20_000 }).catch(() => { throw new Error(`the page never mounted its piece:\n${problems.join("\n")}`); });
    return Object.assign(page, { problems });
  };
  return {
    url, loop, chrome, open,
    person: async (name) => ({ name, token: (await loop.cast([name]))[name]! }),
    close: async () => {
      await chrome.close().catch(() => undefined);
      await new Promise<void>((done) => { server.closeAllConnections(); server.close(() => done()); });
      await loop.close();
      dist.remove();
      copy.remove();
    },
  };
};

// ---- Plugged In's own SDK, from Node: how the checks set a world up and read it back (a recording, never the page) ----

type Sdk = typeof import("../../examples/plugged-in/generated/sdk/src/index.ts");
let sdk: Sdk | undefined;
const sdkOf = async () => (sdk ??= await import("../../examples/plugged-in/generated/sdk/src/index.ts"));

/** One call through the generated SDK as `who` (nobody: a visitor): the answer, or the declared error's name and code. */
export const call = async <A = Record<string, unknown>>(site: Site, who: Person | undefined, operation: `${"handle" | "link" | "profile"}.${string}`, payload: Record<string, unknown>): Promise<{ readonly ok: true; readonly answer: A } | { readonly ok: false; readonly error: string; readonly code: string | undefined }> => {
  const S = await sdkOf();
  const [thing, verb] = operation.split(".") as [keyof Sdk & string, string];
  const fn = (S[thing] as unknown as Record<string, (p: unknown) => Effect.Effect<unknown, { _tag: string; code?: string }, unknown>>)[verb]!;
  return Effect.runPromise(
    fn(payload).pipe(
      Effect.map((answer) => ({ ok: true as const, answer: answer as A })),
      Effect.catch((error) => Effect.succeed({ ok: false as const, error: error._tag, code: error.code })),
      Effect.provide(S.layer({ url: site.loop.url, ...(who ? { credential: S.Credential.session(who.token) } : {}) })) as never,
    ),
  ) as never;
};

/** What the world's journal holds for the traces of every request that reached its door at `path` since `from` (a recording of what was written). */
export const written = async (site: Site, path: string, from = 0) => {
  const seen = site.loop.proxy.seen.slice(from).filter((s) => s.path === path);
  return (await Promise.all(seen.map((s) => site.loop.journal(s.trace)))).flat().map((e) => String(e.event));
};
/** How many requests reached the world's door at `path` so far. */
export const reached = (site: Site, path: string) => site.loop.proxy.seen.filter((s) => s.path === path).length;

// ---- the agent bridge, driven from the test (UI SDK's own `createAgent`, mounted by page/boot.tsx) ----

export interface Entry { readonly ref: string; readonly label?: string; readonly component: string; readonly actions?: ReadonlyArray<string>; readonly value?: unknown; readonly [key: string]: unknown }
export interface ActResult { readonly ok: boolean; readonly error?: { readonly message?: string }; readonly [key: string]: unknown }
export const snapshot = (page: Page) => page.evaluate(() => (window as any).__ortho.agent.snapshot()) as Promise<ReadonlyArray<Entry>>;
export const act = (page: Page, steps: ReadonlyArray<Record<string, unknown>>) => page.evaluate((s) => (window as any).__ortho.agent.act({ steps: s }), steps as never) as Promise<ActResult>;
/** The component the agent can send a piece's verb with: the one entry whose actions include `submit`. */
export const submitOf = (entries: ReadonlyArray<Entry>) => entries.filter((e) => e.actions?.includes("submit"));
/** One input of a form, as the agent finds it: by the label K29 gives it. */
export const inputOf = (entries: ReadonlyArray<Entry>, label: string) => entries.filter((e) => e.label === label);

/** Waits for `read` to say yes (a state of the page, never a delay), failing with what it last saw. */
export const until = async <A>(what: string, read: () => Promise<A>, done: (a: A) => boolean, ms = 15_000): Promise<A> => {
  const end = Date.now() + ms;
  let last = await read();
  while (!done(last) && Date.now() < end) { await new Promise((r) => setTimeout(r, 50)); last = await read(); }
  if (!done(last)) throw new Error(`${what}: never happened; last seen ${JSON.stringify(last)}`);
  return last;
};
