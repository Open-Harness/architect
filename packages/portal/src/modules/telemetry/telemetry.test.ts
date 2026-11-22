// M1.13's data clauses (check 21 C, D, E, J, K, L), judged at the server, over Plugged In's own wire and a staged window.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createServer } from "node:http";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { PortalServer } from "#modules/server/service.js";
import { Wire } from "#modules/wire/service.js";
import type { BlueprintWire } from "#modules/wire/types.js";
import { Telemetry } from "./service.ts";
import type { MetricPoint, PortalLive, PortalTelemetry, WindowSpan, WindowTrace } from "./types.ts";

const NOW = 1_800_000_000_000;
const WINDOW = 30 * 60_000;
const at = (m: number) => NOW - m * 60_000;
const PLANTED = ["SELECT-7f31 name FROM handles", "per_PERSON-7f31", "PAYLOAD-7f31", "LOG-7f31"];

const wire = (): Promise<BlueprintWire> => {
  const file = join(resolve(import.meta.dirname, "../../../../.."), "examples/plugged-in/generated/portal/blueprint.json");
  return Effect.runPromise(Wire.decode(JSON.parse(readFileSync(file, "utf8"))));
};
const span = (id: string, trace: string, name: string, start: number, attrs: Record<string, unknown>, over: Partial<WindowSpan> = {}): WindowSpan =>
  ({ spanId: id, parentSpanId: "", name, attrs, status: 1, ms: 9, start, ...over });

const traces = (): Map<string, WindowTrace> => new Map([
  ["a", {
    spans: [
      span("j", "a", "journey.claim a name", at(5), { journey: "claim a name", operation: "handle.claim" }),
      span("a1", "a", "handle.claim", at(5) + 1, { operation: "handle.claim", attempt: 1, "principal.person": PLANTED[1], "request.key": "key-a" }, { parentSpanId: "j" }),
      span("c1", "a", "handle.claim.commit", at(5) + 2, { "step.kind": "commit", "commit.outcome": "conflict" }, { parentSpanId: "a1", ms: 3 }),
      span("a2", "a", "handle.claim", at(5) + 3, { operation: "handle.claim", attempt: 2, "principal.person": PLANTED[1], "request.key": "key-a", "payload.token": PLANTED[2], "move.name": "claim" }, { parentSpanId: "j" }),
      span("l2", "a", "handle.claim.lookup", at(5) + 4, { "step.kind": "database", "db.statement": PLANTED[0] }, { parentSpanId: "a2", ms: 2 }),
    ],
    logs: [{ spanId: "a2", body: PLANTED[3], attrs: { note: PLANTED[3] } } as never],
  }],
  ["b", { spans: [span("b1", "b", "handle.claim", at(4), { operation: "handle.claim", attempt: 1, "principal.kind": "agent", refusal: "HandleTaken" })], logs: [] }],
  ["d", { spans: [span("d1", "d", "link.add", at(2), { operation: "link.add", attempt: 1, "principal.kind": "anonymous" }, { status: 2, ms: 300 })], logs: [] }],
]);
const point = (operation: string, outcome: string, value: number, refusal?: string): MetricPoint =>
  ({ name: "ortho.calls", labels: { operation, outcome, ...(refusal === undefined ? {} : { refusal }) }, value });
const points = [point("handle.claim", "answered", 1), point("handle.claim", "refused", 1, "HandleTaken"), point("handle.claim", "refused", 3, "NotAllowed"), point("link.add", "defect", 1), point("link.add", "answered", 1)];

const live = (over: Partial<PortalLive> = {}): PortalLive => ({
  environment: "staging", now: NOW, windowMs: WINDOW,
  source: { window: () => Effect.succeed(traces()), find: (id) => Effect.succeed(traces().get(id)) },
  metrics: { window: () => Effect.succeed(points) },
  ...over,
});
const read = async (over: Partial<PortalLive> = {}): Promise<PortalTelemetry> => Effect.runPromise(Telemetry.read(await wire(), live(over)));
const ok = <T>(a: { state: string; value?: T }): T => { expect(a.state).toBe("available"); return (a as { value: T }).value; };

