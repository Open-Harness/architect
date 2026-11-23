import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";
import { Telemetry } from "#modules/telemetry/service.js";
import type { PortalLive, WindowSpan, WindowTrace } from "#modules/telemetry/types.js";
import type { BlueprintWire } from "#modules/wire/types.js";
import type { MonitorLedger } from "./types.ts";
import { Monitor } from "./service.ts";

const NOW = 1_800_000_000_000;
const MIN = 60_000;
const rule = (target: number) => ({
  id: "latency:a.go", kind: "latency" as const, labels: { environment: "*", operation: "a.go", severity: "page", owner: "blueprint/a.ts" },
  target, windowDays: 28, thresholdMs: 100, minCalls: 2, alerts: [{ name: "fast", burn: 10, windowsMs: [60 * MIN, 5 * MIN], severity: "page" }],
});
const STEPS = Object.fromEntries(["load", "record", "first", "second"].map((k) => [k, { name: `a.go.${k}`, type: "database" }]));
const wire = (target = 0.9): BlueprintWire => ({ digest: "d", model: { operations: { "a.go": { hash: "h1", file: "blueprint/a.ts", steps: STEPS } }, alertRules: [rule(target)] } }) as unknown as BlueprintWire;

const call = (n: number, ms: number, start = NOW - MIN, defect?: { step: string; tag: string }): readonly [string, WindowTrace] => {
  const id = String(n).padStart(8, "0");
  const op: WindowSpan = { spanId: `s${n}`, parentSpanId: "", name: "a.go", ms, start, status: defect ? 2 : 1, attrs: { operation: "a.go", attempt: 1, ...(defect ? { defect: "Error: x", "error.tag": defect.tag } : {}) } };
  const step: ReadonlyArray<WindowSpan> = defect ? [{ spanId: `t${n}`, parentSpanId: op.spanId, name: `a.go.${defect.step}`, ms: 1, start, status: 2, attrs: { "step.kind": "database", "error.tag": defect.tag } }] : [];
  return [id, { spans: [op, ...step], logs: [] }];
};
const liveOf = (traces: ReadonlyArray<readonly [string, WindowTrace]>, at = NOW, historyMs?: number): PortalLive => ({
  environment: "local", now: at, windowMs: 30 * MIN, ...(historyMs === undefined ? {} : { historyMs }),
  source: { find: () => Effect.succeed(undefined), window: (since, now) => Effect.succeed(new Map(traces.filter(([, t]) => t.spans.some((s) => s.start >= now - since && s.start <= now)))) },
  metrics: { window: () => Effect.succeed([]) },
});
const held = () => {
  const book = new Map<string, string>();
  const ledger: MonitorLedger = { get: (k) => Effect.sync(() => (book.has(k) ? (JSON.parse(book.get(k)!) as unknown) : undefined)), put: (k, v) => Effect.sync(() => { book.set(k, JSON.stringify(v)); }) };
  return ledger;
};
const read = (w: BlueprintWire, live: PortalLive, ledger?: MonitorLedger) => Effect.runPromise(Monitor.read(w, live, ledger));

describe("alerts", () => {
  it("equality fires: 1 slow call in 10 burns a 0.9 objective at exactly 1, so a rate of 1 fires and 2 does not", async () => {
    const traces = [call(1, 500), ...Array.from({ length: 9 }, (_, i) => call(i + 2, 10))];
    const burning = (burn: number) => ({ ...wire(), model: { ...wire().model, alertRules: [{ ...rule(0.9), alerts: [{ name: "fast", burn, windowsMs: [60 * MIN, 5 * MIN], severity: "page" }] }] } }) as unknown as BlueprintWire;
    expect((await read(burning(1), liveOf(traces))).alerts[0]).toMatchObject({ state: "firing", windows: [{ ms: 60 * MIN, calls: 10, bad: 1 }, { ms: 5 * MIN, calls: 10, bad: 1 }] });
    expect((await read(burning(2), liveOf(traces))).alerts[0]!.state).toBe("ok");
  });

  it("the short window must hold minCalls calls", async () => {
    expect((await read(wire(), liveOf([call(1, 500)]))).alerts[0]!.state).toBe("ok");
    expect((await read(wire(), liveOf([call(1, 500), call(2, 500)]))).alerts[0]!.state).toBe("firing");
  });

  it("a source that cannot be read leaves the alert unknown, never ok", async () => {
    const down: PortalLive = { ...liveOf([]), source: { find: () => Effect.succeed(undefined), window: () => Effect.fail({ message: "down" }) } };
    expect((await read(wire(), down)).alerts[0]!.state).toBe("unknown");
  });

  it("a rule of another environment is not evaluated, and a rule with no burn is unknown", async () => {
    const other = { id: "verdict:j:test", kind: "verdict" as const, labels: { environment: "test", journey: "j", severity: "page", owner: "j.ts" } };
    const anomaly = { id: "anomaly:X-1", kind: "anomaly" as const, labels: { environment: "*", code: "X-1", severity: "ticket", owner: "o" } };
    const w = { ...wire(), model: { ...wire().model, alertRules: [other, anomaly] } } as unknown as BlueprintWire;
    expect((await read(w, liveOf([]))).alerts).toEqual([{ rule: "anomaly:X-1", alert: "anomaly", state: "unknown", severity: "ticket" }]);
  });
});

