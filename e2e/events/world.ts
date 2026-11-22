// A world a check can kill and start again, and what a check says to its front door. Worlds.start (what m8's world.ts
// uses) wipes its state and stops with its scope; a check that kills a delivery mid-way needs a world whose folder
// outlives the process, so this one is `Worlds.launch`: detached, its own process group, its state folder kept, its
// pid in a file. The world's settings (the outbox's lease and first backoff, M5-checks call 7) go in the env file
// wrangler reads, as any binding does. Every pid here is one this file started, and `stop` ends the group by that pid.
import { randomBytes } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { Worlds } from "@orthograph/prove";

export interface Answer {
  readonly status: number;
  readonly body: Record<string, unknown>;
}

export const json = async (response: Response): Promise<Answer> => {
  const text = await response.text();
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(text) as Record<string, unknown>; } catch { body = { text }; }
  return { status: response.status, body };
};

export interface Live {
  readonly url: string;
  /** SIGKILL to the world's whole process group: wrangler and workerd go at once, mid-request, with no chance to clean up. */
  readonly kill: () => Promise<void>;
  /** Start the same world again on the same port, over the state the killed one left. */
  readonly restart: () => Promise<void>;
  /** Kill what is left, for the end of a test. */
  readonly stop: () => Promise<void>;
}

const alive = (pid: number) => {
  try { process.kill(pid, 0); return true; } catch { return false; }
};
const gone = async (pid: number) => {
  for (let i = 0; i < 200 && alive(pid); i++) await new Promise<void>((resolve) => { setTimeout(resolve, 50); });
};

/** The project at `root` (generated) as a launched world named `name`, with `settings` as bindings (`ORTHO_OUTBOX_LEASE`, ...). */
export const launchWorld = async (root: string, name: string, settings: Readonly<Record<string, string>> = {}): Promise<Live> => {
  const state = join(root, ".ortho", name);
  rmSync(state, { recursive: true, force: true });
  mkdirSync(state, { recursive: true });
  const envFile = join(state, "world.env");
  writeFileSync(envFile, Object.entries({ AUTH_SECRET: randomBytes(32).toString("hex"), ...settings }).map(([k, v]) => `${k}=${v}`).join("\n") + "\n", { mode: 0o600 });
  const port = await Effect.runPromise(Worlds.anyPort);
  const start = async () => {
    const launched = await Effect.runPromise(Worlds.launch({
      config: join(root, "generated/server/wrangler.jsonc"), state, port, log: join(state, "wrangler.log"), pidFile: join(state, "pid"), envFile, ready: "/_world/health",
    }));
    return launched.pid;
  };
  let pid = await start();
  const end = async (signal: NodeJS.Signals) => {
    try { process.kill(-pid, signal); } catch { /* already gone */ }
    await gone(pid);
  };
  return {
    url: `http://127.0.0.1:${port}`,
    kill: () => end("SIGKILL"),
    restart: async () => { pid = await start(); },
    stop: async () => {
      await end("SIGTERM");
      await end("SIGKILL");
    },
  };
};

/** `POST /<thing>/<verb>` with a JSON body, as the generated server routes every operation and read. */
export const call = (url: string, operation: string, payload: object, headers: Readonly<Record<string, string>> = {}) =>
  fetch(`${url}/${operation.replace(".", "/")}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(payload) }).then(json);

/** A trace id and a `traceparent` carrying it, so a check can read back exactly the journal its own request wrote. */
export const trace = () => {
  const id = randomBytes(16).toString("hex");
  return { id, header: `00-${id}-${randomBytes(8).toString("hex")}-01` };
};

/** `GET /_world/facts/record`: one row of a thing's table, or null. */
export const record = async (url: string, table: string, id: string) =>
  (await fetch(`${url}/_world/facts/record?table=${table}&id=${id}`).then((r) => r.json())) as Record<string, unknown> | null;

export interface JournalRow {
  readonly id: string;
  readonly operation: string;
  readonly event: string;
  readonly subject: string;
  readonly fields: Record<string, unknown>;
  readonly trace: string;
}
/** `GET /_world/facts/journal`: what the world's journals hold for one trace. */
export const journalOf = async (url: string, traceId: string) =>
  (await fetch(`${url}/_world/facts/journal?trace=${traceId}`).then((r) => r.json())) as ReadonlyArray<JournalRow>;

export interface Outbox {
  readonly pending: number;
  readonly claimed: number;
  readonly failed: ReadonlyArray<{ readonly event: string; readonly to: string; readonly attempts: number; readonly outcome: string }>;
  readonly refused: ReadonlyArray<{ readonly event: string; readonly to: string; readonly attempts: number; readonly outcome: string }>;
}
/** `GET /_world/outbox` (M5-checks call 5). */
export const outboxOf = async (url: string): Promise<Outbox> => {
  const response = await fetch(`${url}/_world/outbox`);
  if (response.status !== 200) throw new Error(`GET /_world/outbox answered ${response.status}: ${await response.text()}`);
  return (await response.json()) as Outbox;
};
/** `POST /_world/outbox/redeliver` with `{ event, to? }` (Q5.3). */
export const redeliver = (url: string, event: string, to?: string) =>
  fetch(`${url}/_world/outbox/redeliver`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(to ? { event, to } : { event }) }).then(json);

/** Poll `read` until `done` holds, or give up after `ms` and return what it last saw. */
export const until = async <A>(read: () => Promise<A>, done: (a: A) => boolean, ms = 60_000): Promise<A> => {
  const end = Date.now() + ms;
  let last = await read();
  while (!done(last) && Date.now() < end) {
    await new Promise<void>((resolve) => { setTimeout(resolve, 100); });
    last = await read();
  }
  return last;
};
/** The world's outbox, once nothing in it is pending or claimed. */
export const quiet = (url: string, ms = 60_000) => until(() => outboxOf(url), (o) => o.pending === 0 && o.claimed === 0, ms);