describe("calls: one row per call, newest first", () => {
  it("a retry is one row of two attempts, its duration the extent of its attempts, and the caller's kind is derived", async () => {
    const { rows, moves, journeys } = ok((await read()).calls);
    expect(rows.map((r) => [r.trace, r.operation, r.outcome, r.caller, r.attempts, r.durationMs])).toEqual([
      ["d", "link.add", "defect", "anyone", 1, 300],
      ["b", "handle.claim", "refused", "agent", 1, 9],
      ["a", "handle.claim", "answered", "person", 2, 11],
    ]);
    expect(rows[1]).toMatchObject({ refusal: "HandleTaken", start: at(4), environment: "staging", requestKey: null, roleHeld: null });
    expect(rows.map((r) => r.requestKey), "the key a call was made with, once for its two attempts; none where none was sent").toEqual([null, null, "key-a"]);
    expect(moves).toEqual({ "handle.claim": 1 });
    expect(journeys).toEqual({ "handle.claim": ["claim a name"] });
  });

  it("over budget is derived from the model's budget", async () => {
    const { rows } = ok((await read()).calls);
    expect(rows.map((r) => [r.operation, r.overBudget])).toEqual([["link.add", true], ["handle.claim", false], ["handle.claim", false]]);
  });
});

describe("the spans the real handler writes", () => {
  it("a read has one span and no attempt: it is a call of one attempt; a door refusal's `.refused` span is never a call", async () => {
    const extra = new Map<string, WindowTrace>([
      ["r", { spans: [span("r1", "r", "handle.resolve", at(1), { operation: "handle.resolve", "principal.kind": "anonymous" })], logs: [] }],
      ["v", { spans: [span("v1", "v", "link.add", at(1), { operation: "link.add", "principal.kind": "anonymous" })], logs: [] }],
      ["x", { spans: [span("x1", "x", "handle.claim.refused", at(1), { operation: "handle.claim", attempt: 1, "principal.kind": "anonymous", refusal: "NotAllowed" })], logs: [] }],
    ]);
    const t = await read({ source: { window: () => Effect.succeed(new Map([...traces(), ...extra])), find: () => Effect.succeed(undefined) } });
    const rows = ok(t.calls).rows;
    expect(rows.map((r) => r.trace)).toContain("r");
    expect(rows.find((r) => r.trace === "r")).toMatchObject({ operation: "handle.resolve", attempts: 1, outcome: "answered" });
    expect(rows.find((r) => r.trace === "v"), "a device operation's span is the same").toMatchObject({ operation: "link.add", attempts: 1 });
    expect(rows.map((r) => r.trace), "a door refusal is a count and never a row").not.toContain("x");
    expect(ok(t.metrics).refusals["NotAllowed"]!.door, "and no span accounts for it").toBe(3);
  });
});

