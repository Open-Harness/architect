// What check 14 shares: how acme's generated clients are compared with what the fixed renderers wrote before they were
// mounted (M1.12: "acme's generated clients unchanged apart from the new options"), and the instruments the SDK contract
// is judged with: a proxy that loses a response, a world the clients talk to, and a program that runs the generated SDK.
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Effect, Exit, Scope } from "effect";
import { Collectors, Worlds } from "@orthograph/prove";
import { HEADER } from "./projections.ts";
import { repo } from "../layer1/support.ts";

// ---- what "unchanged" means for the clients ----

export const baselinePath = join(repo, "e2e/fixtures/m1/clients/acme-baseline.json");
export interface ClientBaseline {
  /** `<sdk|cli|mcp>/<path>` to the digest of its bytes, header line aside, from acme's checked-in `generated/` at m1 3a99bd92. */
  readonly files: Record<string, string>;
  /** What `generated/sdk/src/index.ts` exported: its own names, and each thing's functions. */
  readonly exports: { readonly top: ReadonlyArray<string>; readonly things: Record<string, ReadonlyArray<string>> };
}
export const baseline = () => JSON.parse(readFileSync(baselinePath, "utf8")) as ClientBaseline;

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const walk = (root: string, dir: string): ReadonlyArray<string> => existsSync(join(root, dir))
  ? readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(root, `${dir}/${e.name}`) : [`${dir}/${e.name}`])).sort()
  : [];

/** The header line may say the blueprint or the mount made the file; the CLI's entry has a shebang above it. Both are read as one fixed line. */
export const headerless = (text: string) => {
  const lines = text.split("\n");
  const at = lines[0]?.startsWith("#!") ? 1 : 0;
  if (HEADER.test(lines[at] ?? "")) lines[at] = "// Generated from <header>. Do not edit.";
  return lines.join("\n");
};
export const digestOf = (root: string, folder: string): Record<string, string> =>
  Object.fromEntries(walk(root, `generated/${folder}`).map((path) => [path.slice("generated/".length), sha(headerless(readFileSync(join(root, path), "utf8")))]));
export const clientDigest = (root: string) => ({ ...digestOf(root, "sdk"), ...digestOf(root, "cli"), ...digestOf(root, "mcp") });

/** The SDK's files that carry the new options: the layer, the barrel (which exports what the options need), and each operation's function (not the barrel `index.ts` of a thing, nor its `types.ts`: a type declaration takes no options). */
export const carriesOptions = (path: string) => path === "sdk/src/client.ts" || path === "sdk/src/index.ts" || (/^sdk\/src\/[^/]+\/[^/]+\.ts$/.test(path) && !path.endsWith("/index.ts") && !path.endsWith("/types.ts"));

/** What differs between the baseline and a project's clients, other than the new options: missing, extra (only the SDK may gain files) and changed. */
export const differences = (want: Record<string, string>, got: Record<string, string>) => [
  ...Object.keys(want).filter((p) => !(p in got)).map((p) => `missing ${p}`),
  ...Object.keys(got).filter((p) => !(p in want) && !p.startsWith("sdk/")).map((p) => `extra ${p}`),
  ...Object.keys(want).filter((p) => p in got && want[p] !== got[p] && !carriesOptions(p)).map((p) => `changed ${p}`),
].sort();

/** An SDK operation file that carries the options still says what it did: its doc comment, and where its declaration is. */
export const keepsItsFace = (root: string, path: string) => {
  const text = readFileSync(join(root, "generated", path), "utf8");
  const [, thing = "", verb = ""] = /^sdk\/src\/([^/]+)\/([^/]+)\.ts$/.exec(path) ?? [];
  return text.includes(`api/src/${thing}/${verb}.ts`) && /\/\*\* .+ \*\//.test(text) && /export const \w+/.test(text);
};

/** The names the generated SDK exports, read by importing it in Node: its own, and each thing's. */
export const exportsOf = (root: string) => {
  const script = `import * as S from ${JSON.stringify(join(root, "generated/sdk/src/index.ts"))};
const things = Object.fromEntries(Object.entries(S).filter(([, v]) => v && typeof v === "object" && !("_tag" in v)).map(([k, v]) => [k, Object.keys(v).sort()]));
console.log(JSON.stringify({ top: Object.keys(S).sort(), things }));`;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`the generated SDK did not import:\n${result.stderr}`);
  return JSON.parse(result.stdout.trim().split("\n").at(-1) ?? "{}") as ClientBaseline["exports"];
};

