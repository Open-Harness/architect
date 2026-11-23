import { expect, it } from "vitest";
import type { CallRecord, StepResult } from "#modules/journeys/types.js";
import type { Trace } from "#modules/telemetry/types.js";
import { journeyLines } from "./report.ts";

const step: StepResult = {
  journey: "spend an allowance", title: "a stranger tries to spend", trace: "refused-call", failures: [],
  spans: { present: [], absent: ["allowance.spend"] },
};
const refused: CallRecord = {
  journey: step.journey, step: step.title, actor: "bob", person: "per_bob", operation: "allowance.spend",
  payload: {}, status: 403, body: { _tag: "NotAllowed" }, trace: step.trace, parent: "journey", mayCall: false, journal: [],
};
const missing: Trace = { spans: [], logs: [] };

const check = (call: CallRecord, spans = step.spans, trace = missing) =>
  journeyLines([{ name: step.journey, stopped: undefined, steps: [{ ...step, spans }], calls: [call] }], new Map([[step.trace, trace]]));

it("allows an empty trace for a matching access refusal predicted from world facts", () => {
  expect(check(refused).failed).toBe(0);
});

it("still needs telemetry for other calls", () => {
  for (const call of [
    { ...refused, mayCall: true },
    { ...refused, status: 200, body: {} },
    { ...refused, body: { _tag: "AnotherRefusal" } },
    { ...refused, trace: "another-call" },
  ]) expect(check(call).lines).toContain(`  ✘ "${step.title}": telemetry missing: no span of this call reached the collector`);
});

it("a tools list (`.tools()`) runs no operation: its empty trace is not missing telemetry", () => {
  const tools: CallRecord = { ...refused, operation: "tools", status: 200, body: { tools: [] }, mayCall: true, tools: true };
  expect(check(tools).failed).toBe(0);
  expect(check({ ...tools, tools: undefined } as unknown as CallRecord).lines).toContain(`  ✘ "${step.title}": telemetry missing: no span of this call reached the collector`);
});

it("keeps explicit span assertions for an access refusal", () => {
  expect(check(refused, { present: ["allowance.spend"], absent: [] }).failed).toBe(1);
  const trace: Trace = {
    ...missing,
    spans: [{ traceId: step.trace, spanId: "unexpected", parentSpanId: "journey", name: "allowance.spend", attrs: {}, status: 0, ms: 1, start: 1 }],
  };
  expect(check(refused, step.spans, trace).lines).toContain(`  ✘ "${step.title}": span allowance.spend present, expected absent`);
});

it("a step whose call died names the defect its span recorded", () => {
  const died: CallRecord = { ...refused, status: 500, body: null, mayCall: true };
  const trace: Trace = {
    ...missing,
    spans: [{ traceId: step.trace, spanId: "op", parentSpanId: "journey", name: "echo.repeat", attrs: { defect: "BlankReached: " }, status: 2, ms: 1, start: 1 }],
  };
  const failed = { ...step, failures: ["expected an answer, failed with 500"], spans: { present: [], absent: [] } };
  const lines = journeyLines([{ name: step.journey, stopped: undefined, steps: [failed], calls: [died] }], new Map([[step.trace, trace]])).lines;
  expect(lines).toContain(`  ✘ "${step.title}": the server died: BlankReached`);
  const answered = journeyLines([{ name: step.journey, stopped: undefined, steps: [{ ...failed, failures: [] }], calls: [{ ...died, status: 200 }] }], new Map([[step.trace, trace]])).lines;
  expect(answered.join("\n")).not.toContain("the server died");
});

const spend = { operations: { "allowance.spend": { kind: "operation", name: "allowance.spend", thing: "allowance", verb: "spend", runs: "server", from: { kind: "app" }, file: "blueprint/things/allowance/verbs/spend.ts" } } } as never;
const spanned = (spans: ReadonlyArray<string>): Trace => ({
  ...missing,
  spans: spans.map((name, i) => ({ traceId: step.trace, spanId: `s${i}`, parentSpanId: "journey", name, attrs: {}, status: 0, ms: 4, start: i })),
});
const wantsRecord = { ...step, failures: [], spans: { present: ["allowance.spend.record"], absent: [] } };
const answered: CallRecord = { ...refused, status: 200, body: {}, mayCall: true };

it("a missing span says it was expected and lists the spans the call produced", () => {
  const { lines } = journeyLines([{ name: step.journey, stopped: undefined, steps: [wantsRecord], calls: [answered] }], new Map([[step.trace, spanned(["allowance.spend", "allowance.spend.commit"])]]), false, spend);
  expect(lines).toContain(`  ✘ "${step.title}": span allowance.spend.record missing: expected present, the call produced allowance.spend, allowance.spend.commit`);
});

it("a failing step names its handler and its declaration, and the report carries them with expected and got", () => {
  const wrong = { ...step, failures: [`answer "500", expected "380"`], findings: [{ message: `answer "500", expected "380"`, expected: `"380"`, got: `"500"` }], spans: { present: [], absent: [] } };
  const out = journeyLines([{ name: step.journey, stopped: undefined, steps: [wrong], calls: [answered] }], new Map([[step.trace, spanned(["allowance.spend"])]]), false, spend);
  expect(out.lines).toContain(`  ✘ "${step.title}": handler src/allowance/spend.ts, declared in blueprint/things/allowance/verbs/spend.ts (allowance.spend)`);
  expect(out.details[0]?.steps[0]).toMatchObject({
    verdict: "fail", expected: `"380"`, got: `"500"`, handlerFile: "src/allowance/spend.ts", declarationFile: "blueprint/things/allowance/verbs/spend.ts", ms: 4,
  });
});

it("a read has no handler: its line names the declaration only, and the report has no handlerFile", () => {
  const read = { operations: { "allowance.get": { kind: "read", name: "allowance.get", thing: "allowance", verb: "get", runs: "server", from: { kind: "app" }, file: "blueprint/things/allowance/verbs/get.ts" } } } as never;
  const wrong = { ...step, failures: ["x"], spans: { present: [], absent: [] } };
  const out = journeyLines([{ name: step.journey, stopped: undefined, steps: [wrong], calls: [{ ...answered, operation: "allowance.get" }] }], new Map([[step.trace, spanned(["allowance.get"])]]), false, read);
  expect(out.lines).toContain(`  ✘ "${step.title}": declared in blueprint/things/allowance/verbs/get.ts (allowance.get, a read: no handler)`);
  expect(out.details[0]?.steps[0]?.handlerFile).toBeUndefined();
});

it("a plugin's operation names the handler in its package; a call with no operation span says ms null", () => {
  const mounted = { operations: { "wallet.send": { kind: "operation", name: "wallet.send", thing: "wallet", verb: "send", runs: "server", file: "@acme/wallet/blueprint/send", from: { kind: "feature", mount: "wallet", package: "@acme/wallet", version: "1", thing: "wallet" } } } } as never;
  const wrong = { ...step, failures: ["x"], spans: { present: [], absent: [] } };
  const out = journeyLines([{ name: step.journey, stopped: undefined, steps: [wrong], calls: [{ ...answered, operation: "wallet.send" }] }], new Map([[step.trace, spanned(["other"])]]), false, mounted);
  expect(out.lines).toContain(`  ✘ "${step.title}": handler @acme/wallet/src/wallet/send.js, declared in @acme/wallet/blueprint/send (wallet.send)`);
  expect(out.details[0]?.steps[0]?.ms).toBeNull();
});