describe("calls are the operation's own spans, not the trace", () => {
  const link = (id: string, trace: string, start: number, attrs: Record<string, unknown> = {}, over: Partial<WindowSpan> = {}) =>
    span(id, trace, "link.add", start, { operation: "link.add", attempt: 1, "principal.kind": "anonymous", ...attrs }, over);
  const only = (map: Map<string, WindowTrace>, over: Partial<PortalLive> = {}) => read({ source: { window: () => Effect.succeed(map), find: () => Effect.succeed(undefined) }, ...over });

  const commit = (id: string, trace: string, parent: string, start: number, outcome: string) =>
    span(id, trace, "link.add.commit", start, { "step.kind": "commit", "commit.outcome": outcome }, { parentSpanId: parent });

  it("three calls to one operation under one distributed trace are three calls, and a retry inside one is still one: the runtime names each call", async () => {
    const trace = new Map<string, WindowTrace>([["T", { spans: [
      link("c1", "T", at(9), { "call.id": "call_1" }), link("c2", "T", at(8), { "call.id": "call_2" }),
      link("c3a", "T", at(7), { "call.id": "call_3" }), link("c3b", "T", at(6), { "call.id": "call_3", attempt: 2 }),
    ], logs: [] }]]);
    const { rows } = ok((await only(trace)).calls);
    expect(rows.map((r) => [r.start, r.attempts]).sort()).toEqual([[at(9), 1], [at(8), 1], [at(7), 2]].sort());
  });

  /** A1 loses its commit at t0, B1 wins at t2, A2 (A's retry) runs at t20: the loser started first, so A2's trace position says nothing of whose it is. */
  const interleaved = (named: boolean) => {
    const id = (call: string) => (named ? { "call.id": call } : {});
    return new Map<string, WindowTrace>([["I", { spans: [
      link("a1", "I", at(9), { ...id("A"), "move.name": "add" }), commit("ka1", "I", "a1", at(9) + 1, "conflict"),
      link("b1", "I", at(8), { ...id("B"), "move.name": "add" }), commit("kb1", "I", "b1", at(8) + 1, "committed"),
      link("a2", "I", at(5), { ...id("A"), attempt: 2, "move.name": "add" }), commit("ka2", "I", "a2", at(5) + 1, "committed"),
    ], logs: [] }]]);
  };

  it.each([[true], [false]])("an interleaved retry is its own call's, never the one that was running beside it (call.id: %s)", async (named) => {
    const { rows, moves } = ok((await only(interleaved(named))).calls);
    expect(rows.map((r) => [r.start, r.attempts, r.outcome])).toEqual([[at(8), 1, "answered"], [at(9), 2, "answered"]]);
    expect(moves, "both calls committed a move").toEqual({ "link.add": 2 });
  });

  it("attempts that two calls could each be say `unknown`, not an invented defect, and count no move", async () => {
    const both = new Map<string, WindowTrace>([["U", { spans: [
      link("a1", "U", at(9), { "move.name": "add" }), commit("ka1", "U", "a1", at(9) + 1, "conflict"),
      link("b1", "U", at(8), { "move.name": "add" }), commit("kb1", "U", "b1", at(8) + 1, "conflict"),
      link("a2", "U", at(5), { attempt: 2, "move.name": "add" }), commit("ka2", "U", "a2", at(5) + 1, "committed"),
    ], logs: [] }]]);
    const { rows, moves } = ok((await only(both)).calls);
    expect(rows.map((r) => r.outcome)).toEqual(["unknown"]);
    expect(moves).toEqual({});
  });

  it("the window is each call's: a trace that reaches out of it brings only the calls inside", async () => {
    const trace = new Map<string, WindowTrace>([["T", { spans: [link("old", "T", at(90)), link("in", "T", at(5))], logs: [] }]]);
    const { rows, moves } = ok((await only(trace)).calls);
    expect(rows.map((r) => r.start)).toEqual([at(5)]);
    expect(moves).toEqual({});
  });

  it("a move is counted for the attempt that committed it: one that selected it and lost its race took none", async () => {
    const lost = new Map<string, WindowTrace>([["L", { spans: [
      link("a1", "L", at(4), { "move.name": "add" }),
      span("k1", "L", "link.add.commit", at(4) + 1, { "step.kind": "commit", "commit.outcome": "conflict" }, { parentSpanId: "a1" }),
      link("a2", "L", at(3), { attempt: 2 }),
      span("k2", "L", "link.add.commit", at(3) + 1, { "step.kind": "commit", "commit.outcome": "committed" }, { parentSpanId: "a2" }),
    ], logs: [] }]]);
    const won = new Map<string, WindowTrace>([["W", { spans: [
      link("b1", "W", at(4), { "move.name": "add" }),
      span("k3", "W", "link.add.commit", at(4) + 1, { "step.kind": "commit", "commit.outcome": "conflict" }, { parentSpanId: "b1" }),
      link("b2", "W", at(3), { attempt: 2, "move.name": "add" }),
      span("k4", "W", "link.add.commit", at(3) + 1, { "step.kind": "commit", "commit.outcome": "committed" }, { parentSpanId: "b2" }),
    ], logs: [] }]]);
    expect(ok((await only(lost)).calls).moves, "the retry answered with what exists: no move").toEqual({});
    expect(ok((await only(won)).calls).moves, "the retry that committed its own move counts it once").toEqual({ "link.add": 1 });
  });
});

describe("a call whose commit never won", () => {
  it("is a defect, not an answer, and takes no move", async () => {
    const lost = new Map<string, WindowTrace>([["z", { spans: [
      span("z1", "z", "handle.claim", at(1), { operation: "handle.claim", attempt: 1, "principal.kind": "anonymous", "move.name": "claim" }),
      span("zc", "z", "handle.claim.commit", at(1) + 1, { "step.kind": "commit", "commit.outcome": "conflict" }, { parentSpanId: "z1" }),
    ], logs: [] }]]);
    const t = await read({ source: { window: () => Effect.succeed(lost), find: () => Effect.succeed(undefined) } });
    const { rows, moves } = ok(t.calls);
    expect(rows.map((r) => [r.trace, r.outcome])).toEqual([["z", "defect"]]);
    expect(moves).toEqual({});
  });
});

