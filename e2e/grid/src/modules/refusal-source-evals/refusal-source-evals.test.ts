// The error row's model, api, server and sdk evals over Plugged In's real model and outputs, and acme's. The same suite runs for every refusal
// the model has: the declared ones, a machine's wrong-state refusal, a thing's not-found, and the runtime's own `NotAllowed`.
import { describe, expect, it } from "vitest";
import { editFile, evidenceOf, judge } from "../project-evidence/testing.ts";
import { RefusalSourceEvals } from "./service.ts";

const pluggedIn = await evidenceOf("plugged-in");
const acme = await evidenceOf("acme");
const refusals = Object.keys(pluggedIn.model.refusals);
const check = (cell: string, subject: string, evidence = pluggedIn) => judge(RefusalSourceEvals.evals, `error.${cell}`, subject, evidence);

describe("Plugged In, as captured on 19 November 2026 (fixtures/plugged-in)", () => {
  it("has nine refusals, wrong-state, not-found and NotAllowed among them", () => {
    expect(refusals.sort()).toEqual(["HandleAlreadyOwned", "HandleNotClaimed", "HandleNotFound", "HandleTaken", "LinkAlreadyRemoved", "LinkNeedsHandle", "LinkNotListed", "NotAllowed", "ProfileNotFound"]);
  });

  it.each(["model", "api", "server", "sdk"])("error.%s is green for every refusal", (cell) => {
    for (const refusal of refusals) expect({ refusal, ...check(cell, refusal) }).toEqual({ refusal, ok: true, why: [] });
  });
});

describe("acme", () => {
  it("passes what its model, API and SDK say, for every refusal an operation gives", () => {
    const names = Object.keys(acme.model.refusals);
    expect(names.length).toBeGreaterThan(5);
    const given = (name: string) => Object.values(acme.model.operations).some((op) => (op.refusals ?? []).includes(name));
    for (const refusal of names.filter(given)) {
      for (const cell of ["model", "api", "sdk"]) expect({ refusal, cell, ...check(cell, refusal, acme) }).toEqual({ refusal, cell, ok: true, why: [] });
    }
  });
  it("is red for a refusal in its model that no operation gives (AllowanceNotFound), and says so", () => {
    expect(check("model", "AllowanceNotFound", acme).why).toEqual(["no operation in the model gives it"]);
  });
  it("is red on the server where no run was read", () => {
    expect(check("server", "AllowanceExceeded", acme).why).toEqual(["no prove run was read"]);
  });
});

describe("a wrong output is red, and says what", () => {
  it("a subject the model does not know", () => {
    expect(check("model", "Teapot")).toEqual({ ok: false, why: ["the model has no refusal Teapot"] });
  });

  it("model: a code that another refusal has, and a code in the wrong shape", () => {
    const dup = { ...pluggedIn, model: { ...pluggedIn.model, refusals: { ...pluggedIn.model.refusals, HandleTaken: "HN-002" } } };
    expect(check("model", "HandleTaken", dup).why).toEqual(["its code HN-002 is also HandleAlreadyOwned's"]);
    const shape = { ...pluggedIn, model: { ...pluggedIn.model, refusals: { ...pluggedIn.model.refusals, HandleTaken: "taken" } } };
    expect(check("model", "HandleTaken", shape).why).toEqual(["its code taken is not two letters, a dash and three digits"]);
  });

  it("api: a table row with another code, a class without its code literal, an endpoint that does not list it", () => {
    expect(check("api", "HandleTaken", editFile(pluggedIn, "generated/api/src/errors.ts", (t) => t.replace('HandleTaken: { code: "HN-001"', 'HandleTaken: { code: "HN-777"'))).why).toEqual(["the table says HN-777, the model says HN-001"]);
    expect(check("api", "HandleTaken", editFile(pluggedIn, "generated/api/src/errors.ts", (t) => t.replace("Schema.Literal(refusals.HandleTaken.code)", "Schema.String"))).why).toEqual(["HandleTaken's class does not carry its code as a literal"]);
    expect(check("api", "HandleTaken", editFile(pluggedIn, "generated/api/src/handle/claim.ts", (t) => t.replace("error: [HandleTaken, ", "error: ["))).why).toEqual(["handle.claim's endpoint does not list HandleTaken"]);
    expect(check("api", "HandleTaken", editFile(pluggedIn, "generated/api/src/errors.ts", (t) => t.replace(/^.*export const refusals[^]*?\n\} as const;/m, "export const refusals = {} as const;"))).why[0]).toBe("errors.ts's refusals table has no row for HandleTaken");
  });

  it("server: no journey step expects it, and a step that is not green", () => {
    const planted = { ...pluggedIn, model: { ...pluggedIn.model, journeys: Object.fromEntries(Object.entries(pluggedIn.model.journeys!).map(([k, j]) => [k, { ...j, steps: j.steps.map((s) => ({ ...s, checks: (s.checks ?? []).filter((c) => (c as { readonly error?: string }).error !== "HandleTaken") })) }])) } };
    expect(check("server", "HandleTaken", planted).why).toEqual(["no journey step expects HandleTaken, so the server was never seen to give it"]);
    const red = { ...pluggedIn, prove: { ...pluggedIn.prove!, journeys: pluggedIn.prove!.journeys.map((j) => ({ ...j, steps: j.steps.map((s) => (s.name === "a taken name is refused" ? { ...s, verdict: "fail" } : s)) })) } };
    expect(check("server", "HandleTaken", red).why).toContain('the step "a taken name is refused" of "a name is claimed once" is fail');
    expect(check("server", "HandleTaken", { ...pluggedIn, prove: undefined }).why).toEqual(["no prove run was read"]);
  });

  it("server: a wrong-state or not-found refusal is found by the journey's `<thing>.notFrom` and `<thing>.notFound` checks", () => {
    expect(check("server", "LinkNotListed")).toEqual({ ok: true, why: [] });
    expect(check("server", "ProfileNotFound")).toEqual({ ok: true, why: [] });
  });

  it("sdk: an SDK that does not export the errors, and a class that is not a tagged error", () => {
    expect(check("sdk", "HandleTaken", editFile(pluggedIn, "generated/sdk/src/index.ts", (t) => t.replace('export { Errors } from "../../api/src/index.ts";\n', ""))).why).toEqual(["the SDK does not export the errors"]);
    expect(check("sdk", "HandleTaken", editFile(pluggedIn, "generated/api/src/errors.ts", (t) => t.replace("extends Schema.TaggedError<HandleTaken>()", "extends Error"))).why).toEqual(["HandleTaken is not a tagged error with a static code"]);
  });
});
