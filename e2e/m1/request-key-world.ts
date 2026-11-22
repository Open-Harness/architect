// Check 38's world (M1.12a): acme running in a local world, its Collector's files, and a caller that can send an `idempotency-key`. The
// same wiring as check 24's, cut down to what the key's span needs: the spans of one call, found by the trace id the caller gave it.
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Scope } from "effect";
import { Collectors, Worlds, type Span } from "@orthograph/prove";
import { freePort } from "./clients.ts";

export interface Called { readonly trace: string; readonly status: number; readonly body: Record<string, unknown>; readonly text: string }
export interface Seen {
  readonly cast: (...names: ReadonlyArray<string>) => Promise<Record<string, { readonly person: string; readonly token: string }>>;
  readonly call: (route: string, token: string | undefined, body: object, key?: string) => Promise<Called>;
  /** The spans of a call, once the Collector has them: it waits until one carries `operation` (the handler's own), then a moment more for the rest. */
  readonly spans: (trace: string) => Promise<ReadonlyArray<Span>>;
}

const sleep = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

/** Start acme's world in `root` into `scope`; its collector's directory goes with the scope. */
export const startWorld = (root: string, name: string, scope: Scope.Scope): Promise<Seen> => Effect.runPromise(Effect.gen(function* () {
  const dir = mkdtempSync(join(tmpdir(), `ortho-m1-${name}-`));
  yield* Effect.addFinalizer(() => Effect.sync(() => rmSync(dir, { recursive: true, force: true })));
  const collector = yield* Collectors.local(dir, []);
  const world = yield* Worlds.start({ root, port: yield* Effect.promise(freePort), name, otlp: collector.url });
  const json = (path: string, init?: RequestInit) => fetch(`${world.url}${path}`, init).then((r) => r.json() as Promise<any>);
  const read = async (trace: string): Promise<ReadonlyArray<Span>> => (await Effect.runPromise(collector.find(trace)))?.spans ?? [];
  const spans = async (trace: string): Promise<ReadonlyArray<Span>> => {
    const end = Date.now() + 20_000;
    while (Date.now() < end) {
      if ((await read(trace)).some((s) => typeof s.attrs["operation"] === "string")) { await sleep(300); break; }
      await sleep(60);
    }
    return read(trace);
  };
  return {
    cast: (...names) => json("/_world/cast", { method: "POST", body: JSON.stringify({ names }) }),
    call: async (route, token, body, key) => {
      const trace = randomBytes(16).toString("hex");
      const response = await fetch(`${world.url}/${route}`, {
        method: "POST",
        headers: { "content-type": "application/json", traceparent: `00-${trace}-${randomBytes(8).toString("hex")}-01`, ...(token ? { authorization: `Bearer ${token}` } : {}), ...(key ? { "idempotency-key": key } : {}) },
        body: JSON.stringify(body),
      });
      const text = await response.text();
      return { trace, status: response.status, text, body: (() => { try { return JSON.parse(text) as Record<string, unknown>; } catch { return {}; } })() };
    },
    spans,
  } satisfies Seen;
}).pipe(Scope.provide(scope)));
