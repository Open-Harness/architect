// #1018: prove's answer-shape eval accepts an optional answer field that has no value. A read of a root account answers
// without `parentAccount`, its span carries no `answer.parentAccount`, and the eval must not call that a missing field,
// whether it judges a recorded response (`Evals.judge`, what `ortho prove` runs) or the span alone (`Evals.judgeLive`,
// what a watch runs). A value that is there is still held to the field (a wrong type, or `null`, fails), and a required
// field that is missing still fails. The model writes `optional: true` beside a field's `value`, as the compiler does
// (`compiler/src/modules/model/internal/fields.ts`). Two reads with other field names hold it, so no eval keyed on one
// name passes. A required id goes on the span, so a missing one is judged live as well as recorded. Red on main until #1018 is built.
import { describe, expect, it } from "vitest";
import { Blueprint, type FieldsInput } from "orthograph";
import { traceable } from "orthograph/server";
import type { OperationModel } from "@orthograph/compiler";
import type { CallRecord, Project } from "#modules/journeys/types.js";
import type { Evidence } from "./types.ts";
import { Evals } from "./service.ts";

/** A read by id as the model holds it, and its answer as declared. */
const readOf = (name: string, thing: string, prefix: string, answer: FieldsInput, model: Record<string, unknown>) => ({
  answer,
  operation: {
    name, kind: "read", thing, verb: "get", payload: { id: { value: { type: "id", prefix } } }, answer: model,
    move: null, errors: [], refusals: ["NotAllowed"], allowed: [{ kind: "signed-in" }], steps: {}, budget: { p95Ms: 200 },
  } as unknown as OperationModel,
});
const READS = {
  account: readOf("account.get", "account", "acc",
    { name: Blueprint.text({ max: 140 }), keeper: Blueprint.id("per"), parentAccount: Blueprint.optional(Blueprint.id("acc")), accountType: Blueprint.optional(Blueprint.text({ max: 40 })) },
    { name: { value: { type: "text", max: 140 } }, keeper: { value: { type: "id", prefix: "per" } }, parentAccount: { value: { type: "id", prefix: "acc" }, optional: true }, accountType: { value: { type: "text", max: 40 }, optional: true } }),
  center: readOf("cost-center.get", "cost-center", "ccr",
    { label: Blueprint.text({ max: 140 }), parentCostCenter: Blueprint.optional(Blueprint.id("ccr")), owner: Blueprint.optional(Blueprint.text({ max: 40 })) },
    { label: { value: { type: "text", max: 140 } }, parentCostCenter: { value: { type: "id", prefix: "ccr" }, optional: true }, owner: { value: { type: "text", max: 40 }, optional: true } }),
} as const;

/** The span the server writes: only the answer fields telemetry may carry (text is kept out). */
const spanOf = (answer: FieldsInput, body: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(body).filter(([k]) => answer[k] !== undefined && traceable(answer[k]!)).map(([k, v]) => [`answer.${k}`, v]));

/** The answer-shape failures for one answered call: judged with its recorded body, or (live) from its span alone. */
const shape = (which: keyof typeof READS, body: Record<string, unknown>, live = false) => {
  const { operation, answer } = READS[which];
  const project = { model: { operations: { [operation.name]: operation }, refusals: { NotAllowed: "AR-001" } }, operations: new Map([[operation.name, { answer }]]) } as unknown as Project;
  const record: CallRecord = {
    journey: "set up a chart", step: "read the root", actor: "olga", person: "per_olga", operation: operation.name, payload: { id: "x" },
    status: 200, body: live ? undefined : body, trace: "t", parent: "p", mayCall: true, journal: [],
  };
  const trace: Evidence["trace"] = { spans: [{ traceId: "t", spanId: "s", parentSpanId: "p", name: operation.name, attrs: spanOf(answer, body), status: 1, ms: 1, start: 0 }], logs: [] };
  const evidence = Evals.gather([record], new Map([["t", trace]]));
  return (live ? Evals.judgeLive(project, evidence) : Evals.judge(project, evidence)).find((v) => v.eval === "answer shape")!.failures;
};

describe("answer shape: an optional answer field with no value (#1018)", () => {
  it("passes a root whose answer and span have neither optional field", () => {
    expect(shape("account", { name: "Assets", keeper: "per_olga" })).toEqual([]);
    expect(shape("center", { label: "Main" })).toEqual([]);
  });

  it("passes an answer with one optional field and not the other", () => {
    expect(shape("account", { name: "Cash", keeper: "per_olga", parentAccount: "acc_root" })).toEqual([]);
    expect(shape("center", { label: "Lab", owner: "cy" })).toEqual([]);
  });

  it("passes it live, from the span alone, with no response", () => {
    expect(shape("account", { name: "Assets", keeper: "per_olga" }, true)).toEqual([]);
    expect(shape("center", { label: "Lab", owner: "cy" }, true)).toEqual([]);
  });

  it("control: passes an answer with both", () => {
    expect(shape("account", { name: "Bank", keeper: "per_olga", parentAccount: "acc_root", accountType: "Bank" })).toEqual([]);
    expect(shape("center", { label: "Ops", parentCostCenter: "ccr_top", owner: "olga" })).toEqual([]);
  });

  it("control: still fails an optional field that is there with the wrong value, or null", () => {
    expect(shape("account", { name: "Bank", keeper: "per_olga", parentAccount: 7 }).join("\n")).toContain("answer.parentAccount");
    expect(shape("account", { name: "Bank", keeper: "per_olga", accountType: null }).join("\n")).toContain("answer.accountType");
    expect(shape("center", { label: "Ops", parentCostCenter: "acc_root" }).join("\n")).toContain("answer.parentCostCenter");
    expect(shape("center", { label: "Ops", parentCostCenter: "acc_root" }, true).join("\n")).toContain("answer.parentCostCenter");
  });

  it("control: still fails a required field that is missing", () => {
    expect(shape("account", { keeper: "per_olga", parentAccount: "acc_root" }).join("\n")).toContain("answer.name");
    expect(shape("center", { parentCostCenter: "ccr_top" }).join("\n")).toContain("answer.label");
    // A required id goes on the span: missing, it fails recorded and live, as on main.
    expect(shape("account", { name: "Assets", parentAccount: "acc_root" }).join("\n")).toContain("answer.keeper");
    expect(shape("account", { name: "Assets", parentAccount: "acc_root" }, true).join("\n")).toContain("answer.keeper");
  });
});
