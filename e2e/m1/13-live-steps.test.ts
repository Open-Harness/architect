// Check 13 (M1.21): live steps (K5 seam 10). A handler with two slow steps runs in a real workerd world; while it is still
// held in a step, the step's start is already in the Collector's files and the portal's live view shows the step running;
// when the call is done, a committed event shows with its commit, and a refused call shows no event and no commit.
//
// The slow handler is `beacon.light` (fixture `e2e/fixtures/m1/live-steps`, overlaid on acme as app declarations): its `load`
// step and its `record` step each wait for an HTTP service of this file to answer (the "gates"), so the call is held exactly
// where the check says and no clock is involved. Nothing is Docker: the Collector is `Collectors.local`, prove's own
// loopback OTLP/HTTP receiver in this process (the file format and `FileSource` of the real Collector, port from the OS);
// the world is wrangler on workerd, as in check 04. When M1.33 puts the Collector binary in its place this file needs no change.
//
// Assumptions beyond K5 seam 10 and O2 gap 1, where the design is silent:
//  1. A step signal is an OTLP log record exported to `<OTLP>/v1/logs` as each step starts and as it ends. Its `traceId` is the
//     call's, its `spanId` is the id of the step's own span (the span `beacon.light.load` exports when the step ends), so the
//     portal joins a start to its end, and both to the span, by span id (K5 decision 6). Its attributes: `step`, the span's name
//     (`<operation>.<step>`); `phase`, `start` or `end`; and on `end` an `outcome`, `ok` for a step that finished. The record's
//     body is not judged. One start and one end per step per attempt. The commit is a span (M1.18), not a signal here: whether
//     it also signals is not judged.
//  2. "Under `waitUntil`, not at dispose" is judged by what it is for: a signal is in the Collector's file while the request is
//     still held, within 5 s of the step starting. The export interval today is 100 ms; the check allows the Collector's flush.
//  3. The portal's live view is `Live.call(read, trace)` in `@orthograph/portal` (there is no live view in the package today;
//     the screens are M1.13 and M1.25's, and this is the data under them, the same pure shape for the plain JSON route). `read`
//     is `{ source, journal }`: `source` has `find(trace)` as a `TraceSource` does (the Collector's files in a local world,
//     Axiom later), and `journal(trace)` is the world's journal read by trace (`/_world/facts/journal?trace=`, as `prove` reads
//     it); the portal never reaches a database. It answers an Effect of
//     `{ trace, steps: [{ name, state: "running" | "ended", outcome? }], commit?: { outcome, writes, entries }, events: [{ event,
//     subject, commit: { outcome: "committed" } }] }`: steps in start order by the span's name, `commit` only once the commit span
//     has ended, and an event only when the journal holds it and the commit that wrote it was `committed`. A commit step is not
//     counted among `steps` here (the check ignores any step named `.commit`).
//  4. A refused call (`beacon.light` with mode `refuse`, after its `load`) has its `load` step ended `ok`, no `record`, no commit
//     span (the refusal comes before the commit, `handler/service.ts`), no event.
//  5. The signals of a call that the world answered with the gates open (the control) exist too; the control judges only what is
//     true today: the call answers, its event is in the journal, and its spans and commit span are in the file.
//
// Red today on the missing surface: no step signal exists, and `Live` is not exported by `@orthograph/portal`.
import { randomBytes } from "node:crypto";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import * as portal from "@orthograph/portal";
import { Collectors, Worlds, type Trace } from "@orthograph/prove";
import { afterEach, describe, expect, it } from "vitest";
import { copyOf, acme, fixtures, nothingRunning, succeeds } from "./support.ts";

const copies: Array<ReturnType<typeof copyOf>> = [];
const stops: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const stop of stops.splice(0)) await stop();
  for (const copy of copies.splice(0)) copy.remove();
});

const sleep = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });
/** Poll `read` until `done` holds, or give up after `ms` and return what it last saw. */
const until = async <A>(read: () => Promise<A>, done: (a: A) => boolean, ms = 5_000) => {
  const end = Date.now() + ms;
  let last = await read();
  while (!done(last) && Date.now() < end) { await sleep(40); last = await read(); }
  return last;
};

// ---- the instruments: gates the handler waits at, and a free port for the world ----

const freePort = () => new Promise<number>((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => { const { port } = server.address() as AddressInfo; server.close(() => resolve(port)); });
});

