// The tools #739's checks share (gaps.test.ts, bridge.test.ts): a plugin generated into a scratch folder with its client
// imported, a stand-in that records every request it receives, and Bridge's published description, pinned. Written by
// #739's checks author; the checks judge the generated client by what reaches the stand-in, never by the generator's
// own data.
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type IncomingHttpHeaders } from "node:http";
import { dirname, join } from "node:path";
import { gunzipSync } from "node:zlib";
import { Effect } from "effect";
import { Adapter } from "./service.ts";
import type { PluginFile } from "./types.ts";

/** Bridge's description as Bridge published it, fetched on 24 November 2026 (test/fixtures/bridge/README.md). */
export const BRIDGE = {
  url: "https://withbridge-image1-sv-usw2-monorail-openapi.s3.amazonaws.com/latest.json",
  sha256: "fb8b1fda7edc737da1ac150dc168a9c5e593554f58c72c368870bf05e4723968",
  file: new URL("../../../test/fixtures/bridge/latest.json.gz", import.meta.url),
};
const bridgeBytes = () => gunzipSync(readFileSync(BRIDGE.file));
export const bridgeSha = () => createHash("sha256").update(bridgeBytes()).digest("hex");
export type Node = { readonly [key: string]: any };
export const bridge = (): Node => JSON.parse(bridgeBytes().toString("utf8")) as Node;

export type Call = (input?: unknown) => Promise<unknown>;
export type Calls = { readonly [name: string]: Call | Calls };
export interface Made {
  readonly calls: number;
  readonly files: ReadonlyArray<PluginFile>;
  /** The client the plugin carries, made as a plugin's user makes it. */
  readonly client: (options: Readonly<Record<string, unknown>>) => { readonly calls: Calls };
}

/** What the generator says of a description: the refusal's words, or the counts and files. */
export const generate = (name: string, spec: unknown) => Effect.runSync(Effect.result(Adapter.generate({ name, spec })));

const under = new URL("../../../tmp/checks-739/", import.meta.url).pathname;
// one folder per test file: vitest may run two files in one process, so a pid is not enough
let scratch: string | undefined;
let made = 0;
/** The plugin written to a scratch folder inside the package (so its client finds `effect`), and its client imported. */
export const plugin = (name: string, spec: unknown): Promise<Made> => {
  const r = generate(name, spec);
  if (r._tag === "Failure") return Promise.reject(new Error(`refused: ${r.failure.message}`));
  if (scratch === undefined) { mkdirSync(under, { recursive: true }); scratch = mkdtempSync(join(under, "run-")); }
  const dir = join(scratch, String(made++));
  for (const f of r.success.files) {
    mkdirSync(dirname(join(dir, f.path)), { recursive: true });
    writeFileSync(join(dir, f.path), f.content);
  }
  return import(join(dir, "src/client.ts")).then((m: { client: Made["client"] }) => ({ calls: r.success.calls, files: r.success.files, client: m.client }));
};
export const removePlugins = () => { if (scratch !== undefined) rmSync(scratch, { recursive: true, force: true }); scratch = undefined; };

/** A call by its dotted name, or undefined when the client has no such call. */
export const callAt = (calls: Calls, dotted: string): Call | undefined => {
  const at = dotted.split(".").reduce<Call | Calls | undefined>((tree, part) => (tree === undefined || typeof tree === "function" ? undefined : tree[part]), calls);
  return typeof at === "function" ? at : undefined;
};
/** Every call's dotted name. */
export const callNames = (calls: Calls, prefix = ""): ReadonlyArray<string> =>
  Object.entries(calls).flatMap(([k, v]) => (typeof v === "function" ? [`${prefix}${k}`] : callNames(v, `${prefix}${k}.`)));

/** How a call ended: its value, or the failure's tag and what it carries. */
export const settle = (p: Promise<unknown>): Promise<{ readonly tag: string; readonly value?: unknown; readonly failure?: Node }> =>
  p.then((value) => ({ tag: "ok", value }), (e: Node) => ({ tag: String(e?.["_tag"] ?? "thrown"), failure: e }));

export interface Seen {
  readonly method: string;
  readonly path: string;
  readonly query: string;
  readonly headers: IncomingHttpHeaders;
  /** The body as JSON, or undefined when none came. */
  readonly body: unknown;
}
export interface StandIn {
  readonly origin: string;
  readonly seen: Array<Seen>;
  readonly close: () => void;
}
/** A server on a free port that records each request and answers what `answer` says. */
export const standIn = (answer: (seen: Seen) => { readonly status: number; readonly body: unknown }): Promise<StandIn> =>
  new Promise((ready) => {
    const seen: Array<Seen> = [];
    const server = createServer((req, res) => {
      let text = "";
      req.on("data", (c: Buffer) => { text += c.toString("utf8"); });
      req.on("end", () => {
        const url = new URL(String(req.url), "http://stand-in");
        const one: Seen = { method: String(req.method), path: url.pathname, query: url.search, headers: req.headers, body: text === "" ? undefined : JSON.parse(text) as unknown };
        seen.push(one);
        const a = answer(one);
        res.writeHead(a.status, { "content-type": "application/json" }).end(a.body === undefined ? "" : JSON.stringify(a.body));
      });
    });
    server.listen(0, "127.0.0.1", () => ready({
      origin: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
      seen,
      close: () => { server.closeAllConnections(); server.close(); },
    }));
  });
