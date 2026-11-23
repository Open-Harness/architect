import { describe, expect, it } from "vitest";
import { Blueprint, type FieldsInput } from "orthograph";
import { traceable } from "orthograph/server";
import { Schema } from "effect";
import type { Model, OperationModel } from "@orthograph/compiler";
import type { CallRecord, Project } from "#modules/journeys/types.js";
import type { Evidence } from "./types.ts";
import { coverage, coverageSummary, performance } from "./internal/run.ts";
import { answerShape, declaredErrors, explainability, steps, whoMayCall } from "./internal/calls.ts";
import { Evals } from "./service.ts";

const op = {
  name: "allowance.grant", thing: "allowance", verb: "grant", answer: {}, payload: { organization: { value: { type: "id", prefix: "org" } } },
  move: null, errors: ["AllowanceLimitTooHigh"], refusals: ["AllowanceLimitTooHigh", "NotAllowed"],
  allowed: [{ kind: "role-of", role: "organization.owner", path: "organization" }], steps: {}, budget: { p95Ms: 200 },
} as unknown as OperationModel;

/** What a run knows of the project: the model's refusal codes, and the declarations an answer is checked against. */
const run = (refusals: Readonly<Record<string, string>> = {}) =>
  ({ project: { model: { refusals }, operations: new Map() } as never, all: [] });

const call = (over: Partial<CallRecord>): CallRecord => ({
  journey: "grant an allowance", step: "s", actor: "bob", person: "per_b", operation: "allowance.grant", payload: { organization: "org_1" },
  status: 200, body: {}, trace: "t", parent: "p", mayCall: true, journal: [], ...over,
});
const evidence = (ms: number, over: Partial<Evidence> = {}): Evidence => ({
  call: call({}), trace: { spans: [], logs: [] }, refusal: undefined, stored: undefined,
  opSpan: { traceId: "t", spanId: "s", parentSpanId: "p", name: "allowance.grant", attrs: {}, status: 1, ms, start: 0 }, ...over,
});

