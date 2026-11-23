import { describe, expect, it } from "vitest";
import { Telemetry } from "./service.ts";
import { stepOf, stepsOf } from "./internal/spans.ts";

describe("the step classifier (M1.49)", () => {
  const steps = stepsOf({ model: { operations: { "a.go": { steps: { record: { name: "a.go.record", type: "database" } } } } } } as never);
  const span = (name: string, attrs: Record<string, unknown>) => ({ spanId: "s", parentSpanId: "", name, ms: 1, start: 0, status: 1, attrs });

  it("a span is a declared step when it has a string step.kind and a name the operation declares: the key is the step", () => {
    expect(stepOf(span("a.go.record", { "step.kind": "database" }), "a.go", steps)).toBe("record");
  });

  it("an adapter's span, a look-alike name without a step.kind, and another operation's step are none", () => {
    expect(stepOf(span("sql.execute", { "step.kind": "database" }), "a.go", steps)).toBeUndefined();
    expect(stepOf(span("a.go.record", {}), "a.go", steps)).toBeUndefined();
    expect(stepOf(span("a.go.record", { "step.kind": 1 }), "a.go", steps)).toBeUndefined();
    expect(stepOf(span("a.go.record", { "step.kind": "database" }), "b.go", steps)).toBeUndefined();
  });

  it("the runtime's commit span is the step `commit`, only under its own operation", () => {
    expect(stepOf(span("a.go.commit", { "step.kind": "commit" }), "a.go", steps)).toBe("commit");
    expect(stepOf(span("b.go.commit", { "step.kind": "commit" }), "a.go", steps)).toBeUndefined();
  });

  it("a call's id is its call.id when every attempt shares it, else its trace and attempt spans; over budget is judged by the model's budget", () => {
    const blueprint = { model: { operations: { "a.go": { budget: { p95Ms: 10 }, steps: {} } } } } as never;
    const attempt = (id: string, n: number, extra: Record<string, unknown>) => ({ spanId: id, parentSpanId: "", name: "a.go", ms: 50, start: n, status: 1, attrs: { operation: "a.go", attempt: n, ...extra } });
    const traces = new Map([["t1", { logs: [], spans: [attempt("s1", 1, { "call.id": "K" }), attempt("s2", 2, { "call.id": "K" })] }], ["t2", { logs: [], spans: [attempt("s3", 1, {})] }]]);
    const calls = Telemetry.calls(blueprint, traces as never, "local", { since: -1, now: 100 });
    expect(calls.map((c) => c.id).sort()).toEqual(["K", "t2/s3"]);
    expect(calls.every((c) => c.overBudget)).toBe(true);
  });
});
