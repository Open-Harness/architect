// The step row's evals over Plugged In's real model and outputs, and acme's. The same suite runs for every declared step the model has.
import { describe, expect, it } from "vitest";
import { editFile, editPortal, editSpans, evidenceOf, judge, withoutProveLine } from "../project-evidence/testing.ts";
import { StepEvals } from "./service.ts";

const pluggedIn = await evidenceOf("plugged-in");
const acme = await evidenceOf("acme");
const stepsOf = (e: typeof pluggedIn) => Object.values(e.model.operations).flatMap((op) => Object.values(op.steps ?? {}).map((s) => s.name));
const steps = stepsOf(pluggedIn);
const check = (cell: string, subject: string, evidence = pluggedIn) => judge(StepEvals.evals, `step.${cell}`, subject, evidence);

describe("Plugged In, as captured on 19 November 2026 (fixtures/plugged-in)", () => {
  it("declares ten steps", () => {
    expect(steps.length).toBe(10);
  });

  it.each(["model", "server", "sdk", "cli", "mcp", "docs", "portal", "telemetry"])("step.%s is green for every step", (cell) => {
    for (const step of steps) expect({ step, ...check(cell, step) }).toEqual({ step, ok: true, why: [] });
  });

  it("step.api is red for every step: each endpoint file exports a `steps` list that names them (generators render/internal/api)", () => {
    for (const step of steps) {
      const op = step.split(".").slice(0, 2).join(".");
      const [thing, verb] = op.split(".");
      expect(check("api", step).why, step).toEqual([`generated/api/src/${thing}/${verb}.ts names ${step}: the caller's contract must not carry a step`]);
    }
  });
});

describe("acme", () => {
  it("passes what its model and docs say, for every step it declares", () => {
    for (const step of stepsOf(acme)) for (const cell of ["model", "docs"]) expect({ step, cell, ...check(cell, step, acme) }).toEqual({ step, cell, ok: true, why: [] });
  });
});

describe("a wrong output is red, and says what", () => {
  const step = "link.add.record";

  it("a subject the model does not declare", () => {
    expect(check("model", "link.add.fly")).toEqual({ ok: false, why: ["the model has no step link.add.fly"] });
  });

  it("model: a step with no kind", () => {
    const add = pluggedIn.model.operations["link.add"]!;
    const broken = { ...pluggedIn, model: { ...pluggedIn.model, operations: { ...pluggedIn.model.operations, "link.add": { ...add, steps: { ...add.steps, record: { name: step, type: "" } } } } } };
    expect(check("model", step, broken).why).toEqual(["it has no kind"]);
  });

  it("server: prove did not tick the steps, and the step left no span", () => {
    expect(check("server", step, withoutProveLine(pluggedIn, "link.add steps")).why).toEqual(['prove did not report "link.add steps ✔"']);
    expect(check("server", step, editSpans(pluggedIn, (s) => s.filter((x) => x.name !== step))).why).toEqual([`no span named ${step}: the step did not run in a span of its own`]);
  });

  it("api, sdk, cli, mcp: a caller's output that names the step is red", () => {
    expect(check("sdk", step, editFile(pluggedIn, "generated/sdk/src/link/add.ts", (t) => `${t}// ${step}\n`)).why).toEqual(["generated/sdk/src/link/add.ts names link.add.record"]);
    expect(check("cli", step, { ...pluggedIn, cli: { ...pluggedIn.cli, "link add": `${pluggedIn.cli["link add"]}\n${step}` } }).why).toEqual(["`link add --help` names link.add.record"]);
    expect(check("mcp", step, { ...pluggedIn, mcp: pluggedIn.mcp!.map((t) => (t.name === "link.add" ? { ...t, description: `${t.description} (${step})` } : t)) }).why).toEqual(["the tool link.add names link.add.record"]);
    expect(check("cli", step, { ...pluggedIn, cli: Object.fromEntries(Object.keys(pluggedIn.cli).map((k) => [k, undefined])) }).why).toEqual(["the generated CLI's --help could not be run, so its text was not read"]);
  });

  it("docs: a steps list that lost the step or its kind", () => {
    expect(check("docs", step, editFile(pluggedIn, "generated/docs/link/add.md", (t) => t.replace("- `link.add.record` (database)\n", ""))).why).toEqual(["generated/docs/link/add.md's Steps does not list `link.add.record` (database)"]);
    expect(check("docs", step, editFile(pluggedIn, "generated/docs/link/add.md", (t) => t.replace("`link.add.record` (database)", "`link.add.record` (call)"))).why[0]).toMatch(/does not list/);
  });

  it("portal: only the docs the page embeds list the step", () => {
    const route = "/portal/operations/link.add";
    expect(check("portal", step, editPortal(pluggedIn, route, (h) => h.replace("<li>link.add.record (database)</li>", ""))).why).toEqual([`${route}'s Steps does not list link.add.record (database)`]);
  });

  it("telemetry: a step span of another kind", () => {
    expect(check("telemetry", step, editSpans(pluggedIn, (s) => s.map((x) => (x.name === step ? { ...x, attrs: { ...x.attrs, "step.kind": "call" } } : x)))).why).toEqual(["a link.add.record span has step.kind call, the model says database"]);
    expect(check("telemetry", step, editSpans(pluggedIn, (s) => s.filter((x) => x.name !== step))).why).toEqual([`no span named ${step}`]);
  });
});