/** An HTTP service whose `/gate/<name>` is held until `open(name)` when `name` is closed, and answered at once otherwise. */
const gates = async () => {
  const closed = new Set<string>();
  const held = new Map<string, Array<ServerResponse>>();
  const server = createServer((request, response) => {
    const name = (request.url ?? "").replace("/gate/", "");
    if (!closed.has(name)) { response.end("open"); return; }
    held.set(name, [...(held.get(name) ?? []), response]);
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const open = (name: string) => { closed.delete(name); for (const response of held.get(name) ?? []) response.end("open"); held.delete(name); };
  stops.push(() => new Promise<void>((resolve) => { for (const name of Array.from(held.keys())) open(name); server.closeAllConnections(); server.close(() => resolve()); }));
  return {
    origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    close: (...names: ReadonlyArray<string>) => { for (const name of names) closed.add(name); },
    open,
    /** Resolves once a request is waiting at the gate: the handler is in that step. */
    held: (name: string) => until(() => Promise.resolve((held.get(name) ?? []).length), (n) => n > 0, 60_000),
  };
};

/** acme with the beacon fixture laid over it, generated. */
const beaconProject = () => {
  const copy = copyOf(acme);
  copies.push(copy);
  cpSync(join(fixtures, "live-steps"), copy.root, { recursive: true });
  succeeds(copy.root, "generate");
  return copy.root;
};

interface Live {
  readonly url: string;
  readonly trace: TraceSourceLike;
  /** The journal of one trace, from the world's facts door. */
  readonly journal: (trace: string) => Promise<ReadonlyArray<{ readonly event: string; readonly subject: string }>>;
  /** `POST /beacon/light`, with a trace id this check chose. Not awaited: `settled` says when it has answered. */
  readonly call: (origin: string, mode: "ok" | "refuse") => { readonly trace: string; readonly settled: () => boolean; readonly response: Promise<Response> };
}
type TraceSourceLike = { readonly find: (trace: string) => Effect.Effect<Trace | undefined> };

/** The world, with prove's local Collector as its OTLP endpoint, for the length of `use`. */
const inWorld = <A>(root: string, use: (world: Live) => Promise<A>) =>
  Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const dir = mkdtempSync(join(tmpdir(), "ortho-m1-live-"));
    yield* Effect.addFinalizer(() => Effect.sync(() => rmSync(dir, { recursive: true, force: true })));
    const collector = yield* Collectors.local(dir, []);
    const world = yield* Worlds.start({ root, port: yield* Effect.promise(freePort), name: "m1-live", otlp: collector.url });
    const journal = async (trace: string) => (await (await fetch(`${world.url}/_world/facts/journal?trace=${trace}`)).json()) as Array<{ event: string; subject: string }>;
    const call = (origin: string, mode: "ok" | "refuse") => {
      const trace = randomBytes(16).toString("hex");
      let done = false;
      const response = fetch(`${world.url}/beacon/light`, {
        method: "POST",
        headers: { "content-type": "application/json", traceparent: `00-${trace}-${randomBytes(8).toString("hex")}-01` },
        body: JSON.stringify({ origin, mode }),
      }).then((r) => { done = true; return r; });
      void response.catch(() => undefined);
      return { trace, settled: () => done, response };
    };
    return yield* Effect.promise(() => use({ url: world.url, trace: collector, journal, call }));
  })));

// ---- what the Collector's files hold ----

const read = (source: TraceSourceLike, trace: string) => Effect.runPromise(source.find(trace)).then((found) => found ?? { spans: [], logs: [] });
/** The step signals of a trace (assumption 1): `[step, phase, outcome, spanId]`, in the order they arrived. */
const signals = (found: Trace) => found.logs
  .filter((log) => typeof log.attrs["step"] === "string" && typeof log.attrs["phase"] === "string")
  .map((log) => ({ step: String(log.attrs["step"]), phase: String(log.attrs["phase"]), outcome: log.attrs["outcome"] === undefined ? undefined : String(log.attrs["outcome"]), spanId: log.spanId }));
const signalsOf = async (source: TraceSourceLike, trace: string) => signals(await read(source, trace));
const seen = (all: ReturnType<typeof signals>, step: string, phase: string) => all.filter((signal) => signal.step === step && signal.phase === phase);

const LOAD = "beacon.light.load";
const RECORD = "beacon.light.record";