describe("evals on evidence", () => {
  it("performance: slow evidence raises a review and never fails", () => {
    const v = performance(op, [evidence(10), evidence(400)], undefined as never);
    expect(v.failures).toEqual([]);
    expect(v.notes).toEqual(["p50 10ms p95 400ms budget p95 200ms", "review: p95 400ms is over 1.5x budget"]);
  });

  it("declared errors: an undeclared refusal names itself and the declared ones", () => {
    const v = declaredErrors(op, [evidence(1, { refusal: "Boom" })], run());
    expect(v.failures).toEqual(['grant-an-allowance "s": refused with Boom, not one of AllowanceLimitTooHigh, NotAllowed']);
  });

  it("declared errors: every refusal answer carries the code the model fixed for it, beside its tag", () => {
    const refused = (body: unknown) => evidence(1, { refusal: "AllowanceLimitTooHigh", call: call({ status: 422, body }) });
    const codes = run({ AllowanceLimitTooHigh: "AL-003", NotAllowed: "AR-001" });
    expect(declaredErrors(op, [refused({ _tag: "AllowanceLimitTooHigh", code: "AL-003", cap: "1000" })], codes).failures).toEqual([]);
    expect(declaredErrors(op, [refused({ _tag: "AllowanceLimitTooHigh", cap: "1000" })], codes).failures).toEqual([
      'grant-an-allowance "s": AllowanceLimitTooHigh was answered with no code, and the model\'s code for it is AL-003',
    ]);
    expect(declaredErrors(op, [refused({ _tag: "AllowanceLimitTooHigh", code: "AL-009", cap: "1000" })], codes).failures[0]).toContain("with code AL-009");
  });

  it("who may call: judged on mayCall, not on what the server said", () => {
    const answered = whoMayCall(op, [evidence(1, { call: call({ mayCall: false }) })], undefined as never);
    expect(answered.failures[0]).toContain("caller bob (person per_b) lacks owner of organization org_1, and was answered, not refused");
    const refusedWrongly = whoMayCall(op, [evidence(1, { refusal: "NotAllowed", call: call({ status: 403 }) })], undefined as never);
    expect(refusedWrongly.failures[0]).toContain("was refused NotAllowed");
    expect(whoMayCall(op, [evidence(1, { refusal: "NotAllowed", call: call({ mayCall: false, status: 403 }) })], undefined as never).failures).toEqual([]);
  });

  it("steps: every declared step ran, in the order declared", () => {
    const two = { ...op, steps: { load: { name: "allowance.spend.load" }, record: { name: "allowance.spend.record" } } } as unknown as OperationModel;
    const span = (name: string, start: number) => ({ traceId: "t", spanId: name, parentSpanId: "s", name, attrs: {}, status: 1, ms: 1, start });
    const inOrder = evidence(1, { trace: { spans: [span("allowance.spend.load", 1), span("allowance.spend.record", 2)], logs: [] } });
    expect(steps(two, [inOrder], undefined as never).failures).toEqual([]);
    const backwards = evidence(1, { trace: { spans: [span("allowance.spend.load", 5), span("allowance.spend.record", 2)], logs: [] } });
    expect(steps(two, [backwards], undefined as never).failures).toEqual([
      'grant-an-allowance "s": step allowance.spend.record ran before allowance.spend.load, which is declared first',
    ]);
    const missing = evidence(1, { trace: { spans: [span("allowance.spend.load", 1)], logs: [] } });
    expect(steps(two, [missing], undefined as never).failures).toEqual(['grant-an-allowance "s": declared step allowance.spend.record ran no span']);
  });

  it("steps: an answered edit may skip save but must still run the other steps in order", () => {
    const edit = { ...op, name: "allowance.edit", steps: {
      load: { name: "allowance.edit.load", type: "database" },
      save: { name: "allowance.edit.save", type: "database", optional: true },
      verify: { name: "allowance.edit.verify", type: "database" },
    } };
    const observed = (names: ReadonlyArray<string>, over: Partial<Evidence> = {}) => evidence(1, {
      trace: { spans: names.map((step, start) => ({ traceId: "t", spanId: step, parentSpanId: "s", name: `allowance.edit.${step}`, attrs: {}, status: 1, ms: 1, start })), logs: [] },
      ...over,
    });
    const judge = (e: Evidence) => steps(edit, [e], run()).failures;

    expect(judge(observed(["load", "verify"]))).toEqual([]);
    expect(judge(observed(["load", "save", "verify"]))).toEqual([]);
    expect(judge(observed(["load", "verify", "save"]))[0]).toContain("step allowance.edit.verify ran before allowance.edit.save");
    expect(judge(observed(["load"]))[0]).toContain("declared step allowance.edit.verify ran no span");
    expect(judge(observed([], { call: call({ status: 422 }) }))).toEqual([]);
  });

  it("coverage: an operation no journey reaches fails on its own, and the run's line counts what was reached", () => {
    const rename = { ...op, name: "organization.rename", errors: [], refusals: ["NotAllowed"] } as unknown as OperationModel;
    const model = { operations: { "allowance.grant": op, "organization.rename": rename } } as unknown as Model;
    const all = [evidence(1, { refusal: "AllowanceLimitTooHigh" })];
    const run = { project: { model } as never, all };
    expect(coverage(op, all, run).failures).toEqual([]);
    expect(coverage(rename, [], run).failures).toEqual(["organization.rename reached by no journey"]);
    expect(coverageSummary(model, all).notes).toEqual(["moves 0/0 · outcomes 0/0 · refusals 1/1 · runtime refusals 0/2"]);
  });

  it("coverage: a rule's refusal is counted once for the rule, whichever operations break it, and an unreached rule is named by its full name", () => {
    const breaker = (name: string) => ({ ...op, name, errors: [], refusals: ["Taken", "NotAllowed"], invariants: { Taken: "handle.oneName" } }) as unknown as OperationModel;
    const claim = breaker("handle.claim");
    const rename = breaker("handle.rename");
    const model = { refusals: {}, operations: { "handle.claim": claim, "handle.rename": rename } } as unknown as Model;
    const reached = [evidence(1, { call: call({ operation: "handle.claim" }), refusal: "Taken", opSpan: { traceId: "t", spanId: "s", parentSpanId: "p", name: "handle.claim", attrs: { "refusal.invariant": "handle.oneName" }, status: 1, ms: 1, start: 0 } })];
    const both = { project: { model } as never, all: [...reached, evidence(1, { call: call({ operation: "handle.rename" }) })] };
    expect(coverageSummary(model, reached).notes[0], "one rule, two breakers: one in the denominator, and not in the runtime's").toBe("moves 0/0 · outcomes 0/0 · refusals 1/1 · runtime refusals 0/2");
    expect(coverage(claim, [], both).failures).toEqual([]);
    expect(coverage(rename, [], both).failures, "a breaker is covered by the rule's refusal from any journey").toEqual([]);
    const none = { project: { model } as never, all: [evidence(1, { call: call({ operation: "handle.claim" }) }), evidence(1, { call: call({ operation: "handle.rename" }) })] };
    expect(coverage(claim, [], none).failures).toEqual(["rule handle.oneName refused by no journey"]);
    expect(coverageSummary(model, none.all).notes[0]).toContain("refusals 0/1");
  });

  it("explainability: a rule's refusal needs a deciding log inside the operation's span and the rule's full name on the span, never in the log's text", () => {
    const claim = { ...op, name: "handle.claim", errors: [], refusals: ["Taken"], invariants: { Taken: "handle.oneName" } } as unknown as OperationModel;
    const refused = (logs: Evidence["trace"]["logs"], rule: string | null = "handle.oneName") => evidence(1, { refusal: "Taken", trace: { spans: [], logs }, opSpan: { traceId: "t", spanId: "s", parentSpanId: "p", name: "handle.claim", attrs: rule === null ? {} : { "refusal.invariant": rule }, status: 1, ms: 1, start: 0 } });
    const log = (spanId: string, body: string) => ({ traceId: "t", spanId, body, attrs: {} });
    const judge = (e: Evidence) => explainability(claim, [e], run()).failures;
    expect(judge(refused([log("s", "[redacted].oneName: another instance already holds this key")])), "a redacted log body passes").toEqual([]);
    expect(judge(refused([])), "no log").toEqual(["grant-an-allowance \"s\": Taken has no deciding log"]);
    expect(judge(refused([log("other", "x")])), "a log outside the span").toHaveLength(1);
    expect(judge(refused([log("s", "x")], "handle.otherRule"))[0], "the span names a different rule").toContain("names handle.otherRule on its span, not handle.oneName");
    expect(judge(refused([log("s", "x")], null))[0]).toContain("names no rule");
  });

  it("coverage: a runtime refusal no journey can cause (IdempotencyConflict) is not in the denominator, NotAllowed is, and the line says so", () => {
    const idempotent = { ...op, name: "allowance.spend", errors: [], refusals: ["NotAllowed", "IdempotencyConflict"] } as unknown as OperationModel;
    const plain = { ...op, name: "allowance.get", errors: [], refusals: ["NotAllowed"] } as unknown as OperationModel;
    const model = { refusals: { NotAllowed: "AR-001", IdempotencyConflict: "AR-002", AllowanceNotActive: "AL-900" }, operations: { "allowance.spend": idempotent, "allowance.get": plain } } as unknown as Model;
    const refused = [evidence(1, { refusal: "NotAllowed" })];
    const note = coverageSummary(model, refused).notes[0]!;
    expect(note, "two NotAllowed counted, the idempotent operation's IdempotencyConflict not").toContain("runtime refusals 0/2");
    expect(note).toContain("(not counted: IdempotencyConflict, which no journey can cause");
    const own = { ...idempotent, errors: ["IdempotencyConflict"] } as unknown as OperationModel;
    const declared = { ...model, operations: { "allowance.spend": own } } as unknown as Model;
    expect(coverageSummary(declared, refused).notes[0], "an operation that declares it in its own errors: it is its own to refuse, so nothing is left out").toBe("moves 0/0 · outcomes 0/0 · refusals 0/1 · runtime refusals 0/1");
    const without = { ...model, refusals: { NotAllowed: "AR-001" }, operations: { "allowance.get": plain } } as unknown as Model;
    expect(coverageSummary(without, []).notes[0], "nothing left out, nothing said").toBe("moves 0/0 · outcomes 0/0 · refusals 0/0 · runtime refusals 0/1");
  });
});

