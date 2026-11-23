// An output schema is run, not looked at: the MCP SDK's own validator must accept the operation's answer and its refusals and refuse what is neither.
// The schemas below are planted: the one PR #153 shipped (a refusal's fields spread over the answer's, so an answer field named `status` became an
// integer), one that accepts anything, one that leaves the refusal out, and a correct `anyOf: [answer, refusal]`.
import { describe, expect, it } from "vitest";
import { evidenceOf } from "../project-evidence/testing.ts";
import type { OperationModel } from "../project-evidence/types.ts";
import { OutputSchema } from "./service.ts";

const pluggedIn = await evidenceOf("plugged-in");
const acme = await evidenceOf("acme");

const refusalBranch = { type: "object", properties: { refusal: { type: "string" }, code: { type: "string" }, exit: { type: "integer" }, status: { type: "integer" } }, required: ["refusal", "code", "exit", "status"] };

// Acme's system.health answers `{ status: "ok" }`; acme has no captured run, so the run's own value is supplied as the span would carry it.
const health = acme.model.operations["system.health"]!;
const healthSpans = [{ name: "system.health", attrs: { "answer.status": "ok" } }];
const onHealth = (schema: unknown, spans: ReadonlyArray<{ name: string; attrs: Record<string, unknown> }> | undefined = healthSpans) => OutputSchema.answers({ model: acme.model, op: health, schema, spans, files: acme.files });

/** What #153's output.ts built: the refusal's four properties spread over the answer's, so the later `status: integer` wins. */
const spreadOverAnswer = {
  type: "object", additionalProperties: true,
  properties: { ...{ status: { const: "ok" } }, ...refusalBranch.properties },
  anyOf: [{ required: ["status"] }, { required: ["refusal", "code", "exit", "status"] }],
};