describe("a source that reaches back only so far", () => {
  const bad = Array.from({ length: 20 }, (_, i) => call(i + 1, 500, NOW - MIN - i));
  const old = Array.from({ length: 200 }, (_, i) => call(i + 100, 10, NOW - 45 * MIN - i));

  it("a window longer than its history is unknown, not judged on the part it holds: 20 recent slow calls among 200 fast ones 45 minutes ago", async () => {
    // The whole hour would hold 20 slow in 220 (not a burn of 10 at 0.9); the 30 minutes the source holds say 20 of 20.
    const seen = await read(wire(), liveOf([...bad, ...old], NOW, 30 * MIN));
    expect(seen.alerts[0]).toEqual({ rule: "latency:a.go", alert: "fast", state: "unknown", severity: "page" });
  });

  it("with the history, the same calls are judged on the whole window", async () => {
    expect((await read(wire(), liveOf([...bad, ...old]))).alerts[0]).toMatchObject({ state: "ok", windows: [{ ms: 60 * MIN, calls: 220, bad: 20 }, { ms: 5 * MIN, calls: 20, bad: 20 }] });
  });

  it("an alert whose windows the source does cover is still evaluated", async () => {
    const short = { ...wire(), model: { ...wire().model, alertRules: [{ ...rule(0.9), alerts: [{ name: "fast", burn: 2, windowsMs: [30 * MIN, 5 * MIN], severity: "page" }] }] } } as unknown as BlueprintWire;
    expect((await read(short, liveOf(bad, NOW, 30 * MIN))).alerts[0]).toMatchObject({ state: "firing" });
  });
});

describe("one read", () => {
  it("groups each distinct window once, however many rules and alerts read it", async () => {
    const rules = Array.from({ length: 30 }, (_, i) => ({ ...rule(0.9), id: `latency:a.go${i}`, labels: { ...rule(0.9).labels, operation: "a.go" } }));
    const many = { ...wire(), model: { ...wire().model, alertRules: rules } } as unknown as BlueprintWire;
    const grouping = vi.spyOn(Telemetry, "calls");
    try {
      await read(many, liveOf([call(1, 500)]));
      // The windows named are 60 and 5 minutes, and the issues' own 30: three passes, not 30 rules times their windows.
      expect(grouping).toHaveBeenCalledTimes(3);
    } finally { grouping.mockRestore(); }
  });
});