describe("13 control: the instrument", () => {
  it("a beacon call with the gates open answers, writes its event to the journal, and leaves its spans and commit span in the file", async () => {
    const root = beaconProject();
    const gate = await gates();
    await inWorld(root, async (world) => {
      const call = world.call(gate.origin, "ok");
      const response = await call.response;
      expect(response.status, await response.clone().text()).toBe(200);
      const journal = await until(() => world.journal(call.trace), (rows) => rows.length > 0);
      expect(journal.map((row) => row.event)).toEqual(["BeaconLit"]);
      const trace = await until(() => read(world.trace, call.trace), (t) => t.spans.some((span) => span.name === "beacon.light.commit"));
      expect(trace.spans.map((span) => span.name)).toEqual(expect.arrayContaining(["beacon.light", "beacon.light.commit", LOAD, RECORD]));
      const commit = trace.spans.find((span) => span.name === "beacon.light.commit");
      expect(commit?.attrs).toMatchObject({ "commit.outcome": "committed", "commit.entries": 1 });
    });
    nothingRunning(root);
  });
});

describe("13 control: a refused call", () => {
  it("answers as a refusal after its load step, with no event in the journal and no commit span in the file", async () => {
    const root = beaconProject();
    const gate = await gates();
    await inWorld(root, async (world) => {
      const call = world.call(gate.origin, "refuse");
      const response = await call.response;
      expect([response.status >= 400 && response.status < 500, (await response.json() as { _tag?: string })._tag], "BeaconDark is a refusal, not a defect").toEqual([true, "BeaconDark"]);
      const trace = await until(() => read(world.trace, call.trace), (t) => t.spans.some((span) => span.name === "beacon.light"));
      const names = trace.spans.map((span) => span.name);
      expect(names).toEqual(expect.arrayContaining(["beacon.light", LOAD]));
      expect(names).not.toContain("beacon.light.commit");
      expect(names).not.toContain(RECORD);
      expect(await world.journal(call.trace)).toEqual([]);
    });
    nothingRunning(root);
  });
});

describe("13 control: the gates hold the handler where the check says", () => {
  it("a call is held in load, then in record, and answers only once both gates are opened", async () => {
    const root = beaconProject();
    const gate = await gates();
    gate.close("load", "record");
    await inWorld(root, async (world) => {
      const call = world.call(gate.origin, "ok");
      expect(await gate.held("load"), "the handler is waiting in load").toBe(1);
      await sleep(300);
      expect(call.settled()).toBe(false);
      gate.open("load");
      expect(await gate.held("record"), "then in record").toBe(1);
      await sleep(300);
      expect(call.settled()).toBe(false);
      gate.open("record");
      expect((await call.response).status).toBe(200);
    });
    nothingRunning(root);
  });
});

describe("13 M1.21: the step signals", () => {
  it("each step's start and end are in the Collector's file while the call is still held, joined to its span by span id", async () => {
    const root = beaconProject();
    const gate = await gates();
    gate.close("load", "record");
    await inWorld(root, async (world) => {
      const call = world.call(gate.origin, "ok");
      await gate.held("load");
      const started = await until(() => signalsOf(world.trace, call.trace), (all) => seen(all, LOAD, "start").length > 0);
      expect(seen(started, LOAD, "start"), "the load step started, so its signal is in the file while the call is held in it").toHaveLength(1);
      expect(seen(started, LOAD, "end"), "the load step has not ended").toEqual([]);
      expect(seen(started, RECORD, "start"), "the record step has not started").toEqual([]);
      expect(call.settled(), "the response has not been sent").toBe(false);

      gate.open("load");
      await gate.held("record");
      const moved = await until(() => signalsOf(world.trace, call.trace), (all) => seen(all, LOAD, "end").length > 0 && seen(all, RECORD, "start").length > 0);
      expect(seen(moved, LOAD, "end").map((s) => s.outcome), "load ended ok, and the call is still held in record").toEqual(["ok"]);
      expect(seen(moved, RECORD, "start")).toHaveLength(1);
      expect(seen(moved, RECORD, "end")).toEqual([]);
      expect(call.settled(), "the response has still not been sent").toBe(false);

      gate.open("record");
      expect((await call.response).status).toBe(200);
      const done = await until(() => read(world.trace, call.trace), (t) => t.spans.some((span) => span.name === RECORD) && signals(t).some((s) => s.step === RECORD && s.phase === "end"));
      const all = signals(done);
      for (const step of [LOAD, RECORD]) {
        const start = seen(all, step, "start");
        const end = seen(all, step, "end");
        const span = done.spans.find((s) => s.name === step);
        expect([start.length, end.length], `${step}: one start and one end`).toEqual([1, 1]);
        expect(span, `${step} is a span too`).toBeDefined();
        expect([start[0]?.spanId, end[0]?.spanId], `${step}: both signals carry the span's own id`).toEqual([span?.spanId, span?.spanId]);
        expect(end[0]?.outcome).toBe("ok");
      }
    });
    nothingRunning(root);
  });
});