describe("InvalidPayload is a refusal the runtime makes", () => {
  it("it is in no model's refusal table, and its calls are counted by name as door refusals, never rows", async () => {
    const withInvalid = [...points, point("handle.claim", "refused", 2, "InvalidPayload")];
    const { operations, refusals } = ok((await read({ metrics: { window: () => Effect.succeed(withInvalid) } })).metrics);
    expect(operations["handle.claim"]).toMatchObject({ calls: 7, refused: 6, doorRefusals: 5, refusals: { InvalidPayload: 2 } });
    expect(refusals["InvalidPayload"]).toEqual({ count: 2, door: 2, trace: null });
  });
});

describe("counts: from ortho.calls, door refusals counted and named, never a row", () => {
  it("counts every outcome, and names the refusals that opened no span", async () => {
    const { operations, refusals } = ok((await read()).metrics);
    expect(operations["handle.claim"]).toMatchObject({ calls: 5, answered: 1, refused: 4, defects: 0, doorRefusals: 3, refusals: { HandleTaken: 1, NotAllowed: 3 } });
    expect(operations["link.add"]).toMatchObject({ calls: 2, answered: 1, refused: 0, defects: 1 });
    expect(operations["profile.get"] ?? { calls: 0 }).toMatchObject({ calls: 0 });
    expect(refusals["HandleTaken"]).toEqual({ count: 1, door: 0, trace: "b" });
    expect(refusals["NotAllowed"]).toEqual({ count: 3, door: 3, trace: null });
    expect(refusals["LinkNotListed"]).toEqual({ count: 0, door: 0, trace: null });
  });

  it("a metrics source that fails gives no numbers and no guess, and the calls still read", async () => {
    const t = await read({ metrics: { window: () => Effect.fail({ message: "the reader is down" }) } });
    expect(t.metrics).toEqual({ state: "unavailable", reason: "the reader is down" });
    expect(t.calls.state).toBe("available");
  });

  it("spans that fail leave door refusals unknown, never zero", async () => {
    const t = await read({ source: { window: () => Effect.fail({ message: "down" }), find: () => Effect.succeed(undefined) } });
    expect(t.calls.state).toBe("unavailable");
    expect(ok(t.metrics).operations["handle.claim"]!.doorRefusals).toBeNull();
  });
});

describe("no leak, and now is the only clock", () => {
  it("nothing planted is on the wire, and the trace page shows structure, attempts and a log count", async () => {
    const bp = await wire();
    const ctx = { blueprint: bp, reader: null, bundleRevision: null, live: live() };
    const answer = async (path: string) => Effect.runPromise(PortalServer.handle(ctx, new Request(`http://portal${path}`)));
    const snapshot = await (await answer(`/_portal/v1/snapshot?digest=${bp.digest}`)).text();
    const trace = await answer("/_portal/v1/traces/a");
    const text = snapshot + (await trace.clone().text());
    for (const value of PLANTED) expect(text).not.toContain(value);
    const spans = ((await trace.json()) as { value: { spans: Array<{ name: string; attempt: number | null; logs: number; depth: number }> } }).value.spans;
    expect(spans.map((s) => `${s.name}#${s.attempt ?? ""}`)).toEqual(["journey.claim a name#", "handle.claim#1", "handle.claim.commit#1", "handle.claim#2", "handle.claim.lookup#2"]);
    expect(spans.find((s) => s.name === "handle.claim" && s.attempt === 2)).toMatchObject({ logs: 1, depth: 1 });
    expect((await answer("/_portal/v1/traces/nope")).status).toBe(404);
    expect(JSON.parse(snapshot)).toMatchObject({ observedAt: new Date(NOW).toISOString(), telemetry: { now: NOW, since: NOW - WINDOW, environment: "staging" } });
    expect(snapshot, "two reads of the same window are the same bytes").toBe(await (await answer(`/_portal/v1/snapshot?digest=${bp.digest}`)).text());
  });

  it("a later now moves the window and nothing else does; with no live source telemetry is null", async () => {
    const bp = await wire();
    const later = (now: number) => live({ now, source: { window: (since, n) => Effect.succeed(new Map([...traces()].filter(([, t]) => t.spans.some((s) => s.start >= n - since && s.start <= n)))), find: () => Effect.succeed(undefined) } });
    const rows = async (now: number) => ok((await Effect.runPromise(Telemetry.read(bp, later(now)))).calls).rows.length;
    expect([await rows(NOW), await rows(NOW + 27 * 60_000)]).toEqual([3, 1]);
    const bare = await Effect.runPromise(PortalServer.handle({ blueprint: bp, reader: null, bundleRevision: null }, new Request(`http://portal/_portal/v1/snapshot?digest=${bp.digest}`)));
    expect(((await bare.json()) as { telemetry: unknown }).telemetry).toBeNull();
  });
});