describe("answer shape: no secret reaches a span, a log or the journal", () => {
  const signIn = {
    name: "session.sign-in", thing: "session", verb: "sign-in", move: null, refusals: [], allowed: [{ kind: "anyone" }], steps: {}, budget: null,
    payload: { email: { value: { type: "text", max: 254 } }, password: { value: { type: "text", max: 128 }, visibility: "secret" } },
    answer: { session: { value: { type: "id", prefix: "ses" }, visibility: "secret" }, token: { value: { type: "text", max: 512 }, visibility: "secret" } },
  } as unknown as OperationModel;
  const declared = {
    operations: new Map([["session.sign-in", { answer: { session: Blueprint.visibility.secret(Blueprint.id("ses")), token: Blueprint.visibility.secret(Blueprint.text({ max: 512 })) } }]]),
  };
  const span = (attrs: Record<string, unknown>, name = "session.sign-in") => ({ traceId: "t", spanId: name, parentSpanId: "p", name, attrs, status: 1, ms: 1, start: 0 });
  const signedIn = (over: Partial<Evidence>): Evidence => ({
    ...evidence(1), call: call({ operation: "session.sign-in", payload: { email: "ada@acme.dev", password: "correct horse battery" }, body: { session: "ses_abc123", token: "tok_0123456789abcdef" } }), ...over,
  });
  const judge = (e: Evidence) => answerShape(signIn, [e], { project: declared as never, all: [] }).failures;

  it("passes a call without hidden values in its spans and logs", () => {
    expect(judge(signedIn({ trace: { spans: [span({ operation: "session.sign-in" })], logs: [] } }))).toEqual([]);
  });

  it("fails an attribute named for a secret field, without repeating the secret", () => {
    const failures = judge(signedIn({ trace: { spans: [span({ "payload.password": "x" })], logs: [] } }));
    expect(failures).toEqual(['grant-an-allowance "s": payload.password (not public) appears in span session.sign-in as the attribute payload.password']);
  });

  it("fails a secret value found in any span attribute, log line or log attribute", () => {
    const inSpan = judge(signedIn({ trace: { spans: [span({ note: "got tok_0123456789abcdef today" }, "session.sign-in.verify")], logs: [] } }));
    expect(inSpan).toEqual(['grant-an-allowance "s": answer.token (not public) appears in span session.sign-in.verify, attribute note']);
    const log = (body: string, attrs: Record<string, unknown> = {}) => ({ traceId: "t", spanId: "s", body, attrs });
    expect(judge(signedIn({ trace: { spans: [], logs: [log("signing in with correct horse battery")] } }))).toEqual(['grant-an-allowance "s": payload.password (not public) appears in a log line']);
    expect(judge(signedIn({ trace: { spans: [], logs: [log("ok", { who: "ses_abc123" })] } }))).toEqual(['grant-an-allowance "s": answer.session (not public) appears in a log attribute']);
  });

  it("lets a caller who is not shown a hidden answer field not receive it, but still requires every public field", () => {
    const open = {
      ...signIn, name: "locker.get",
      answer: { label: { value: { type: "text", max: 60 } }, note: { value: { type: "text", max: 60 }, visibility: { private: ["locker.owner"] } }, code: { value: { type: "text", max: 60 }, visibility: "secret" } },
    } as unknown as OperationModel;
    const project = { operations: new Map([["locker.get", { answer: { label: Blueprint.text({ max: 60 }), note: Blueprint.text({ max: 60 }), code: Blueprint.text({ max: 60 }) } }]]) };
    const run = (body: object) => answerShape(open, [{ ...evidence(1), call: call({ operation: "locker.get", body }) }], { project: project as never, all: [] }).failures;
    expect(run({ label: "tools" })).toEqual([]);                                      // private and secret left out for a stranger
    expect(run({ label: "tools", note: "mine", code: "c-1" })).toEqual([]);            // shown to the owner: present and fits
    expect(run({ label: "tools", note: "x".repeat(61) })[0]).toContain("answer.note"); // present, so still checked
    expect(run({ note: "mine" })[0]).toContain("answer.label");                        // a public field may never be missing
  });

  it("fails a secret value in a journal entry", () => {
    const journal = [{ event: "SignedIn", move: "m", subject: "s", fields: { token: "tok_0123456789abcdef" } }];
    expect(judge(signedIn({ call: call({ operation: "session.sign-in", payload: { password: "correct horse battery" }, body: { session: "ses_abc123", token: "tok_0123456789abcdef" }, journal }) }))).toEqual([
      'grant-an-allowance "s": answer.token (not public) appears in a journal entry',
    ]);
  });
});


