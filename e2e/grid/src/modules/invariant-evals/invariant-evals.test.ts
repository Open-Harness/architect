// The invariant row's model, api, server and sdk evals, over Plugged In as ST1.19 leaves it (fixtures/plugged-in-rules) and a wrong output planted one at a time.
// The same suite runs for every rule the model has; the three subjects are `handle.oneHolderPerName` (a refusal, scoped by a state), `handle.oneNamePerPerson` (the same, with its own
// description) and `profile.onePagePerHandle` (no refusal, no scope). The surfaces' evals (docs, mcp, portal, telemetry) are in `invariant-surfaces.test.ts`.
import { describe, expect, it } from "vitest";
import { editFile, judge, withoutProveLine } from "../project-evidence/testing.ts";
import { InvariantEvals } from "./service.ts";
import { standIn, withModel, withOperation, withRule, withText } from "./testing.ts";

const pluggedIn = await standIn();
const RULES = ["handle.oneHolderPerName", "handle.oneNamePerPerson", "profile.onePagePerHandle"];
const check = (cell: string, subject: string, e = pluggedIn) => judge(InvariantEvals.evals, `invariant.${cell}`, subject, e);
const why = (cell: string, subject: string, e = pluggedIn) => { const found = check(cell, subject, e); return found.ok ? [] : found.why; };
const has = (lines: ReadonlyArray<string>, text: string | RegExp) => lines.some((l) => (typeof text === "string" ? l.includes(text) : text.test(l)));

describe("Plugged In as ST1.19 leaves it (fixtures/plugged-in-rules)", () => {
  it("declares the three rules, and nothing else", () => {
    expect(Object.entries(pluggedIn.model.things).flatMap(([t, thing]) => Object.keys(thing.invariants ?? {}).map((n) => `${t}.${n}`)).sort()).toEqual(RULES);
  });
  it.each(["model", "api", "server", "sdk", "mcp", "docs", "portal", "telemetry"])("invariant.%s is green for every rule", (cell) => {
    for (const rule of RULES) expect({ rule, ...check(cell, rule) }).toEqual({ rule, ok: true, why: [] });
  });
  it("has no eval for invariant.cli: it is held off until a refused call can be seen through the CLI", () => {
    expect(check("cli", RULES[0]!)).toEqual({ ok: false, why: ["no eval for invariant.cli"] });
  });
  it("says a rule the model does not have is not one", () => {
    for (const cell of ["model", "api", "server", "sdk", "mcp", "docs", "portal", "telemetry"]) {
      expect(check(cell, "handle.noSuchRule"), cell).toEqual({ ok: false, why: ["the model has no rule handle.noSuchRule"] });
      expect(check(cell, "nothing.oneHolderPerName"), cell).toEqual({ ok: false, why: ["the model has no rule nothing.oneHolderPerName"] });
      expect(check(cell, "oneHolderPerName"), cell).toEqual({ ok: false, why: ["the model has no rule oneHolderPerName"] });
    }
  });
});