describe("13 M1.21: the portal's live view", () => {
  it("shows the load step running before the response, then ended with record running, then the committed event with its commit", async () => {
    const live = (portal as unknown as { Live?: { call: (read: unknown, trace: string) => Effect.Effect<LiveCall> } }).Live;
    expect(live?.call, "@orthograph/portal exports `Live.call` (M1.21, assumption 3)").toBeTypeOf("function");
    const root = beaconProject();
    const gate = await gates();
    gate.close("load", "record");
    await inWorld(root, async (world) => {
      const view = (trace: string) => Effect.runPromise(live!.call({ source: world.trace, journal: (t: string) => Effect.promise(() => world.journal(t)) }, trace));
      const call = world.call(gate.origin, "ok");
      await gate.held("load");
      const loading = await until(() => view(call.trace), (v) => stepsOf(v).some((s) => s.name === LOAD));
      expect(stepsOf(loading), "the slow handler's load step shows, running, before the response").toEqual([{ name: LOAD, state: "running" }]);
      expect(call.settled()).toBe(false);
      expect([loading.commit, loading.events], "nothing is committed yet").toEqual([undefined, []]);

      gate.open("load");
      await gate.held("record");
      const recording = await until(() => view(call.trace), (v) => stepsOf(v).some((s) => s.name === RECORD));
      expect(stepsOf(recording)).toEqual([{ name: LOAD, state: "ended", outcome: "ok" }, { name: RECORD, state: "running" }]);
      expect(call.settled()).toBe(false);

      gate.open("record");
      expect((await call.response).status).toBe(200);
      const done = await until(() => view(call.trace), (v) => v.events.length > 0 && v.commit !== undefined);
      expect(stepsOf(done)).toEqual([{ name: LOAD, state: "ended", outcome: "ok" }, { name: RECORD, state: "ended", outcome: "ok" }]);
      expect(done.commit, "the commit shows").toMatchObject({ outcome: "committed", entries: 1 });
      expect(done.events.map((e) => [e.event, e.commit.outcome]), "the committed event shows with its commit").toEqual([["BeaconLit", "committed"]]);
    });
    nothingRunning(root);
  });

  it("shows a refused call's load step and nothing else: no event, no commit", async () => {
    const live = (portal as unknown as { Live?: { call: (read: unknown, trace: string) => Effect.Effect<LiveCall> } }).Live;
    expect(live?.call, "@orthograph/portal exports `Live.call` (M1.21, assumption 3)").toBeTypeOf("function");
    const root = beaconProject();
    const gate = await gates();
    await inWorld(root, async (world) => {
      const call = world.call(gate.origin, "refuse");
      expect((await call.response).status).not.toBe(200);
      const done = await until(() => Effect.runPromise(live!.call({ source: world.trace, journal: (t: string) => Effect.promise(() => world.journal(t)) }, call.trace)), (v) => stepsOf(v).some((s) => s.name === LOAD && s.state === "ended"));
      expect(stepsOf(done)).toEqual([{ name: LOAD, state: "ended", outcome: "ok" }]);
      expect([done.commit, done.events], "a refusal commits nothing and writes no event").toEqual([undefined, []]);
      expect(await world.journal(call.trace), "and the journal agrees").toEqual([]);
    });
    nothingRunning(root);
  });
});

interface LiveCall {
  readonly trace: string;
  readonly steps: ReadonlyArray<{ readonly name: string; readonly state: "running" | "ended"; readonly outcome?: string }>;
  readonly commit?: { readonly outcome: string; readonly writes: number; readonly entries: number } | undefined;
  readonly events: ReadonlyArray<{ readonly event: string; readonly subject: string; readonly commit: { readonly outcome: string } }>;
}
/** The steps of a live view, the commit (a step of kind commit) left out (assumption 3). */
const stepsOf = (view: LiveCall) => view.steps.filter((step) => !step.name.endsWith(".commit")).map(({ name, state, outcome }) => (outcome === undefined ? { name, state } : { name, state, outcome }));