/** A response and its real trace representation through the public evidence/judging interface; no service is substituted. */
const observed = (operation: OperationModel, answer: FieldsInput, body: unknown, status: number, attrs: Record<string, unknown>, declaration = { answer }, payload?: CallRecord["payload"]) => {
  const project = { model: { operations: { [operation.name]: operation }, refusals: { AllowanceLimitTooHigh: "AL-003", NotAllowed: "AR-001" } },
    operations: new Map([[operation.name, declaration]]) } as unknown as Project;
  const record = call({ body, status, operation: operation.name, ...(payload === undefined ? {} : { payload }) });
  const trace: Evidence["trace"] = { spans: [{ traceId: "t", spanId: "s", parentSpanId: "p", name: operation.name, attrs, status: 1, ms: 1, start: 0 }], logs: [] };
  return { project, evidence: Evals.gather([record], new Map([["t", trace]])) };
};
const judged = (seen: ReturnType<typeof observed>) => Evals.judge(seen.project, seen.evidence);
const shapeOf = (seen: ReturnType<typeof observed>) => judged(seen).find((v) => v.eval === "answer shape")!.failures;
const liveShapeOf = (seen: ReturnType<typeof observed>) => Evals.judgeLive(seen.project, seen.evidence).find((v) => v.eval === "answer shape")!.failures;
const schemaAnswer = { ...op, errors: [], refusals: [], answer: { value: { value: { type: "schema" } } } } as unknown as OperationModel;