describe("invariant.model: what is read, against what is planted", () => {
  const r = "handle.oneHolderPerName";
  it("a kind that is not unique", () => { expect(has(why("model", r, withRule(pluggedIn, "handle", "oneHolderPerName", (x) => ({ ...x, kind: "bound" }))), 'its kind is "bound"')).toBe(true); });
  it("a key on no field, on a field the thing lacks, and on one field twice", () => {
    expect(has(why("model", r, withRule(pluggedIn, "handle", "oneHolderPerName", (x) => ({ ...x, fields: [] }))), "it keys on no field")).toBe(true);
    expect(has(why("model", r, withRule(pluggedIn, "handle", "oneHolderPerName", (x) => ({ ...x, fields: ["nickname"] }))), "nickname, which handle has no field of")).toBe(true);
    expect(has(why("model", r, withRule(pluggedIn, "handle", "oneHolderPerName", (x) => ({ ...x, fields: ["name", "name"] }))), "name twice")).toBe(true);
  });
  it("a scope in a state the machine lacks, and a scope on a thing with no machine", () => {
    expect(has(why("model", r, withRule(pluggedIn, "handle", "oneHolderPerName", (x) => ({ ...x, while: ["claimed", "lost"] }))), "lost, which is not a state")).toBe(true);
    expect(has(why("model", "profile.onePagePerHandle", withRule(pluggedIn, "profile", "onePagePerHandle", (x) => ({ ...x, while: ["claimed"] }))), "claimed, which is not a state")).toBe(true);
  });
  it("an empty description, and a description that is not words", () => {
    expect(has(why("model", "handle.oneNamePerPerson", withRule(pluggedIn, "handle", "oneNamePerPerson", (x) => ({ ...x, description: "  " }))), "description is empty")).toBe(true);
    expect(has(why("model", "handle.oneNamePerPerson", withRule(pluggedIn, "handle", "oneNamePerPerson", (x) => ({ ...x, description: 7 as never }))), "description is empty")).toBe(true);
  });
  it("a refusal the thing does not declare, and one that carries a field the key does not hold", () => {
    expect(has(why("model", r, withRule(pluggedIn, "handle", "oneHolderPerName", (x) => ({ ...x, refuse: "HandleGone" }))), "HandleGone, which handle does not declare")).toBe(true);
    const wide = withModel(pluggedIn, (m) => ({ ...m, things: { ...m.things, handle: { ...m.things["handle"]!, errors: { ...m.things["handle"]!.errors, HandleTaken: { ...m.things["handle"]!.errors!["HandleTaken"]!, fields: { owner: { value: { type: "string" } } } } } } } }));
    expect(has(why("model", r, wide), "HandleTaken carries owner, which is not one of the rule's key fields")).toBe(true);
  });
  it("a breaker that does not list the refusal, one whose handler could refuse it, and a refusal no operation can give", () => {
    expect(has(why("model", r, withOperation(pluggedIn, "handle.claim", (o) => ({ ...o, refusals: ["HandleAlreadyOwned", "NotAllowed"] }))), "does not list HandleTaken among its refusals")).toBe(true);
    expect(has(why("model", r, withOperation(pluggedIn, "handle.claim", (o) => ({ ...o, errors: ["HandleTaken"] }))), "lists HandleTaken among its errors")).toBe(true);
    expect(has(why("model", r, withOperation(pluggedIn, "handle.claim", (o) => ({ ...o, invariants: { HandleAlreadyOwned: "handle.oneNamePerPerson" } }))), "no operation in the model can break it")).toBe(true);
  });
  it("a rule that refuses nothing and is mapped by an operation", () => {
    const mapped = withOperation(pluggedIn, "link.add", (o) => ({ ...o, invariants: { LinkNeedsHandle: "profile.onePagePerHandle" } }));
    expect(has(why("model", "profile.onePagePerHandle", mapped), "link.add breaks a rule that refuses nothing")).toBe(true);
  });
  it("one error with two owners, and an operation that maps the refusal to another rule", () => {
    expect(has(why("model", r, withRule(pluggedIn, "handle", "oneNamePerPerson", (x) => ({ ...x, refuse: "HandleTaken" }))), "also handle.oneNamePerPerson's refusal")).toBe(true);
    expect(has(why("model", r, withOperation(pluggedIn, "handle.release", (o) => ({ ...o, invariants: { HandleTaken: "handle.oneNamePerPerson" } }))), "handle.release maps HandleTaken to handle.oneNamePerPerson, not to handle.oneHolderPerName")).toBe(true);
  });
});