describe("issues", () => {
  it("two distinct calls alike in trace, operation, start and step are two occurrences: a call is its attempt spans, never a time", async () => {
    const at = NOW - 5 * MIN;
    const span = (id: string, parent: string, name: string, extra: Record<string, unknown> = {}): WindowSpan => ({ spanId: id, parentSpanId: parent, name, ms: 100, start: at, status: 2, attrs: extra });
    const trace: readonly [string, WindowTrace] = ["00000001", { logs: [], spans: [
      span("a1", "", "a.go", { operation: "a.go", attempt: 1, "call.id": "A", "error.tag": "Boom", defect: "x" }), span("a2", "a1", "a.go.record", { "step.kind": "database", "error.tag": "Boom" }),
      span("b1", "", "a.go", { operation: "a.go", attempt: 1, "call.id": "B", "error.tag": "Boom", defect: "x" }), span("b2", "b1", "a.go.record", { "step.kind": "database", "error.tag": "Boom" }),
    ] }];
    const ledger = held();
    expect((await read(wire(), liveOf([trace]), ledger)).issues[0]).toMatchObject({ key: "a.go/record/Boom", occurrences: 2 });
    expect((await read(wire(), liveOf([trace], NOW + MIN), ledger)).issues[0]).toMatchObject({ occurrences: 2 });
  });

  it("two calls overlapping under one trace each keep their own step and tag", async () => {
    const span = (id: string, parent: string, name: string, start: number, extra: Record<string, unknown> = {}): WindowSpan => ({ spanId: id, parentSpanId: parent, name, ms: 100, start, status: 2, attrs: extra });
    const trace: readonly [string, WindowTrace] = ["00000001", { logs: [], spans: [
      span("a1", "", "a.go", NOW - 5 * MIN, { operation: "a.go", attempt: 1, "call.id": "A", "error.tag": "TagA", defect: "x" }),
      span("b1", "", "a.go", NOW - 5 * MIN + 10, { operation: "a.go", attempt: 1, "call.id": "B", "error.tag": "TagB", defect: "x" }),
      span("a2", "a1", "a.go.first", NOW - 5 * MIN + 1, { "step.kind": "database", "error.tag": "TagA" }), span("b2", "b1", "a.go.second", NOW - 5 * MIN + 11, { "step.kind": "database", "error.tag": "TagB" }),
    ] }];
    expect((await read(wire(), liveOf([trace]), held())).issues.map((i) => i.key)).toEqual(["a.go/first/TagA", "a.go/second/TagB"]);
  });

  const dies = (n: number, at: number) => call(n, 5, at, { step: "record", tag: "Boom" });

  it("one per operation, step and tag; a second call joins it, and reading again counts nothing twice", async () => {
    const ledger = held();
    const traces = [dies(1, NOW - 2 * MIN), dies(2, NOW - MIN), call(3, 5)];
    const first = await read(wire(), liveOf(traces), ledger);
    expect(first.issues).toEqual([{ key: "a.go/record/Boom", operation: "a.go", step: "record", tag: "Boom", owner: "blueprint/a.ts", occurrences: 2, firstSeen: { at: NOW - 2 * MIN, hash: "h1" }, lastSeen: { at: NOW - MIN, hash: "h1" }, regressed: false }]);
    expect(await read(wire(), liveOf(traces, NOW + MIN), ledger)).toMatchObject({ issues: [{ occurrences: 2 }] });
  });

  it("is kept past the window in the ledger it is handed, and nowhere else", async () => {
    const ledger = held();
    await read(wire(), liveOf([dies(1, NOW - MIN)]), ledger);
    expect((await read(wire(), liveOf([], NOW + 3 * 24 * 60 * MIN), ledger)).issues).toHaveLength(1);
    expect((await read(wire(), liveOf([], NOW + 3 * 24 * 60 * MIN), held())).issues).toEqual([]);
    expect((await read(wire(), liveOf([dies(1, NOW - MIN)]), undefined)).issues).toHaveLength(1);
  });

  it("regressed: the same defect after the operation's own declaration changed; an old call read again is not it", async () => {
    const ledger = held();
    const changed = { ...wire(), model: { ...wire().model, operations: { "a.go": { hash: "h2", file: "blueprint/a.ts", steps: STEPS } } } } as unknown as BlueprintWire;
    const old = dies(1, NOW - 5 * MIN);
    await read(wire(), liveOf([old]), ledger);
    expect((await read(changed, liveOf([old], NOW + MIN), ledger)).issues[0]).toMatchObject({ regressed: false });
    const back = dies(2, NOW + 2 * MIN);
    expect((await read(changed, liveOf([old, back], NOW + 3 * MIN), ledger)).issues[0]).toMatchObject({ regressed: true, occurrences: 2, firstSeen: { hash: "h1" }, lastSeen: { hash: "h2" } });
  });

  const sp = (id: string, parent: string, name: string, status: number, attrs: Record<string, unknown> = {}, start = NOW - MIN): WindowSpan => ({ spanId: id, parentSpanId: parent, name, ms: 5, start, status, attrs });
  const attempt = (extra: Record<string, unknown> = {}) => sp("op", "", "a.go", 2, { operation: "a.go", attempt: 1, "call.id": "C1", defect: "x", "error.tag": "Boom", ...extra });
  const keys = async (spans: ReadonlyArray<WindowSpan>, w = wire()) => (await read(w, liveOf([["0000000a", { logs: [], spans }]]), held())).issues.map((i) => i.key);

  it("the step is the deepest declared step: an errored adapter span under it, and a recovered one under an earlier step, are never the step", async () => {
    expect(await keys([
      attempt(),
      sp("s1", "op", "a.go.load", 1, { "step.kind": "database" }), sp("x1", "s1", "sql.execute", 2),
      sp("s2", "op", "a.go.record", 2, { "step.kind": "database", "error.tag": "Boom" }), sp("x2", "s2", "sql.execute", 2),
    ])).toEqual(["a.go/record/Boom"]);
  });

  it("a dying commit is the step `commit`, which the blueprint does not declare but the runtime names", async () => {
    expect(await keys([attempt(), sp("s1", "op", "a.go.load", 1, { "step.kind": "database" }), sp("c1", "op", "a.go.commit", 2, { "step.kind": "commit", "error.tag": "Boom" })])).toEqual(["a.go/commit/Boom"]);
  });

  it("a defect no declared step explains is the operation itself, step `-`: a read's, or a die outside every step", async () => {
    expect(await keys([attempt(), sp("x1", "op", "sql.execute", 2)])).toEqual(["a.go/-/Boom"]);
  });

  it("a span that only looks like a step (a name under the operation, no `step.kind`) is not one", async () => {
    expect(await keys([attempt(), sp("s1", "op", "a.go.record", 2)])).toEqual(["a.go/-/Boom"]);
  });

  it("a step that errored and was recovered is not blamed for a later die outside every step: only a step with the attempt's own error.tag is a candidate", async () => {
    // `load` died with Other and the handler recovered; the call then died at the answer check with Boom, in no step.
    expect(await keys([attempt(), sp("s1", "op", "a.go.load", 2, { "step.kind": "database", "error.tag": "Other" })])).toEqual(["a.go/-/Boom"]);
    // The same tag as the attempt's is the attempt's own failure: blamed.
    expect(await keys([attempt(), sp("s1", "op", "a.go.load", 2, { "step.kind": "database", "error.tag": "Boom" })])).toEqual(["a.go/load/Boom"]);
  });

  it("a call that ran out of tries (every attempt ended ok on a commit conflict, then the runtime died outside them) opens `<op>/commit/Error`: the runtime's own die is an Error", async () => {
    const conflicted = (n: number) => [sp(`op${n}`, "", "a.go", 1, { operation: "a.go", attempt: n, "call.id": "C9" }, NOW - MIN + n), sp(`c${n}`, `op${n}`, "a.go.commit", 1, { "step.kind": "commit", "commit.outcome": "conflict" }, NOW - MIN + n)];
    expect(await keys([...conflicted(1), ...conflicted(2)])).toEqual(["a.go/commit/Error"]);
  });

  it("a call is its `call.id`: read again with an attempt added between the reads, it counts once", async () => {
    const ledger = held();
    const one = [attempt({ attempt: 1 }), sp("s1", "op", "a.go.record", 2, { "step.kind": "database", "error.tag": "Boom" })];
    const two = [...one, sp("op2", "", "a.go", 2, { operation: "a.go", attempt: 2, "call.id": "C1", defect: "x", "error.tag": "Boom" }, NOW - MIN + 50), sp("s2", "op2", "a.go.record", 2, { "step.kind": "database", "error.tag": "Boom" }, NOW - MIN + 51)];
    await read(wire(), liveOf([["0000000a", { logs: [], spans: one }]]), ledger);
    expect((await read(wire(), liveOf([["0000000a", { logs: [], spans: two }]], NOW + MIN), ledger)).issues).toMatchObject([{ key: "a.go/record/Boom", occurrences: 1 }]);
  });

  it("a ledger holding junk is an empty one", async () => {
    const junk: MonitorLedger = { get: () => Effect.succeed("nonsense"), put: () => Effect.void };
    expect((await read(wire(), liveOf([dies(1, NOW - MIN)]), junk)).issues).toHaveLength(1);
  });
});