describe("independent author: public evaluator response boundaries", () => {
  it("requires a known 4xx refusal's tag and exact model code, including a response whose tag is missing", () => {
    const errors = (body: unknown) => judged(observed(op, {}, body, 422, { refusal: "AllowanceLimitTooHigh" })).find((v) => v.eval === "declared errors")!.failures;
    expect(errors({ _tag: "AllowanceLimitTooHigh", code: "AL-003" })).toEqual([]);
    for (const body of [{}, { code: "AL-009" }, { _tag: "NotAllowed", code: "AR-001" }, null, "refused"]) expect(errors(body).length).toBeGreaterThan(0);
  });

  it("keeps schema-valued string literals as strings in observed responses and live spans", () => {
    for (const value of ["null", "{}", "[]"]) {
      const fields = { value: Blueprint.value(Schema.String) };
      expect(shapeOf(observed(schemaAnswer, fields, { value }, 200, { "answer.value": value }))).toEqual([]);
      expect(liveShapeOf(observed(schemaAnswer, fields, undefined, 200, { "answer.value": value }))).toEqual([]);
    }
  });

  it("does not use a valid body to bless a traceable field missing from partial answer telemetry", () => {
    const operation = { ...schemaAnswer, answer: { ...schemaAnswer.answer, other: { value: { type: "schema" } } } } as unknown as OperationModel;
    const fields = { value: Blueprint.value(Schema.String), other: Blueprint.value(Schema.String) };
    const body = { value: "null", other: "present" };
    expect(shapeOf(observed(operation, fields, body, 200, { "answer.value": "null", "answer.other": "present" }))).toEqual([]);
    for (const attrs of [{ "answer.other": "present" }, { "answer.value": "null" }]) expect(shapeOf(observed(operation, fields, body, 200, attrs)).length).toBeGreaterThan(0);
    // The existing all-attributes-absent response fallback stays; this correction does not rewrite observability policy.
    expect(shapeOf(observed(operation, fields, body, 200, {}))).toEqual([]);
  });

  it("checks untraced text in the response and accepts its absence from the span", () => {
    const operation = { ...schemaAnswer, answer: { ...schemaAnswer.answer, memo: { value: { type: "text", max: 200 } } } } as unknown as OperationModel;
    const fields = { value: Blueprint.value(Schema.String), memo: Blueprint.text() };
    const attrs = { "answer.value": "label" };
    expect(shapeOf(observed(operation, fields, { value: "label", memo: "private notes" }, 200, attrs))).toEqual([]);
    expect(shapeOf(observed(operation, fields, { value: "label", memo: 12 }, 200, attrs))[0]).toContain("answer.memo");
    expect(liveShapeOf(observed(operation, fields, undefined, 200, attrs))).toEqual([]);
  });

  it("flags untraced text in a child span or log but permits it in an event", () => {
    const memo = "customer's private notes";
    const memoOperation = { ...op, payload: { memo: { value: { type: "text", max: 200 } } } } as unknown as OperationModel;
    const project = { operations: new Map([[memoOperation.name, { payload: { memo: Blueprint.text() }, answer: {} }]]) } as unknown as Project;
    const recorded = call({ payload: { memo }, journal: [{ event: "Granted", move: "grant", subject: "alw_1", fields: { memo } }] });
    const seen = evidence(1, { call: recorded });
    const judge = (trace: Evidence["trace"]) => answerShape(memoOperation, [{ ...seen, trace }], { project, all: [] }).failures;
    const child = { ...seen.opSpan!, name: "allowance.grant.insert", spanId: "child", parentSpanId: "s" };
    expect(judge({ spans: [], logs: [] })).toEqual([]);
    expect(judge({ spans: [{ ...child, attrs: { "payload.memo": "x" } }], logs: [] })[0]).toContain("payload.memo (untraced text)");
    expect(judge({ spans: [{ ...child, attrs: { note: memo } }], logs: [] })[0]).toContain("payload.memo (untraced text)");
    expect(judge({ spans: [], logs: [{ traceId: "t", spanId: "child", body: "read memo", attrs: { memo } }] })[0]).toContain("(untraced text)");
  });

  it("permits framework metadata even if an untraced field has its name and value", () => {
    const operation = { ...op, payload: { operation: { value: { type: "text", max: 200 } }, memo: { value: { type: "text", max: 200 } } } } as unknown as OperationModel;
    const declaration = { payload: { operation: Blueprint.text(), memo: Blueprint.text() }, answer: {} };
    const project = { operations: new Map([[operation.name, declaration]]) } as unknown as Project;
    const seen = evidence(1, { call: call({ payload: { operation: operation.name, memo: "hi" } }) });
    const judge = (attrs: Record<string, unknown>) => answerShape(operation, [{ ...seen, trace: { spans: [{ ...seen.opSpan!, attrs }], logs: [] } }], { project, all: [] }).failures;
    expect(judge({ operation: operation.name })).toEqual([]);
    expect(judge({ operation: operation.name, memo: "hi" })[0]).toContain("memo (untraced text)");
    expect(judge({ "payload.operation": operation.name })[0]).toContain("payload.operation (untraced text)");
  });

  it("checks a list's projected items in live spans and its full items in responses", () => {
    const Account = Blueprint.thing({ description: "A ledger account.", fields: {
      id: Blueprint.id("acc"), memo: Blueprint.text(), label: Blueprint.traced(Blueprint.text()),
    } });
    const list = Blueprint.read(Account, { where: ["state"], order: "oldest", page: 2, allowed: [Blueprint.anyone] });
    const operation = { ...schemaAnswer, name: "account.list", payload: { state: { value: { type: "text", max: 64 } } },
      answer: { items: { value: { type: "schema" } }, next: { value: { type: "schema" } } } } as unknown as OperationModel;
    const seen = (items: ReadonlyArray<object>, body?: object, attrs: Record<string, unknown> = {}) => observed(operation, list.answer, body, 200, {
      "answer.items": JSON.stringify(items), "answer.next": "null", ...attrs,
    }, list, body === undefined ? undefined : { state: "published" });
    const item = { id: "acc_1", label: "expenses", state: "published" };
    const body = { items: [{ ...item, memo: "public answer" }], next: null };
    expect(traceable(list.payload["state"]!)).toBe(false);
    expect(liveShapeOf(seen([item]))).toEqual([]);
    expect(liveShapeOf(seen([{ ...item, id: "wrong_1" }]))[0]).toContain("answer.items");
    expect(liveShapeOf(seen([{ ...item, state: "x".repeat(65) }]))[0]).toContain("answer.items");
    expect(liveShapeOf(seen([{ ...item, memo: "omitted from telemetry" }]))[0]).toContain("answer.items");
    expect(shapeOf(seen([item], body))).toEqual([]);
    expect(shapeOf(seen([item], body, { "payload.state": "published" }))[0]).toContain("payload.state (untraced text)");
    expect(shapeOf(seen([{ ...item, detail: { text: "published" } }], body))[0]).toContain("payload.state (untraced text)");
    expect(shapeOf(seen([item], { ...body, items: [{ ...body.items[0]!, state: "different" }] }))[0]).toContain("payload.state (untraced text)");
    expect(shapeOf(seen([item], { items: [item], next: null }))[0]).toContain("answer.items");
  });

  it("decodes legitimate encoded objects and lists only when the observed response is unavailable", () => {
    const cases = [
      { fields: { value: Blueprint.value(Schema.Struct({ count: Schema.Number })) }, value: { count: 1 } },
      { fields: { value: Blueprint.value(Schema.Array(Schema.Number)) }, value: [1, 2] },
    ];
    for (const { fields, value } of cases) {
      const encoded = JSON.stringify(value);
      expect(shapeOf(observed(schemaAnswer, fields, { value }, 200, { "answer.value": encoded }))).toEqual([]);
      expect(liveShapeOf(observed(schemaAnswer, fields, undefined, 200, { "answer.value": encoded }))).toEqual([]);
      expect(shapeOf(observed(schemaAnswer, fields, { value: encoded }, 200, { "answer.value": encoded })).length).toBeGreaterThan(0);
      for (const body of [null, [], "not an object"]) expect(shapeOf(observed(schemaAnswer, fields, body, 200, { "answer.value": encoded })).length).toBeGreaterThan(0);
    }
  });
});

