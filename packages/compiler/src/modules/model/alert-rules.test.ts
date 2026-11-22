// K18 decision 1: the rules are derived from the model alone, one list in id order. The check (e2e/m1/39) judges the real compiler's output on Plugged In; this keeps
// the derivation's own edges: no budget is no latency objective, no environment is no verdict, an anomaly's owner is the file that declares its code.
import { describe, expect, it } from "vitest";
import { alertRulesOf } from "./internal/rules.ts";

const op = (file: string, budget: number | null) => ({ file, budget: budget === null ? null : { p95Ms: budget } });
const model = (environments?: Record<string, object>) => ({
  operations: { "a.go": op("blueprint/a.ts", 150), "a.stay": op("blueprint/b.ts", null) },
  refusals: { Nope: "AA-001", NotAllowed: "AR-001" },
  things: { a: { errors: { Nope: { code: "AA-001" } } } },
  journeys: { "journeys/j.ts": { name: "j", file: "journeys/j.ts" } },
  ...(environments === undefined ? {} : { environments }),
}) as never;

describe("alertRulesOf", () => {
  it("a latency objective per budget, a defect objective per operation, an anomaly per code, a verdict per journey and environment, sorted by id", () => {
    const rules = alertRulesOf(model({ local: {}, test: {} }));
    expect(rules.map((r) => r.id)).toEqual(["anomaly:AA-001", "anomaly:AR-001", "defect:a.go", "defect:a.stay", "latency:a.go", "verdict:j:local", "verdict:j:test"]);
    expect(rules.find((r) => r.id === "latency:a.go")).toMatchObject({ target: 0.95, windowDays: 28, thresholdMs: 150, minCalls: 20, labels: { environment: "*", operation: "a.go", severity: "page", owner: "blueprint/a.ts" } });
    expect(rules.find((r) => r.id === "defect:a.stay")).toMatchObject({ target: 0.999, labels: { owner: "blueprint/b.ts" } });
    expect(rules.find((r) => r.id === "latency:a.go")!.alerts!.map((a) => [a.name, a.burn, a.windowsMs, a.severity])).toEqual([
      ["fast", 14.4, [3_600_000, 300_000], "page"], ["slow", 6, [21_600_000, 1_800_000], "page"], ["ticket", 1, [259_200_000, 21_600_000], "ticket"],
    ]);
  });

  it("an anomaly is a ticket owned by the file that declares its code, or by orthograph for the runtime's; a verdict is the journey's, in its environment", () => {
    const rules = alertRulesOf(model({ local: {} }));
    expect(rules.find((r) => r.id === "anomaly:AA-001")!.labels).toEqual({ environment: "*", code: "AA-001", severity: "ticket", owner: "blueprint/things/a/errors.ts" });
    expect(rules.find((r) => r.id === "anomaly:AR-001")!.labels["owner"]).toBe("orthograph");
    expect(rules.find((r) => r.id === "verdict:j:local")!.labels).toEqual({ environment: "local", journey: "j", severity: "page", owner: "journeys/j.ts" });
  });

  it("a project with no environments has no verdicts", () => {
    expect(alertRulesOf(model()).filter((r) => r.kind === "verdict")).toEqual([]);
  });
});