describe("a feed that fails", () => {
  const rawWire = () => JSON.parse(readFileSync(join(resolve(import.meta.dirname, "../../../../.."), "examples/plugged-in/generated/portal/blueprint.json"), "utf8")) as { digest: string };
  const ask = async (feed: string) => {
    const raw = rawWire();
    const response = await Effect.runPromise(PortalServer.serve(raw, new Request(`http://portal/_portal/v1/snapshot?digest=${raw.digest}`), { ORTHO_PORTAL_FEED: feed }));
    return (await response.json()) as { observedAt: string; telemetry: { now: number; since: number; metrics: { state: string; reason?: string }; calls: { state: string } } };
  };
  const notEpoch = (snapshot: Awaited<ReturnType<typeof ask>>) => {
    expect(new Date(snapshot.observedAt).getUTCFullYear(), "observedAt is the clock's").toBeGreaterThan(2020);
    expect(snapshot.telemetry.now).toBeGreaterThan(0);
    expect(snapshot.telemetry.since).toBeGreaterThan(0);
    expect(snapshot.telemetry.metrics.state).toBe("unavailable");
    expect(snapshot.telemetry.metrics.reason).toMatch(/feed/);
    expect(snapshot.telemetry.calls.state).toBe("unavailable");
  };

  it("one that is down says so, and the snapshot is stamped with the clock, not the epoch", async () => {
    notEpoch(await ask("http://127.0.0.1:1/"));
  });

  it("one that answers garbage says so too", async () => {
    const server = createServer((_, response) => { response.writeHead(200, { "content-type": "application/json" }).end('{"nope":true}'); });
    await new Promise<void>((done) => { server.listen(0, "127.0.0.1", done); });
    try { notEpoch(await ask(`http://127.0.0.1:${(server.address() as { port: number }).port}/`)); }
    finally { server.close(); }
  });
});

describe("one source down leaves the other's numbers", () => {
  it("the feed carries each source's availability: broken metrics with readable traces still serve the traces", async () => {
    const raw = JSON.parse(readFileSync(join(resolve(import.meta.dirname, "../../../../.."), "examples/plugged-in/generated/portal/blueprint.json"), "utf8")) as { digest: string };
    const feed = { environment: "local", now: NOW, windowMs: WINDOW, traces: { state: "available", value: Object.fromEntries(traces()) }, points: { state: "unavailable", reason: "metrics.jsonl is unreadable" } };
    const server = createServer((_, response) => { response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(feed)); });
    await new Promise<void>((done) => { server.listen(0, "127.0.0.1", done); });
    try {
      const env = { ORTHO_PORTAL_FEED: `http://127.0.0.1:${(server.address() as { port: number }).port}/` };
      const answer = (path: string) => Effect.runPromise(PortalServer.serve(raw, new Request(`http://portal${path}`), env));
      const snapshot = (await (await answer(`/_portal/v1/snapshot?digest=${raw.digest}`)).json()) as PortalTelemetryAnswer;
      expect(snapshot.telemetry.metrics).toEqual({ state: "unavailable", reason: "metrics.jsonl is unreadable" });
      expect(snapshot.telemetry.calls.state).toBe("available");
      expect(snapshot.telemetry.now).toBe(NOW);
      expect((await answer("/_portal/v1/traces/a")).status, "and the trace pages").toBe(200);
    } finally { server.close(); }
  });
});
interface PortalTelemetryAnswer { readonly telemetry: { readonly now: number; readonly metrics: { state: string; reason?: string }; readonly calls: { state: string } } }