describe("answer shape: a list read whose items are cut for the caller (M1.35)", () => {
  const Org = Blueprint.thing({ description: "A group.", fields: { id: Blueprint.id("org") } });
  const owner = Blueprint.role(Org, { rule: () => true });
  const Account = Blueprint.thing({ description: "A ledger account.", fields: {
    id: Blueprint.id("acc"), label: Blueprint.traced(Blueprint.text()), memo: Blueprint.visibility.private(Blueprint.text(), owner),
  } });
  const list = Blueprint.read(Account, { where: ["state"], order: "oldest", page: 2, allowed: [Blueprint.anyone] });
  const operation = { ...schemaAnswer, name: "account.list", payload: { state: { value: { type: "text", max: 64 } } },
    answer: { items: { value: { type: "schema" } }, next: { value: { type: "schema" } } } } as unknown as OperationModel;
  const answered = (items: ReadonlyArray<object>) => observed(operation, list.answer, { items, next: null }, 200,
    { "answer.items": JSON.stringify(items), "answer.next": "null" }, list, { state: "published" });
  const item = { id: "acc_1", label: "expenses", state: "published" };

  it("passes items that lost a private field for this caller, and items that kept it", () => {
    expect(shapeOf(answered([item])), "the stranger is not shown memo: the items arrive without it").toEqual([]);
    expect(shapeOf(answered([{ ...item, memo: "for the owner" }])), "the owner is shown it").toEqual([]);
  });

  it("still fails an item that is missing a public field, or whose private field is present but malformed", () => {
    expect(shapeOf(answered([{ id: "acc_1", state: "published" }]))[0]).toContain("answer.items");
    expect(shapeOf(answered([{ ...item, memo: 42 }]))[0]).toContain("answer.items");
  });
});
