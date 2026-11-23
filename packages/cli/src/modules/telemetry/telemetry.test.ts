import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { TelemetryCommand } from "./service.ts";

const root = mkdtempSync(join(tmpdir(), "telemetry-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const trace = "0123456789abcdef0123456789abcdef";
const defectTrace = "fedcba9876543210fedcba9876543210";

const kv = (key: string, value: string) => ({ key, value: { stringValue: value } });
const span = (t: string, id: string, parent: string, name: string, attrs: Array<ReturnType<typeof kv>>, code: number, start: number) =>
  ({ traceId: t, spanId: id, parentSpanId: parent, name, kind: 1, startTimeUnixNano: String(start * 1_000_000), endTimeUnixNano: String((start + 2) * 1_000_000), attributes: attrs, status: { code } });

// A recorded run: one refusing call and one dying call, as the Collector's file exporter writes them.
mkdirSync(join(root, ".ortho/prove-telemetry"), { recursive: true });
writeFileSync(join(root, ".ortho/prove-telemetry/traces.jsonl"), [
  { resourceSpans: [{ scopeSpans: [{ spans: [
    span(trace, "00000000000000a1", "", "journey.grant", [], 1, 1),
    span(trace, "00000000000000b1", "00000000000000a1", "POST", [], 1, 2),
    span(trace, "00000000000000c1", "00000000000000b1", "allowance.grant", [kv("refusal", "AllowanceLimitTooHigh")], 1, 3),
    span(defectTrace, "00000000000000a2", "", "journey.grant", [], 1, 1),
    span(defectTrace, "00000000000000c2", "00000000000000a2", "allowance.grant", [kv("defect", "Error: boom")], 2, 3),
  ] }] }] },
  { resourceLogs: [{ scopeLogs: [{ logRecords: [{ traceId: trace, spanId: "00000000000000c1", body: { stringValue: "the limit is over the cap" }, attributes: [] }] }] }] },
].map((d) => JSON.stringify(d)).join("\n") + "\n");
writeFileSync(join(root, ".ortho/prove-telemetry/logs.jsonl"), JSON.stringify({ resourceLogs: [{ scopeLogs: [{ logRecords: [{ traceId: trace, spanId: "00000000000000c1", body: { stringValue: "the limit is over the cap" }, attributes: [] }] }] }] }) + "\n");

const run = (id: string, env?: string) => Effect.runPromise(TelemetryCommand.trace({ root, id, ...(env ? { env } : {}) }));

describe("ortho telemetry trace", () => {
  it("prints a recorded run's trace as a tree with its log, a refusal marked refused", async () => {
    const said = await run(trace);
    expect(said.exit).toBe(0);
    expect(said.out).toContain("journey.grant");
    expect(said.out).toContain("refused AllowanceLimitTooHigh");
    expect(said.out).toContain("· the limit is over the cap");
    expect(said.out).not.toContain("✘");
  });

  it("marks a defect differently", async () => {
    const said = await run(defectTrace, "local");
    expect(said.out).toContain("✘ defect: Error: boom");
    expect(said.out).not.toContain("refused");
  });

  it("says what it searched when it has no such trace, and refuses what is not a trace id", async () => {
    const none = await run("a".repeat(32));
    expect([none.exit, none.err]).toEqual([1, expect.stringContaining(".ortho/prove-telemetry")]);
    expect((await run("nope")).exit).toBe(2);
    expect((await run(trace, "test")).exit).toBe(1);
  });
});
