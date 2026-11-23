// What check 20 runs the loop with: Plugged In on workerd (no Docker) with prove's local Collector, a proxy that gives every
// request a trace, and one call at a time through the generated SDK or CLI as a program of the project's own. Every payload
// is made from the compiled model's own names (a field's `named`, `ref` and value type), never from a literal per operation.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Exit, Scope } from "effect";
import { Collectors, Worlds, type Span } from "@orthograph/prove";
import { freePort, proxy, runCli, runSdk, type Proxy } from "./clients.ts";
import { camel, envPrefix, type Field, type Op } from "./loop.ts";

export interface Loop {
  readonly url: string; readonly proxy: Proxy;
  readonly spans: (trace: string) => Promise<ReadonlyArray<Span>>;
  /** The world's fixed test people, signed in: a token each, by name (`/_world/cast`, as `ortho prove` casts a journey). */
  readonly cast: (names: ReadonlyArray<string>) => Promise<Record<string, string>>;
  readonly journal: (trace: string) => Promise<ReadonlyArray<Record<string, unknown> & { readonly event?: string }>>;
  readonly close: () => Promise<void>;
}

export const openLoop = async (root: string): Promise<Loop> => {
  const scope = Effect.runSync(Scope.make());
  const dir = mkdtempSync(join(tmpdir(), "ortho-m1-loop-"));
  const { collector, world } = await Effect.runPromise(Effect.gen(function* () {
    yield* Effect.addFinalizer(() => Effect.sync(() => rmSync(dir, { recursive: true, force: true })));
    const collector = yield* Collectors.local(dir, []);
    const world = yield* Worlds.start({ root, port: yield* Effect.promise(freePort), name: "m1-plugged-in-loop", otlp: collector.url });
    return { collector, world };
  }).pipe(
    // A start that fails has already opened the collector and the temp folder: close the scope on failure too, not only in `close`.
    Effect.onError(() => Scope.close(scope, Exit.void)),
    Scope.provide(scope),
  ));
  const px = await proxy(world.url);
  return {
    url: px.url, proxy: px,
    spans: (trace) => Effect.runPromise(collector.find(trace)).then((found) => found?.spans ?? []),
    cast: async (names) => {
      const people = await fetch(`${world.url}/_world/cast`, { method: "POST", body: JSON.stringify({ names, anonymous: [] }) }).then((r) => r.json()) as Record<string, { token?: string }>;
      return Object.fromEntries(names.map((n) => [n, people[n]?.token ?? ""]));
    },
    journal: (trace) => fetch(`${world.url}/_world/facts/journal?trace=${trace}`).then((r) => r.json()) as never,
    close: async () => { await px.close(); await Effect.runPromise(Scope.close(scope, Exit.void)); },
  };
};

const sleep = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });
/** Poll until `done` holds, or give up after `ms` and return what was last seen. */
export const until = async <A>(read: () => Promise<A>, done: (a: A) => boolean, ms = 20_000) => {
  const end = Date.now() + ms;
  let last = await read();
  while (!done(last) && Date.now() < end) { await sleep(80); last = await read(); }
  return last;
};
export const named = (spans: ReadonlyArray<Span>, name: string) => spans.find((span) => span.name === name);

// ---- payloads, made from the model ----

/** What a caller says: one handle, the links' text, and the ids the answers gave so far (by the `ref` the answer's field carries). */
export interface Context { readonly handle: string; readonly ids: Record<string, string>; readonly title: string; readonly url: string; readonly position: string; /** A signed-in caller's token (a test person's); none is a visitor. */ readonly token?: string }

const isNumber = (field: Field) => field.value.type === "uint";
/** The wire value of one payload field: by its named value or the thing field it refers to; an id is the one an earlier answer gave. */
export const valueFor = (op: Op, name: string, field: Field, ctx: Context): string => {
  if (field.named === "HandleName" || field.ref === "handle.name") return ctx.handle;
  if (field.named === "LinkTitle") return ctx.title;
  if (field.named === "LinkUrl") return ctx.url;
  if (field.named === "LinkPosition") return ctx.position;
  const id = field.ref?.endsWith(".id") ? ctx.ids[field.ref] : undefined;
  if (id !== undefined) return id;
  throw new Error(`check 20 cannot make a value for ${op.name}.${name} (${JSON.stringify(field)}) from the model: no earlier answer gave ${field.ref ?? "it"}`);
};
export const payloadOf = (op: Op, ctx: Context) => Object.fromEntries(Object.entries(op.payload).map(([name, field]) => [name, valueFor(op, name, field, ctx)]));
/** What an answer taught: each answer field the model gives a `ref` to an id. */
export const learn = (op: Op, answer: Record<string, unknown>, ids: Record<string, string>) => {
  for (const [name, field] of Object.entries(op.answer)) if (field.ref?.endsWith(".id") && typeof answer[name] === "string") ids[field.ref] = answer[name] as string;
};

// ---- one call, through the SDK or the CLI ----

export interface Result { readonly ok: boolean; readonly answer: Record<string, unknown>; readonly tag?: string; readonly code?: unknown; readonly exit?: number | null; readonly stderr?: string; readonly raw: string }

export const viaSdk = async (root: string, loop: Loop, op: Op, ctx: Context, label: string): Promise<Result> => {
  const payload = `{ ${Object.entries(op.payload).map(([name, field]) => `${JSON.stringify(name)}: ${isNumber(field) ? `${payloadOf(op, ctx)[name]}n` : JSON.stringify(payloadOf(op, ctx)[name])}`).join(", ")} }`;
  const body = `out(await settle(Sdk.${camel(op.thing)}.${op.identifier}(${payload} as never).pipe(Effect.provide(Sdk.layer(env.URL, env.TOKEN || undefined)))));`;
  const ran = await runSdk(root, `loop-${label}`, body, { URL: loop.url, TOKEN: ctx.token ?? "" });
  const line = ran.lines[0] as { answered?: Record<string, unknown>; failed?: Record<string, unknown>; died?: boolean } | undefined;
  return line?.answered !== undefined ? { ok: true, answer: line.answered, raw: ran.stdout }
    : { ok: false, answer: {}, ...(line?.failed ? { tag: String(line.failed["_tag"]), code: line.failed["code"] } : {}), exit: ran.status, stderr: ran.stderr, raw: ran.stdout };
};

export const viaCli = async (root: string, loop: Loop, op: Op, ctx: Context): Promise<Result> => {
  const flags = Object.entries(payloadOf(op, ctx)).flatMap(([name, value]) => [`--${name}`, value]);
  const env = { [`${envPrefix(root)}_URL`]: loop.url, ...(ctx.token ? { [`${envPrefix(root)}_TOKEN`]: ctx.token } : {}) };
  const ran = await runCli(root, env, op.thing, op.verb, ...flags, "--json");
  let answer: Record<string, unknown> | undefined;
  try { answer = JSON.parse(ran.stdout) as Record<string, unknown>; } catch { answer = undefined; }
  return ran.status === 0 && answer !== undefined ? { ok: true, answer, exit: 0, raw: ran.stdout } : { ok: false, answer: {}, exit: ran.status, stderr: ran.stderr, raw: ran.stdout };
};

/** The traces the proxy saw for one route, in the order they were called. */
export const tracesOf = (loop: Loop, route: string) => loop.proxy.seen.filter((s) => s.path === route).map((s) => s.trace);