describe("the false green of #153: a refusal's fields spread over an answer field named status", () => {
  it("is red: the answer { status: ok } fails its own schema", () => {
    const why = onHealth(spreadOverAnswer);
    expect(why[0]).toMatch(/^system\.health's output schema refuses its own answer {"status":"ok"}, so the SDK client rejects every successful call/);
  });

  it("is red even with no value from the run: a value is never taken from the schema being judged", () => {
    expect(onHealth(spreadOverAnswer, [])[0]).toEqual("system.health's answer field status has no recorded value (the run's span carries none and the model does not say one), so the schema cannot be shown to accept it");
  });

  it("is green as anyOf [answer, refusal]", () => {
    const right = { type: "object", anyOf: [{ type: "object", properties: { status: { const: "ok" } }, required: ["status"], additionalProperties: true }, refusalBranch] };
    expect(onHealth(right)).toEqual([]);
  });

  it("with no value from the run the field is unjudged, whatever the schema says: a sample never comes from the schema being judged", () => {
    const unjudged = ["system.health's answer field status has no recorded value (the run's span carries none and the model does not say one), so the schema cannot be shown to accept it"];
    const branch = (status: unknown) => ({ type: "object", anyOf: [{ type: "object", properties: { status }, required: ["status"] }, refusalBranch] });
    expect(onHealth(branch({ const: "ok" }), [])).toEqual(unjudged);
    expect(onHealth(branch({ const: "broken" }), [])).toEqual(unjudged);
  });
  it("red: an answer branch whose status is const \"broken\" refuses the real answer { status: ok }", () => {
    const wrong = { type: "object", anyOf: [{ type: "object", properties: { status: { const: "broken" } }, required: ["status"] }, refusalBranch] };
    expect(onHealth(wrong)[0]).toMatch(/refuses its own answer {"status":"ok"}/);
  });

  it("is red when the refusal branch pins the status to 400: the runtime's rows are 403, 404, 409 and 422", () => {
    const pinned = { type: "object", anyOf: [{ type: "object", properties: { status: { const: "ok" } }, required: ["status"] }, { ...refusalBranch, properties: { ...refusalBranch.properties, status: { const: 400 } } }] };
    expect(onHealth(pinned)).toEqual([`system.health's output schema refuses the refusal {"refusal":"NotAllowed","code":"AR-001","exit":3,"status":403}, so the SDK client rejects every refused call`]);
  });
});

describe("a schema that accepts anything is red", () => {
  it.each([["{}", {}], ["an object with no properties", { type: "object" }]])("%s", (_name, schema) => {
    expect(onHealth(schema)).toEqual(["system.health's output schema accepts {}, which is neither an answer nor a refusal, so it tells an agent nothing about what it gets back"]);
  });
});

describe("Plugged In's tools, with the output schema M1.42 emits (captured from #153's head on 20 November 2026)", () => {
  const claim = pluggedIn.model.operations["handle.claim"]!;
  const onClaim = (schema: unknown, op: OperationModel = claim) => OutputSchema.answers({ model: pluggedIn.model, op, schema, spans: pluggedIn.spans, files: pluggedIn.files });
  const emitted = (answer: Record<string, unknown>, required: ReadonlyArray<string>) => ({
    type: "object", additionalProperties: true, properties: { ...answer, ...refusalBranch.properties }, anyOf: [{ required }, { required: ["refusal", "code", "exit", "status"] }],
  });

  it("handle.claim's schema is green: it accepts { handle: hdl_… } and each refusal, refuses {}", () => {
    expect(onClaim(emitted({ handle: { type: "string" } }, ["handle"]))).toEqual([]);
  });

  it("profile.get's schema is green with a link list the model does not spell out", () => {
    const links = { type: "array", items: { type: "object", properties: { id: { type: "string" }, title: { type: "string", minLength: 1 }, url: { type: "string" } }, required: ["id", "title", "url"] } };
    expect(OutputSchema.answers({ model: pluggedIn.model, op: pluggedIn.model.operations["profile.get"]!, schema: emitted({ handle: { type: "string" }, links }, ["handle", "links"]), spans: pluggedIn.spans, files: pluggedIn.files })).toEqual([]);
  });

  it("an answer field typed as an integer is red", () => {
    expect(onClaim(emitted({ handle: { type: "integer" } }, ["handle"]))[0]).toMatch(/^handle\.claim's output schema refuses its own answer {"handle":"hdl_/);
  });

  it("an answer field that takes anything is red: its type is not the field's", () => {
    expect(onClaim(emitted({ handle: {} }, ["handle"]))).toEqual(["handle.claim's output schema accepts 1, 1.5, true, null, [], {\"wrong\":\"type\"} for the answer field handle, so its type is not the field's"]);
  });

  it("a schema with no branch for a refusal is red, naming the refusal", () => {
    const why = onClaim({ type: "object", properties: { handle: { type: "string" } }, required: ["handle"] });
    expect(why.length).toBeGreaterThan(claim.refusals!.length);
    expect(why.some((w) => w.includes("HandleNotClaimed"))).toBe(true);
    expect(why[0]).toBe(`handle.claim's output schema refuses the refusal {"refusal":"HandleTaken","code":"HN-001","exit":10,"status":422}, so the SDK client rejects every refused call`);
    expect(why.every((w) => w.includes("refuses the refusal"))).toBe(true);
  });

  it("a tool whose answer has no fields needs no schema", () => {
    expect(OutputSchema.answers({ model: pluggedIn.model, op: pluggedIn.model.operations["handle.release"]!, schema: undefined })).toEqual([]);
  });
});

describe("a state an answer carries", () => {
  const moved = { ...pluggedIn.model.operations["link.add"]!, answer: { link: pluggedIn.model.operations["link.add"]!.answer["link"]!, state: { value: { type: "schema" }, named: "LinkState" } } } as OperationModel;
  const states = ["listed", "removed"];
  const run = (schema: unknown) => OutputSchema.states({ model: pluggedIn.model, op: moved, schema, spans: pluggedIn.spans, files: pluggedIn.files, states });
  const shape = (state: unknown) => ({ type: "object", properties: { link: { type: "string" }, state }, required: ["link", "state"] });

  it("the machine's states as an enum is green", () => {
    expect(run(shape({ enum: states }))).toEqual([]);
  });
  it("a state typed as any string is red", () => {
    expect(run(shape({ type: "string" }))).toEqual([`link.add's output schema accepts "not-a-state" as the state, so it does not type it as the machine's states`]);
  });
  it("an enum that leaves a state out is red", () => {
    expect(run(shape({ enum: ["listed"] }))).toEqual([`link.add's output schema refuses the answer with state "removed", which the machine declares`]);
  });
});

describe("a number is judged from the model's type, never from the schema", () => {
  const count = { ...pluggedIn.model.operations["handle.claim"]!, answer: { count: { value: { type: "uint", bits: 32 } } } } as OperationModel;
  const run = (schema: unknown) => OutputSchema.answers({ model: pluggedIn.model, op: count, schema, spans: [], files: pluggedIn.files });
  const withRefusal = (count: unknown) => ({ type: "object", anyOf: [{ type: "object", properties: { count }, required: ["count"] }, refusalBranch] });

  it("red: a uint typed as any string, with no span", () => {
    expect(run(withRefusal({ type: "string" }))).toEqual([`handle.claim's output schema accepts "not-a-number", "1.5" for the answer field count, so its type is not the field's`]);
  });
  it("red: a uint typed as an integer, since the wire carries its digits as text", () => {
    expect(run(withRefusal({ type: "integer" }))[0]).toMatch(/^handle\.claim's output schema refuses its own answer {"count":"1"}/);
  });
  it("green: a uint typed as digits", () => {
    expect(run(withRefusal({ type: "string", pattern: "^-?\\d+$" }))).toEqual([]);
  });
  it("a field the model does not determine and the run did not record is unjudged, never filled in from the schema", () => {
    const opaque = { ...count, answer: { links: { value: { type: "schema" }, named: "Links" } } } as OperationModel;
    expect(OutputSchema.answers({ model: pluggedIn.model, op: opaque, schema: withRefusal({}), spans: [], files: pluggedIn.files })[0]).toMatch(/^handle\.claim's answer field links has no recorded value/);
  });
  it("states: a required field with no value makes the state unjudged, not every state refused", () => {
    const moved = { ...count, answer: { links: { value: { type: "schema" }, named: "Links" }, state: { value: { type: "schema" }, named: "S" } } } as OperationModel;
    expect(OutputSchema.states({ model: pluggedIn.model, op: moved, schema: {}, spans: [], files: pluggedIn.files, states: ["a"] })).toEqual(["handle.claim's answer field links has no recorded value (the run's span carries none and the model does not say one), so the schema cannot be shown to accept it"]);
  });
});

describe("an optional public field is judged too", () => {
  const claim = pluggedIn.model.operations["handle.claim"]!;
  const note = { ...claim, answer: { handle: claim.answer["handle"]!, note: { value: { type: "text", max: 80 }, optional: true } } } as OperationModel;
  const run = (schema: unknown, spans: ReadonlyArray<{ name: string; attrs: Record<string, unknown> }> = []) => OutputSchema.answers({ model: pluggedIn.model, op: note, schema, spans, files: pluggedIn.files });
  const withNote = (type: unknown) => ({ type: "object", anyOf: [{ type: "object", properties: { handle: { type: "string" }, note: type }, required: ["handle"] }, refusalBranch] });

  it("red: an optional text typed integer", () => {
    expect(run(withNote({ type: "integer" }))[0]).toMatch(/^handle\.claim's output schema refuses its own answer {"handle":"hdl_abc123","note":"x"}/);
  });
  it("red: an optional text that takes anything", () => {
    expect(run(withNote({}))).toEqual(["handle.claim's output schema accepts 1, 1.5, true, null, [], {\"wrong\":\"type\"} for the answer field note, so its type is not the field's"]);
  });
  it("green: an optional text typed string", () => {
    expect(run(withNote({ type: "string" }))).toEqual([]);
  });
  it("a text that looks like JSON is still text: a recorded \"{}\" is not read back as an object", () => {
    const spans = [{ name: "handle.claim", attrs: { "answer.note": "{}" } }];
    expect(run(withNote({ type: "string" }), spans)).toEqual([]);
  });
});

describe("a field private to roles is judged too, and a secret is not", () => {
  const claim = pluggedIn.model.operations["handle.claim"]!;
  const field = (visibility: unknown) => ({ value: { type: "text", max: 80 }, visibility });
  const withField = (visibility: unknown) => ({ ...claim, answer: { handle: claim.answer["handle"]!, note: field(visibility) } }) as OperationModel;
  const run = (op: OperationModel, schema: unknown) => OutputSchema.answers({ model: pluggedIn.model, op, schema, spans: [], files: pluggedIn.files });
  const schemaWith = (note: unknown) => ({ type: "object", anyOf: [{ type: "object", properties: { handle: { type: "string" }, ...(note === undefined ? {} : { note }) }, required: ["handle"] }, refusalBranch] });
  const priv = { private: ["linkOwner"] };

  it("red: a role-private text typed integer", () => {
    expect(run(withField(priv), schemaWith({ type: "integer" }))[0]).toMatch(/^handle\.claim's output schema refuses its own answer {"handle":"hdl_abc123","note":"x"}/);
  });
  it("green: a role-private text typed string", () => {
    expect(run(withField(priv), schemaWith({ type: "string" }))).toEqual([]);
  });
  it("a secret is not in any sample: the schema need not name it, and a wrong type for it is not judged", () => {
    expect(run(withField("secret"), schemaWith(undefined))).toEqual([]);
    expect(run(withField("secret"), schemaWith({ type: "integer" }))).toEqual([]);
  });
});

describe("a refusal carries its declared public fields", () => {
  const exceeding = { ...health, refusals: ["AllowanceExceeded"] } as OperationModel;
  const answer = { type: "object", properties: { status: { const: "ok" } }, required: ["status"] };
  /** The refusal branches: every other refusal as the envelope alone, and the named one with the branch under test. */
  const others = (name: string) => ({ ...refusalBranch, properties: { ...refusalBranch.properties, refusal: { type: "string", not: { const: name } } } });
  const only = (name: string, extra: Record<string, unknown>) => ({ ...refusalBranch, properties: { ...refusalBranch.properties, ...extra, refusal: { const: name } }, required: [...refusalBranch.required, ...Object.keys(extra)] });
  const run = (refusal: unknown) => OutputSchema.answers({ model: acme.model, op: exceeding, schema: { type: "object", anyOf: [answer, others("AllowanceExceeded"), refusal] }, spans: healthSpans, files: acme.files });
  const row = (remaining: unknown) => only("AllowanceExceeded", { remaining });

  it("green: a refusal branch that correctly requires `remaining` (a uint, as its digits)", () => {
    expect(run(row({ type: "string", pattern: "^-?\\d+$" }))).toEqual([]);
  });
  it("red: a refusal branch that types `remaining` as an integer refuses the real refusal", () => {
    expect(run(row({ type: "integer" })).some((w) => /refuses the refusal {"remaining":"1","refusal":"AllowanceExceeded","code":"AL-001","exit":41,"status":422}/.test(w))).toBe(true);
  });
  it("the machine's wrong-state refusal carries its state", () => {
    const moving = { ...health, refusals: [], move: { key: "x", from: ["a"], to: ["b"], emits: "E" }, thing: "allowance" } as OperationModel;
    const strict = only("AllowanceNotActive", { state: { type: "string" } });
    expect(OutputSchema.answers({ model: acme.model, op: moving, schema: { type: "object", anyOf: [answer, others("AllowanceNotActive"), strict] }, spans: healthSpans, files: acme.files })).toEqual([]);
  });
});

describe("a text with a constraint the model does not record is unjudged without a recorded value", () => {
  const email = { ...health, answer: { email: { value: { type: "text", max: 254 } } } } as OperationModel;
  const schema = { type: "object", anyOf: [{ type: "object", properties: { email: { type: "string", pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" } }, required: ["email"] }, refusalBranch] };
  it("no value: unjudged, not red for an \"x\" that cannot occur", () => {
    expect(OutputSchema.answers({ model: acme.model, op: email, schema, spans: [], files: acme.files })).toEqual(["system.health's answer field email has no recorded value (the run's span carries none and the model does not say one), so the schema cannot be shown to accept it"]);
  });
  it("a recorded value is judged", () => {
    expect(OutputSchema.answers({ model: acme.model, op: email, schema, spans: [{ name: "system.health", attrs: { "answer.email": "a@b.co" } }], files: acme.files })).toEqual([]);
  });
});
