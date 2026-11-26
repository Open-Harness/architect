// #1079: an outer call that runs another operation of the app as a step is one call. The inner operation's spans carry `inner.operation`, never
// `operation` (language-effect `handler/internal/inner.ts`), so neither its own span nor its `.refused` span is counted as a call or a door refusal.
import { describe, expect, it } from "vitest";
import type { WindowSpan, WindowTrace } from "../types.ts";
import { callsOf } from "./calls.ts";
import { spanKind } from "./spans.ts";

const span = (spanId: string, parentSpanId: string, name: string, attrs: Record<string, unknown>, start: number): WindowSpan =>
  ({ spanId, parentSpanId, name, attrs, status: 1, ms: 5, start });

// The spans a served `run.pay` writes when its `draft` step runs `entry.draft`: the attempt, the step, the inner operation, the commit.
const answered: ReadonlyArray<WindowSpan> = [
  span("a", "", "run.pay", { operation: "run.pay", attempt: 1, "principal.kind": "person", "principal.person": "per_ada" }, 10),
  span("s", "a", "run.pay.draft", { "step.kind": "operation" }, 11),
  span("i", "s", "entry.draft", { "inner.operation": "entry.draft", "principal.kind": "person", "move.name": "draft" }, 12),
  span("c", "a", "run.pay.commit", { "step.kind": "commit", "commit.outcome": "committed" }, 13),
];

// The same call, refused by the inner operation's access rule: its `.refused` span sits inside the step.
const refused: ReadonlyArray<WindowSpan> = [
  span("a", "", "run.pay", { operation: "run.pay", attempt: 1, "principal.kind": "person", refusal: "NotAllowed" }, 20),
  span("s", "a", "run.pay.draft", { "step.kind": "operation" }, 21),
  span("r", "s", "entry.draft.refused", { "inner.operation": "entry.draft", "principal.kind": "person", refusal: "NotAllowed" }, 22),
];

const window = { since: 0, now: 100 };
const steps = { "run.pay": { "run.pay.draft": "draft" } };

describe("#1079: an inner operation is a step of the outer's one call", () => {
  it("classifies the inner operation's spans as other", () => {
    expect([...answered, ...refused].map((s) => spanKind(s, {}))).toEqual(["attempt", "other", "other", "other", "attempt", "other", "other"]);
  });

  it("counts an answered outer call with an inner step as one call of the outer", () => {
    const traces = new Map<string, WindowTrace>([["t1", { spans: answered, logs: [] }]]);
    const { all } = callsOf(traces, "dev", {}, {}, steps, window);
    expect(all.map((c) => [c.operation, c.outcome])).toEqual([["run.pay", "answered"]]);
  });

  it("counts a call the inner operation refused as one refused call of the outer, with no refusal of the inner", () => {
    const traces = new Map<string, WindowTrace>([["t2", { spans: refused, logs: [] }]]);
    const { all, refusals } = callsOf(traces, "dev", {}, {}, steps, window);
    expect(all.map((c) => [c.operation, c.refusal])).toEqual([["run.pay", "NotAllowed"]]);
    expect([...refusals.values()].map((r) => [r.operation, r.name, r.count])).toEqual([["run.pay", "NotAllowed", 1]]);
  });
});
