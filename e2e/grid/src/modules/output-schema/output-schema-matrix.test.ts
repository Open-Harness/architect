// The matrix in README.md, cell by cell: each planted red names its row and column (`R3 x B`). A cell that is `n/a` there has its reason in the README.
import { describe, expect, it } from "vitest";
import { evidenceOf } from "../project-evidence/testing.ts";
import type { OperationModel } from "../project-evidence/types.ts";
import { sampleOf } from "./internal/sample.ts";
import { OutputSchema } from "./service.ts";

const pluggedIn = await evidenceOf("plugged-in");
const acme = await evidenceOf("acme");
const envelope = { type: "object", properties: { refusal: { type: "string" }, code: { type: "string" }, exit: { type: "integer" }, status: { type: "integer" } }, required: ["refusal", "code", "exit", "status"] };
const digits = { type: "string", pattern: "^-?\\d+$" };

/** An acme operation that answers `{ status: "ok" }` and can refuse with `refusal`; the schema has the answer, every other refusal as the bare envelope, and `branch` for `refusal`. */
const refusing = (refusal: string, branch: (base: typeof envelope) => unknown, model = acme.model, thing = "allowance") => {
  const op = { ...acme.model.operations["system.health"]!, refusals: [refusal], thing, move: null } as OperationModel;
  const answer = { type: "object", properties: { status: { const: "ok" } }, required: ["status"] };
  const others = { ...envelope, properties: { ...envelope.properties, refusal: { type: "string", not: { const: refusal } } } };
  return OutputSchema.answers({ model, op, spans: [{ name: "system.health", attrs: { "answer.status": "ok" } }], files: acme.files, schema: { type: "object", anyOf: [answer, others, branch(envelope)] } });
};
const only = (refusal: string, extra: Record<string, unknown>, required: ReadonlyArray<string>) => (base: typeof envelope) => ({ ...base, properties: { ...base.properties, refusal: { const: refusal }, ...extra }, required: [...base.required, ...required] });

describe("R3 declared refusal, every caller: B and D", () => {
  it("R3 x B and D: `remaining` typed as anything takes every wrong kind", () => {
    const why = refusing("AllowanceExceeded", only("AllowanceExceeded", { remaining: {} }, ["remaining"]));
    expect(why).toEqual([`system.health's output schema accepts 1, 1.5, true, null, [], {"wrong":"type"} for the refusal field remaining, so its type is not the field's`].map((w) => w.replace("1, 1.5", '"not-a-number", "1.5", 1, 1.5')));
  });
  it("R3 x A, B, C: `remaining` typed as digits and required is green", () => {
    expect(refusing("AllowanceExceeded", only("AllowanceExceeded", { remaining: digits }, ["remaining"]))).toEqual([]);
  });
});

