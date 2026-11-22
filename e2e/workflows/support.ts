// What every workflows journey shares: the example's Worker built and run in workerd through Miniflare (the way the M3.03
// spike ran it), with its Durable Objects persisted so a restart is a real one, and the Worker's doors as typed calls.
import { build } from "esbuild";
import { convertV4MiniflareOptions, Miniflare } from "miniflare";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { repo } from "../layer1/support.ts";
import { CLASSES, WORLD_START, type Advanced, type ClockState, type Emitted, type Ledger, type Operation, type Peek, type RunState, type Started, type Waits } from "./contract.ts";

export { repo };

/** The Worker under test. `WORKFLOWS_WORKER` points the journeys at another one: how a check is proved fair (README.md). */
const WORKER = process.env["WORKFLOWS_WORKER"] ?? join(repo, "examples/workflows/src/worker.ts");

const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

/** Poll `read` (real time, never the world's) until `ok` holds; fail naming `what` and the last value read. */
export const until = async <A>(what: string, read: () => Promise<A>, ok: (a: A) => boolean, limit = 20_000): Promise<A> => {
  const started = Date.now();
  for (;;) {
    const value = await read();
    if (ok(value)) return value;
    if (Date.now() - started > limit) throw new Error(`timed out after ${limit} ms waiting for ${what}; the last answer was ${JSON.stringify(value)}`);
    await sleep(40);
  }
};

interface Built {
  readonly file: string;
  readonly dir: string;
}

let built: Promise<Built> | undefined;

/** Bundle the Worker once per test file, and refuse early, naming what is missing, when it does not export the classes. */
const bundle = (): Promise<Built> =>
  (built ??= (async () => {
    const dir = mkdtempSync(join(tmpdir(), "workflows-e2e-"));
    const file = join(dir, "worker.js");
    const result = await build({
      entryPoints: [WORKER],
      bundle: true,
      format: "esm",
      platform: "neutral",
      mainFields: ["module", "main"],
      conditions: ["workerd", "worker", "import"],
      external: ["node:*", "cloudflare:*"],
      outfile: file,
      metafile: true,
      logLevel: "silent",
    });
    const exported = Object.values(result.metafile.outputs).flatMap((o) => o.exports);
    const missing = Object.values(CLASSES).filter((name) => !exported.includes(name));
    if (missing.length > 0) {
      rmSync(dir, { recursive: true, force: true });
      throw new Error(`${WORKER} must export the Durable Object classes ${Object.values(CLASSES).join(", ")}; it does not export ${missing.join(", ")} (e2e/workflows/README.md, "The Worker's contract")`);
    }
    return { file, dir };
  })());

export interface Answer<A> {
  readonly status: number;
  readonly body: A;
}

export interface Harness {
  readonly get: <A>(path: string) => Promise<Answer<A>>;
  readonly post: <A>(path: string, body?: unknown) => Promise<Answer<A>>;
  /** Stop workerd and start a new one on the same storage: the strongest eviction there is locally. */
  readonly restart: () => Promise<void>;
  readonly stop: () => Promise<void>;
}

/** The Worker running, its objects persisted under a folder of its own; `stop` it (and remove the folder) when done. */
export const start = async (): Promise<Harness> => {
  const { file } = await bundle();
  const persist = mkdtempSync(join(tmpdir(), "workflows-e2e-state-"));
  const options = convertV4MiniflareOptions({
    resourcePersistencePath: resolve(persist),
    modules: true,
    script: readFileSync(file, "utf8"), // `scriptPath` does not start a module Worker under miniflare 5
    compatibilityDate: "2026-08-01",
    compatibilityFlags: ["nodejs_compat"],
    bindings: { WORLD_START, PROBES: "on" },
    durableObjects: Object.fromEntries(Object.entries(CLASSES).map(([binding, className]) => [binding, { className, useSQLite: true }])),
  } as Parameters<typeof convertV4MiniflareOptions>[0]);
  let mf = new Miniflare(options);
  await mf.ready;
  const send = async <A>(path: string, init: RequestInit): Promise<Answer<A>> => {
    const response = await mf.dispatchFetch(`http://workflows.local${path}`, init as never);
    const text = await response.text();
    let body: unknown = text;
    try { body = JSON.parse(text); } catch { /* not JSON: the text is the answer */ }
    return { status: response.status, body: body as A };
  };
  const harness: Harness = {
    get: (path) => send(path, {}),
    post: (path, body) => send(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) }),
    restart: async () => {
      await mf.dispose();
      mf = new Miniflare(options);
      await mf.ready;
    },
    stop: async () => {
      await mf.dispose();
      rmSync(persist, { recursive: true, force: true });
    },
  };
  running.push(harness);
  return harness;
};