/** What `want` exports that `now` does not (`Errors.shown`, say, when it is dropped): the SDK's top level, then each thing's. */
export const missingExports = (want: ClientBaseline["exports"], now: ClientBaseline["exports"], extra: ReadonlyArray<string> = []): ReadonlyArray<string> => [
  ...[...want.top, ...extra].filter((name) => !now.top.includes(name)).map((name) => name),
  ...Object.entries(want.things).flatMap(([thing, names]) => names.filter((name) => !(now.things[thing] ?? []).includes(name)).map((name) => `${thing}.${name}`)),
];

// ---- instruments ----

export const freePort = () => new Promise<number>((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => { const { port } = server.address() as AddressInfo; server.close(() => resolve(port)); });
});

export type Fate = "forward" | "lose-the-answer" | "answer-500";
export interface Seen { readonly n: number; readonly method: string; readonly path: string; readonly key: string | undefined; readonly trace: string; readonly fate: Fate }
export interface Proxy { readonly url: string; readonly seen: Array<Seen>; readonly close: () => Promise<void> }

/**
 * A server on port 0 between a client and `target`. `fate(n, path)` says what happens to the n-th request (from 1):
 * `forward` passes it on and relays the answer; `lose-the-answer` passes it on, waits for the answer, and cuts the client's
 * connection without relaying it (the call landed, the caller never heard); `answer-500` answers a 500 without passing it
 * on. A request with no `traceparent` is given one, so what it did can be read back from the world's journal by trace.
 */
export const proxy = async (target: string, fate: (n: number, path: string) => Fate = () => "forward"): Promise<Proxy> => {
  const seen: Array<Seen> = [];
  const server: Server = createServer((request: IncomingMessage, response) => {
    const chunks: Array<Buffer> = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const n = seen.length + 1;
      const path = request.url ?? "/";
      const given = /^00-([0-9a-f]{32})-/.exec(String(request.headers["traceparent"] ?? ""))?.[1];
      const trace = given ?? randomBytes(16).toString("hex");
      const what = fate(n, path);
      const key = request.headers["idempotency-key"];
      seen.push({ n, method: request.method ?? "GET", path, key: Array.isArray(key) ? key[0] : key, trace, fate: what });
      if (what === "answer-500") { response.writeHead(500, { "content-type": "application/json", connection: "close" }); response.end('{"error":"planted"}'); return; }
      const headers = Object.fromEntries(Object.entries(request.headers).filter(([name]) => !["host", "connection", "content-length"].includes(name)).map(([name, value]) => [name, String(value)]));
      if (given === undefined) headers["traceparent"] = `00-${trace}-${randomBytes(8).toString("hex")}-01`;
      void fetch(`${target}${path}`, { method: request.method ?? "GET", headers, ...(chunks.length === 0 || request.method === "GET" ? {} : { body: new Uint8Array(Buffer.concat(chunks)) }) })
        .then(async (answer) => {
          const body = Buffer.from(await answer.arrayBuffer());
          if (what === "lose-the-answer") { request.socket.destroy(); return; }
          response.writeHead(answer.status, { "content-type": answer.headers.get("content-type") ?? "application/json", connection: "close" });
          response.end(body);
        })
        .catch(() => { request.socket.destroy(); });
    });
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    seen,
    close: () => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); }),
  };
};

export interface World {
  readonly url: string;
  readonly cast: (...names: ReadonlyArray<string>) => Promise<Record<string, { readonly person: string; readonly token: string; readonly email: string; readonly password: string }>>;
  /** The journal entries of one trace, from the world's facts door (as prove reads them). */
  readonly journal: (trace: string) => Promise<ReadonlyArray<Record<string, unknown> & { readonly event?: string; readonly subject?: string }>>;
  readonly record: (table: string, id: string) => Promise<Record<string, unknown> | null>;
}

