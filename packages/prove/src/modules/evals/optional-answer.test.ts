// #1018: prove's answer-shape eval accepts an optional answer field that has no value. A read of a root account answers
// without `parentAccount`, its span carries no `answer.parentAccount`, and the eval must not call that a missing field.
// A value that is there is still held to the field (a wrong type, or `null`, fails), and a required field that is missing
// still fails. Judged through `Evals.gather` and `Evals.judge`, the path `ortho prove` takes. Red on main until #1018 is built.
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { traceable } from "orthograph/server";
import type { OperationModel } from "@orthograph/compiler";
import type { CallRecord, Project } from "#modules/journeys/types.js";
import type { Evidence } from "./types.ts";
import { Evals } from "./service.ts";

const answer = {
  name: Blueprint.text({ max: 140 }),
  parentAccount: Blueprint.optional(Blueprint.id("acc")),
  accountType: Blueprint.optional(Blueprint.text({ max: 40 })),
};
const operation = {
  name: "account.get", kind: "read", thing: "account", verb: "get", payload: { id: { value: { type: "id", prefix: "acc" } } },
  answer: {
    name: { value: { type: "text", max: 140 } },
    parentAccount: { value: { type: "id", prefix: "acc", optional: true } },
    accountType: { value: { type: "text", max: 40, optional: true } },
  },
  move: null, errors: [], refusals: ["NotAllowed"], allowed: [{ kind: "signed-in" }], steps: {}, budget: { p95Ms: 200 },
} as unknown as OperationModel;

/** The span the server writes: only the answer fields telemetry may carry (text is kept out). */
const spanOf = (body: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(body).filter(([k]) => k in answer && traceable(answer[k as keyof typeof answer])).map(([k, v]) => [`answer.${k}`, v]));
/** One answered call, its body as the wire sent it and its span as the server wrote it. */
const shape = (body: Record<string, unknown>, attrs: Record<string, unknown> = spanOf(body)) => {
  const project = { model: { operations: { [operation.name]: operation }, refusals: { NotAllowed: "AR-001" } }, operations: new Map([[operation.name, { answer }]]) } as unknown as Project;
  const record: CallRecord = {
    journey: "set up a chart of accounts", step: "read the root", actor: "olga", person: "per_olga", operation: operation.name, payload: { id: "acc_root" },
    status: 200, body, trace: "t", parent: "p", mayCall: true, journal: [],
  };
  const trace: Evidence["trace"] = { spans: [{ traceId: "t", spanId: "s", parentSpanId: "p", name: operation.name, attrs, status: 1, ms: 1, start: 0 }], logs: [] };
  return Evals.judge(project, Evals.gather([record], new Map([["t", trace]]))).find((v) => v.eval === "answer shape")!.failures;
};

describe("answer shape: an optional answer field with no value (#1018)", () => {
  it("passes a root account whose answer and span have neither optional field", () => {
    expect(shape({ name: "Assets" })).toEqual([]);
  });

  it("passes an answer with one optional field and not the other", () => {
    expect(shape({ name: "Cash", parentAccount: "acc_root" })).toEqual([]);
  });

  it("control: passes an answer with both", () => {
    expect(shape({ name: "Bank", parentAccount: "acc_root", accountType: "Bank" })).toEqual([]);
  });

  it("still fails an optional field that is there with the wrong value, or null", () => {
    expect(shape({ name: "Bank", parentAccount: 7 }).join("\n")).toContain("answer.parentAccount");
    expect(shape({ name: "Bank", accountType: null }).join("\n")).toContain("answer.accountType");
  });

  it("still fails a required field that is missing", () => {
    expect(shape({ parentAccount: "acc_root" }).join("\n")).toContain("answer.name");
  });
});