const running: Array<Harness> = [];

/** Stop every Worker this file started (a file that never got one running has nothing to stop). */
export const stopAll = async () => {
  await Promise.all(running.splice(0).map((h) => h.stop()));
  const bundled = await built?.catch(() => undefined);
  if (bundled !== undefined) rmSync(bundled.dir, { recursive: true, force: true });
  built = undefined;
};

/**
 * Make `boot` once, on the first step that needs it, and hand every later step the same result (or the same failure).
 * A world that cannot start fails each step under its own name, not the whole file at once.
 */
export const lazily = <A>(boot: () => Promise<A>): (() => Promise<A>) => {
  let made: Promise<A> | undefined;
  return () => (made ??= boot());
};

const ok = <A>(answer: Answer<A>, what: string): A => {
  if (answer.status !== 200) throw new Error(`${what} answered ${answer.status}: ${JSON.stringify(answer.body)}`);
  return answer.body;
};

/** The Worker's doors, one call each (contract.ts). A door that does not answer 200 fails the journey at that call. */
export const doors = (h: Harness) => ({
  start: async (revision: string) => ok(await h.post<Started>("/workflows/publish/start", { revision }), `POST /workflows/publish/start (${revision})`),
  run: async (execution: string) => ok(await h.get<RunState>(`/runs/${encodeURIComponent(execution)}`), `GET /runs/${execution}`),
  emit: async (event: string, fields: Record<string, unknown>, key: string) =>
    ok(await h.post<Emitted>("/events/emit", { event, fields, key }), `POST /events/emit (${event}, ${key})`),
  clock: async () => ok(await h.get<ClockState>("/_world/clock"), "GET /_world/clock"),
  advance: async (span: string) => ok(await h.post<Advanced>("/_world/clock/advance", { span }), `POST /_world/clock/advance (${span})`),
  ledger: async (revision: string) => ok(await h.get<Ledger>(`/_probe/ledger?revision=${encodeURIComponent(revision)}`), `GET /_probe/ledger (${revision})`),
  peek: async (execution: string) => ok(await h.get<Peek>(`/_probe/peek?execution=${encodeURIComponent(execution)}`), `GET /_probe/peek (${execution})`),
  waits: async () => ok(await h.get<Waits>("/_probe/waits"), "GET /_probe/waits"),
  evict: async (execution: string) => ok(await h.post<{ evicted: boolean }>("/_probe/evict", { execution }), `POST /_probe/evict (${execution})`),
  resume: async (execution: string) => ok(await h.post<unknown>("/_probe/resume", { execution }), `POST /_probe/resume (${execution})`),
  hold: async (operation: Operation) => ok(await h.post<unknown>("/_probe/hold", { operation }), `POST /_probe/hold (${operation})`),
  release: async (operation: Operation) => ok(await h.post<unknown>("/_probe/release", { operation }), `POST /_probe/release (${operation})`),
  slow: async (operation: Operation, ms: number) => ok(await h.post<unknown>("/_probe/slow", { operation, ms }), `POST /_probe/slow (${operation})`),
  crash: async (operation: Operation) => ok(await h.post<unknown>("/_probe/crash", { operation }), `POST /_probe/crash (${operation})`),
});

export type Doors = ReturnType<typeof doors>;

/** The pending timers of one run, by name: what `Timers.set(at, owner, name, ...)` left in the world's table (#467). */
export const timersOf = (clock: ClockState, execution: string) =>
  clock.timers.filter((t) => t.owner === execution).map((t) => ({ name: t.name, due: t.due }));

/**
 * The `call` activities a run has finished and stored, by declaration key, sorted. The probe may list other stored work
 * (registering a wait, setting a timer) under keys of its own; those are the engine's business, not the journey's.
 */
export const finished = (peek: { readonly activities: ReadonlyArray<string> }) =>
  peek.activities.filter((a) => ["freeze", "propose", "link", "withdraw"].includes(a)).sort();

/** The run is parked on its `seen` wait: `freeze` and `propose` are stored and its wait is registered. */
export const parkedOnSeen = async (d: Doors, execution: string, revision: string) => {
  await until(
    `${revision} parked on seen`,
    async () => ({ peek: await d.peek(execution), waits: (await d.waits()).rows.filter((r) => r.execution === execution) }),
    (s) => finished(s.peek).join() === "freeze,propose" && s.waits.length === 1,
  );
};