/** acme's world on workerd with prove's local Collector as its OTLP endpoint (as check 13), for the life of the scope. */
export const startWorld = (root: string): Effect.Effect<World, unknown, Scope.Scope> =>
  Effect.gen(function* () {
    const dir = mkdtempSync(join(tmpdir(), "ortho-m1-clients-"));
    yield* Effect.addFinalizer(() => Effect.sync(() => rmSync(dir, { recursive: true, force: true })));
    const collector = yield* Collectors.local(dir, []);
    const port = yield* Effect.promise(freePort);
    const world = yield* Worlds.start({ root, port, name: "m1-clients", otlp: collector.url });
    const json = (path: string, init?: RequestInit) => fetch(`${world.url}${path}`, init).then((r) => r.json());
    return {
      url: world.url,
      cast: (...names) => json("/_world/cast", { method: "POST", body: JSON.stringify({ names }) }) as ReturnType<World["cast"]>,
      journal: (trace) => json(`/_world/facts/journal?trace=${trace}`) as ReturnType<World["journal"]>,
      record: (table, id) => json(`/_world/facts/record?table=${table}&id=${encodeURIComponent(id)}`) as ReturnType<World["record"]>,
    };
  });

/** A world that outlives one test: `open` once, `close` after the last. */
export const longWorld = (root: string) => {
  const scope = Effect.runSync(Scope.make());
  return {
    open: () => Effect.runPromise(startWorld(root).pipe(Scope.provide(scope))),
    close: () => Effect.runPromise(Scope.close(scope, Exit.void)),
  };
};

// ---- the generated SDK, run as a program of the project's own ----

export interface Ran { readonly status: number | null; readonly stdout: string; readonly stderr: string; readonly lines: ReadonlyArray<any> }
const prelude = `import { Cause, Effect, Exit, Option } from "effect";
import * as Sdk from "../../generated/sdk/src/index.ts";
const env = process.env as Record<string, string>;
const text = (v: unknown) => JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x));
const out = (v: unknown) => { process.stdout.write(text(v) + "\\n"); };
/** One call, settled: its answer, its typed failure (what is in the error channel), or its defect. */
const settle = async (program: Effect.Effect<any, any, any>) => {
  const exit = await Effect.runPromiseExit(program as Effect.Effect<any, any, never>);
  if (Exit.isSuccess(exit)) return { answered: JSON.parse(text(exit.value)) };
  const failed = Exit.findErrorOption(exit);
  if (Option.isSome(failed)) return { failed: JSON.parse(text({ ...(failed.value as object), _tag: (failed.value as { _tag?: string })._tag })) };
  return { died: Exit.hasDies(exit), cause: Cause.pretty(exit.cause).slice(0, 400) };
};
`;

/** Run a process without blocking this one: the proxy and the world's gates live here, and a synchronous child would starve them. */
const spawned = (command: string, args: ReadonlyArray<string>, options: { readonly cwd?: string; readonly env: Record<string, string>; readonly timeout: number }) =>
  new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(command, [...args], { cwd: options.cwd, env: { ...process.env, ...options.env }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    child.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    const timer = setTimeout(() => child.kill("SIGKILL"), options.timeout);
    child.on("close", (status) => { clearTimeout(timer); resolve({ status, stdout, stderr }); });
  });

/** Write `body` after a prelude (Effect, `Sdk`, `env`, `out`, `settle`) into the copy, run it in Node, and read one JSON value per stdout line. */
export const runSdk = async (root: string, name: string, body: string, env: Record<string, string>, timeout = 120_000): Promise<Ran> => {
  const file = join(root, ".ortho/clients", `${name}.ts`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${prelude}\n${body}\n`);
  const result = await spawned(process.execPath, [file], { cwd: root, env, timeout });
  const lines = result.stdout.split("\n").filter((l) => l.startsWith("{") || l.startsWith("[")).map((l) => JSON.parse(l) as unknown);
  return { ...result, lines };
};

/** `acme <thing> <verb> …`, the project's generated CLI, as a user runs it. */
export const runCli = async (root: string, env: Record<string, string>, ...args: ReadonlyArray<string>) => {
  const result = await spawned(process.execPath, [join(root, "generated/cli/src/main.ts"), ...args], { env, timeout: 120_000 });
  return { status: result.status, stdout: result.stdout.trim(), stderr: result.stderr.trim() };
};