describe("invariant.api: the refusal's class and each breaker's endpoint", () => {
  const claim = "generated/api/src/handle/claim.ts";
  it("a breaker's endpoint without the refusal", () => {
    expect(has(why("api", "handle.oneHolderPerName", withText(pluggedIn, claim, "error: [HandleTaken, ", "error: [")), "handle.claim's endpoint does not list HandleTaken")).toBe(true);
  });
  it("the same refusal written only in a comment is not listed", () => {
    expect(has(why("api", "handle.oneHolderPerName", withText(pluggedIn, claim, "error: [HandleTaken, ", "// error: [HandleTaken]\n  error: [")), "does not list HandleTaken")).toBe(true);
  });
  it("an endpoint that lists the refusal though no rule can be broken by that operation", () => {
    expect(has(why("api", "handle.oneHolderPerName", withText(pluggedIn, "generated/api/src/handle/release.ts", /error: \[/, "error: [HandleTaken, ")), "handle.release's endpoint lists HandleTaken")).toBe(true);
  });
  it("no class for the refusal, and no errors file", () => {
    expect(has(why("api", "handle.oneHolderPerName", withText(pluggedIn, "generated/api/src/errors.ts", /export class HandleTaken\b/, "export class HandleTakenX")), "errors.ts has no class HandleTaken")).toBe(true);
    expect(why("api", "handle.oneHolderPerName", editFile(pluggedIn, "generated/api/src/errors.ts", () => "")).length).toBeGreaterThan(0);
  });
  it("a rule that refuses nothing has nothing to list: green, and an extra endpoint entry for it is nobody's", () => {
    expect(why("api", "profile.onePagePerHandle")).toEqual([]);
  });
});

describe("invariant.server: the index, the mount, the served map and prove", () => {
  const sql = "generated/server/migrations/0001_things.sql";
  it("no index, an index on other columns, a wider scope, a narrower scope, a full table when the rule is scoped, a partial one when it is not", () => {
    expect(has(why("server", "handle.oneHolderPerName", withText(pluggedIn, sql, /CREATE UNIQUE INDEX "handle_oneHolderPerName"[^\n]*\n/, "")), 'no unique index "handle_oneHolderPerName"')).toBe(true);
    expect(has(why("server", "handle.oneHolderPerName", withText(pluggedIn, sql, 'ON "handle" ("name") WHERE', 'ON "handle" ("owner") WHERE')), 'is over ("owner"), the rule\'s key is ("name")')).toBe(true);
    expect(has(why("server", "handle.oneHolderPerName", withText(pluggedIn, sql, `("name") WHERE "state" IN ('claimed')`, `("name") WHERE "state" IN ('claimed', 'released')`)), "holds while claimed, released, the rule while claimed")).toBe(true);
    expect(has(why("server", "handle.oneHolderPerName", withText(pluggedIn, sql, `("name") WHERE "state" IN ('claimed')`, `("name")`)), "holds in every state")).toBe(true);
    expect(has(why("server", "profile.onePagePerHandle", withText(pluggedIn, sql, `ON "profile" ("handle");`, `ON "profile" ("handle") WHERE "state" IN ('x');`)), "is partial")).toBe(true);
  });
  it("an index on another table, and two indexes of one name", () => {
    expect(has(why("server", "handle.oneHolderPerName", withText(pluggedIn, sql, 'INDEX "handle_oneHolderPerName" ON "handle"', 'INDEX "handle_oneHolderPerName" ON "link"')), 'is on "link", not "handle"')).toBe(true);
    expect(has(why("server", "handle.oneHolderPerName", withText(pluggedIn, sql, /(CREATE UNIQUE INDEX "handle_oneHolderPerName"[^\n]*\n)/, "$1$1")), "2 indexes named")).toBe(true);
  });
  it("a server that does not mount the rules, serves a breaker without the map or with another rule's, or serves another operation as a breaker", () => {
    const main = "generated/server/main.ts";
    expect(has(why("server", "handle.oneHolderPerName", withText(pluggedIn, main, 'invariantsIn("handle",', 'invariantsIn("link",')), 'does not mount handle\'s rules')).toBe(true);
    expect(has(why("server", "handle.oneHolderPerName", withText(pluggedIn, main, 'HandleTaken: "handle.oneHolderPerName", ', "")), "not HandleTaken → handle.oneHolderPerName")).toBe(true);
    expect(has(why("server", "handle.oneHolderPerName", withText(pluggedIn, main, 'HandleTaken: "handle.oneHolderPerName"', 'HandleTaken: "handle.oneNamePerPerson"')), "not HandleTaken → handle.oneHolderPerName")).toBe(true);
    expect(has(why("server", "handle.oneHolderPerName", withText(pluggedIn, main, /(name: "handle\.release", [^\n]*?)codes:/, '$1invariants: { HandleTaken: "handle.oneHolderPerName" }, codes:')), "handle.release is served as breaking handle.oneHolderPerName")).toBe(true);
  });
  it("prove's declared-errors line for a breaker gone, no prove run, and no journey step that expects the refusal", () => {
    expect(has(why("server", "handle.oneHolderPerName", withoutProveLine(pluggedIn, "handle.claim declared errors")), 'prove did not report "handle.claim declared errors ✔"')).toBe(true);
    expect(why("server", "handle.oneHolderPerName", { ...pluggedIn, prove: undefined }).length).toBeGreaterThan(0);
    const bare = withModel(pluggedIn, (m) => ({ ...m, journeys: Object.fromEntries(Object.entries(m.journeys ?? {}).map(([k, j]) => [k, { ...j, steps: j.steps.map((s) => ({ ...s, checks: (s.checks ?? []).filter((c) => c.error !== "HandleTaken") })) }])) }));
    expect(has(why("server", "handle.oneHolderPerName", bare), "no journey step expects HandleTaken")).toBe(true);
  });
  it("a step that expects the refusal and failed in prove", () => {
    const failed = { ...pluggedIn, prove: { ...pluggedIn.prove!, journeys: pluggedIn.prove!.journeys.map((j) => ({ ...j, steps: j.steps.map((s) => (s.name === "a taken name is refused" ? { ...s, verdict: "fail" } : s)) })) } };
    expect(has(why("server", "handle.oneHolderPerName", failed), 'the step "a taken name is refused" of "a name is claimed once" is fail')).toBe(true);
  });
});

describe("invariant.sdk: the error channel of each call that breaks the rule", () => {
  it("an SDK that does not export the errors, a refusal that is not a tagged error, a call without the refusal, and a breaker the SDK lacks", () => {
    expect(has(why("sdk", "handle.oneHolderPerName", withText(pluggedIn, "generated/sdk/src/index.ts", 'export { Errors } from "../../api/src/index.ts";', "")), "does not export the errors")).toBe(true);
    expect(has(why("sdk", "handle.oneHolderPerName", withText(pluggedIn, "generated/api/src/errors.ts", /(export class HandleTaken extends )Schema\.TaggedError/, "$1Error")), "HandleTaken is not a tagged error")).toBe(true);
    expect(has(why("sdk", "handle.oneNamePerPerson", withText(pluggedIn, "generated/api/src/handle/claim.ts", /error: \[HandleTaken, HandleAlreadyOwned, /, "error: [HandleTaken, ")), "call does not have HandleAlreadyOwned in its error channel")).toBe(true);
    expect(has(why("sdk", "handle.oneHolderPerName", { ...pluggedIn, files: Object.fromEntries(Object.entries(pluggedIn.files).filter(([p]) => p !== "generated/sdk/src/handle/claim.ts")) }), "the SDK has no call for handle.claim")).toBe(true);
  });
  it("a rule that refuses nothing has no refusal in the SDK: green", () => {
    expect(why("sdk", "profile.onePagePerHandle")).toEqual([]);
  });
});