describe("R4 declared refusal, role-visible: B and D", () => {
  const allowance = acme.model.things["allowance"]!;
  const error = allowance.errors!["AllowanceExceeded"]!;
  const model = { ...acme.model, things: { ...acme.model.things, allowance: { ...allowance, errors: { ...allowance.errors, AllowanceExceeded: { ...error, fields: { ...error.fields, extra: { value: { type: "uint", bits: 32 }, optional: true, visibility: { private: ["allowance.grantee"] } } } } } } } };
  it("R4 x B and D: a role-private `extra` typed as anything takes every wrong kind", () => {
    const why = refusing("AllowanceExceeded", only("AllowanceExceeded", { remaining: digits, extra: {} }, ["remaining"]), model);
    expect(why).toHaveLength(1);
    expect(why[0]).toMatch(/accepts .* for the refusal field extra, so its type is not the field's$/);
  });
  it("R4 x C is n/a (a private field may be absent) and R4 x E holds: the public shape omits `extra` and is accepted", () => {
    expect(refusing("AllowanceExceeded", only("AllowanceExceeded", { remaining: digits, extra: digits }, ["remaining"]), model)).toEqual([]);
  });
});

describe("R5 refusal envelope: D", () => {
  it("R5 x D: `code` typed as anything takes every wrong kind", () => {
    const why = refusing("AllowanceExceeded", (base) => ({ ...base, properties: { ...base.properties, code: {} } }));
    expect(why[0]).toMatch(/accepts .* for the refusal field code, so its type is not the field's$/);
  });
});

describe("R6 wrong-state refusal (`state`) and R7 not-found (`id`)", () => {
  const withState = (extra: Record<string, unknown>, required: ReadonlyArray<string>) => refusing("AllowanceNotActive", only("AllowanceNotActive", extra, required), acme.model, "allowance");
  it("R6 x A: a branch typing and requiring `state` is green", () => {
    expect(withState({ state: { type: "string" } }, ["state"])).toEqual([]);
  });
  it("R6 x B and D: `state` typed as anything is red", () => {
    expect(withState({ state: {} }, ["state"])[0]).toMatch(/accepts .* for the refusal field state, so its type is not the field's$/);
  });
  it("R6 x C: `state` typed but not required is red", () => {
    expect(withState({ state: { type: "string" } }, [])).toEqual(["system.health's output schema does not require the refusal field state of AllowanceNotActive: a refusal without it is accepted"]);
  });
  it("R6 x A: every state the move does not start from is a real wrong-state refusal, and each must be accepted", () => {
    // allowance.spend starts from `active`; the machine's states are active, exhausted, revoked.
    const spend = { ...acme.model.operations["allowance.spend"]!, answer: acme.model.operations["system.health"]!.answer, refusals: ["AllowanceNotActive"] } as OperationModel;
    const answer = { type: "object", properties: { status: { const: "ok" } }, required: ["status"] };
    const others = { ...envelope, properties: { ...envelope.properties, refusal: { type: "string", not: { const: "AllowanceNotActive" } } } };
    const run = (state: unknown) => OutputSchema.answers({ model: acme.model, op: spend, spans: [{ name: "allowance.spend", attrs: { "answer.status": "ok" } }], files: acme.files, schema: { type: "object", anyOf: [answer, others, only("AllowanceNotActive", { state }, ["state"])(envelope)] } });
    expect(run({ enum: ["exhausted", "revoked"] })).toEqual([]);
    expect(run({ type: "string" })).toEqual([]);
    const pinned = run({ const: "active" });
    expect(pinned).toHaveLength(2);
    expect(pinned.every((w) => /refuses the refusal {"state":"(exhausted|revoked)","refusal":"AllowanceNotActive"/.test(w))).toBe(true);
    expect(run({ enum: ["revoked"] })).toHaveLength(1);
  });
  const notFound = acme.model.things["person"]!.notFound!.error;
  const withId = (extra: Record<string, unknown>, required: ReadonlyArray<string>) => refusing(notFound, only(notFound, extra, required), acme.model, "person");
  it("R7 x A: a branch typing and requiring `id` is green", () => {
    expect(withId({ id: { type: "string" } }, ["id"])).toEqual([]);
  });
  it("R7 x B and D: `id` typed as anything is red", () => {
    expect(withId({ id: {} }, ["id"])[0]).toMatch(/accepts .* for the refusal field id, so its type is not the field's$/);
  });
  it("R7 x C: `id` typed but not required is red", () => {
    expect(withId({ id: { type: "string" } }, [])).toEqual([`system.health's output schema does not require the refusal field id of ${notFound}: a refusal without it is accepted`]);
  });
});

describe("R8 answer state", () => {
  const moved = { ...pluggedIn.model.operations["handle.claim"]!, answer: { state: { value: { type: "text", max: 64 } } } } as OperationModel;
  const run = (state: unknown) => OutputSchema.states({ model: pluggedIn.model, op: moved, schema: { type: "object", anyOf: [{ type: "object", properties: { state }, required: ["state"] }, envelope] }, spans: [], files: pluggedIn.files, states: ["a", "b"] });
  it("R8 x A: the machine's states as an enum is green", () => {
    expect(run({ enum: ["a", "b"] })).toEqual([]);
  });
  it("R8 x B and D: a state typed as anything takes every wrong kind", () => {
    expect(run({})[0]).toMatch(/accepts .* as the state/);
  });
});

describe("every recorded answer, not the first: each span's fields kept together, deduped, capped", () => {
  const profile = pluggedIn.model.operations["profile.get"]!;
  const links = (n: number) => JSON.stringify(Array.from({ length: n }, (_, i) => ({ id: `lnk_${i}`, title: "t", url: "https://x.example" })));
  const span = (n: number) => ({ name: "profile.get", attrs: { "answer.handle": "hdl_abc", "answer.links": links(n) } });
  const items = { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, url: { type: "string" } }, required: ["id", "title", "url"] };
  const run = (linksSchema: unknown, spans: ReadonlyArray<{ name: string; attrs: Record<string, unknown> }>) => OutputSchema.answers({
    model: pluggedIn.model, op: profile, spans, files: pluggedIn.files,
    schema: { type: "object", anyOf: [{ type: "object", properties: { handle: { type: "string" }, links: linksSchema }, required: ["handle", "links"] }, envelope] },
  });

  it("the fixture's profile.get answers more than once, with different numbers of links", () => {
    const counts = pluggedIn.spans!.filter((s) => s.name === "profile.get" && s.attrs["answer.links"] !== undefined).map((s) => (JSON.parse(String(s.attrs["answer.links"])) as unknown[]).length);
    expect(new Set(counts).size).toBeGreaterThan(1);
  });
  it("red: links with maxItems 1 fits the first answer and refuses the three-link one", () => {
    expect(run({ type: "array", maxItems: 1, items }, [span(1), span(3)]).some((w) => /refuses its own answer/.test(w))).toBe(true);
    expect(OutputSchema.answers({ model: pluggedIn.model, op: profile, spans: pluggedIn.spans, files: pluggedIn.files, schema: { type: "object", anyOf: [{ type: "object", properties: { handle: { type: "string" }, links: { type: "array", maxItems: 1, items } }, required: ["handle", "links"] }, envelope] } }).some((w) => /refuses its own answer/.test(w))).toBe(true);
  });
  it("green: links with no limit accepts every answer, and so does the same many times over (identical answers once, at most 24)", () => {
    expect(run({ type: "array", items }, [span(1), span(3)])).toEqual([]);
    expect(run({ type: "array", items }, Array.from({ length: 60 }, (_, i) => span((i % 40) + 1)))).toEqual([]);
  });
  it("red: a const that matches only the first answer", () => {
    const health = acme.model.operations["system.health"]!;
    const answers = (status: unknown) => OutputSchema.answers({ model: acme.model, op: health, files: acme.files, spans: [{ name: "system.health", attrs: { "answer.status": "ok" } }, { name: "system.health", attrs: { "answer.status": "up" } }], schema: { type: "object", anyOf: [{ type: "object", properties: { status }, required: ["status"] }, envelope] } });
    expect(answers({ const: "ok" }).some((w) => /refuses its own answer {"status":"up"}/.test(w))).toBe(true);
    expect(answers({ enum: ["ok", "up"] })).toEqual([]);
  });
  it("red: items that differ in shape, the schema loose on the key only a later item has", () => {
    const two = { name: "profile.get", attrs: { "answer.handle": "hdl_abc", "answer.links": JSON.stringify([{ id: "a", title: "t", url: "u" }, { id: "b", title: "t", url: "u", note: "n" }]) } };
    const loose = { type: "array", items: { ...items, properties: { ...items.properties, note: {} } } };
    expect(run(loose, [two]).some((w) => /accepts .* for the answer field links/.test(w))).toBe(true);
  });
  it("states: a state is tried on every recorded answer, not the first (two answers differ, the schema fits only the first)", () => {
    const op = { ...pluggedIn.model.operations["handle.claim"]!, answer: { state: { value: { type: "text", max: 64 } }, kind: { value: { type: "schema" }, named: "Kind" } } } as OperationModel;
    const spans = ["a", "b"].map((kind) => ({ name: "handle.claim", attrs: { "answer.kind": kind } }));
    const run = (kind: unknown) => OutputSchema.states({ model: pluggedIn.model, op, spans, files: pluggedIn.files, states: ["x", "y"], schema: { type: "object", anyOf: [{ type: "object", properties: { state: { enum: ["x", "y"] }, kind }, required: ["state", "kind"] }, envelope] } });
    expect(run({ enum: ["a", "b"] })).toEqual([]);
    expect(run({ const: "a" }).length).toBeGreaterThan(0);
    expect(run({ const: "a" })[0]).toMatch(/refuses the answer with state "x"/);
  });

  it("a wrong-state refusal with no state outside the move's from has no sample (the first state is the move's own, so a schema pinned to another state is not wrong)", () => {
    // allowance.spend with a `from` that covers every state of the machine: the refusal can never be given.
    const states = acme.model.things["allowance"]!.machine!.states;
    const spend = { ...acme.model.operations["allowance.spend"]!, answer: acme.model.operations["system.health"]!.answer, refusals: ["AllowanceNotActive"], move: { ...acme.model.operations["allowance.spend"]!.move!, from: states } } as OperationModel;
    const answer = { type: "object", properties: { status: { const: "ok" } }, required: ["status"] };
    const run = (state: unknown, op = spend) => OutputSchema.answers({ model: acme.model, op, spans: [{ name: "allowance.spend", attrs: { "answer.status": "ok" } }], files: acme.files, schema: { type: "object", anyOf: [answer, { ...envelope, properties: { ...envelope.properties, refusal: { type: "string", not: { const: "AllowanceNotActive" } } } }, only("AllowanceNotActive", { state }, ["state"])(envelope)] } });
    expect(run({ const: "revoked" })).toEqual([]);
    // With a state outside `from`, the same schema is judged: spend starts from active only, so `exhausted` and `revoked` are real refusals.
    expect(run({ const: "revoked" }, { ...spend, move: { ...spend.move!, from: ["active"] } } as OperationModel).length).toBeGreaterThan(0);
  });

  it("the samples are every distinct recorded answer, at most 24", () => {
    const health = acme.model.operations["system.health"]!;
    const spans = (n: number) => Array.from({ length: n }, (_, i) => ({ name: "system.health", attrs: { "answer.status": `s${i}` } }));
    expect(sampleOf(health, spans(3))).toHaveLength(3);
    expect(sampleOf(health, [...spans(3), ...spans(3)])).toHaveLength(3);
    expect(sampleOf(health, spans(60))).toHaveLength(24);
    expect(sampleOf(health, [])).toHaveLength(1);
  });
});

describe("R1/R2 x B, C and D: a schema-typed answer field is probed from its recorded value's own shape", () => {
  const profile = pluggedIn.model.operations["profile.get"]!;
  const item = (url: unknown, required: ReadonlyArray<string> = ["id", "title", "url"]) => ({ type: "object", properties: { id: { type: "string" }, title: { type: "string" }, url }, required });
  const run = (links: unknown, handle: unknown = { type: "string" }) => OutputSchema.answers({
    model: pluggedIn.model, op: profile, spans: pluggedIn.spans, files: pluggedIn.files,
    schema: { type: "object", anyOf: [{ type: "object", properties: { handle, links }, required: ["handle", "links"] }, envelope] },
  });
  const array = (items: unknown) => ({ type: "array", items });

  it("green: links as an array of exact items", () => {
    expect(run(array(item({ type: "string" })))).toEqual([]);
  });
  it.each([
    ["links: {}", {}],
    ["links: { type: array } with no items", { type: "array" }],
    ["links: array of {}", array({})],
    ["an item's url: {}", array(item({}))],
    ["an item that does not require url", array(item({ type: "string" }, ["id", "title"]))],
    ["an item's url typed number or string", array(item({ type: ["string", "number"] }))],
  ])("red: %s", (_name, links) => {
    expect(run(links).length).toBeGreaterThan(0);
  });
  it("red: handle typed as any scalar", () => {
    expect(run(array(item({ type: "string" })), { type: ["string", "number", "boolean", "null"] }).length).toBeGreaterThan(0);
  });
});
