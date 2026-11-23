// Which rows a journey touches, read from acme's own compiled model (captured) and a prove report line.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Grid } from "../grid/service.ts";
import { Touches } from "./service.ts";
import type { TouchModel } from "./types.ts";

const model = JSON.parse((JSON.parse(readFileSync(join(import.meta.dirname, "../../../fixtures/acme/files.json"), "utf8")) as Record<string, string>)["generated/model/model.json"]!) as TouchModel;
const ok = (journey: string, steps = 3) => [`journey ${journey} ✔ ${steps}/${steps} steps`, "allowance.get answer shape ✔"];

describe("a green journey", () => {
  const touched = Touches.of({ model, journey: "revoke then spend", report: ok("revoke then spend") });

  it("touches the operations, things, machine, events, refusals, steps and roles it used", () => {
    expect(touched.green).toBe(true);
    const rows = touched.rows.map((r) => `${r.block}:${r.subject}`);
    expect(rows).toEqual(expect.arrayContaining([
      "journey:revoke then spend",
      "operation:allowance.revoke", "operation:allowance.spend",
      "thing:allowance", "machine:allowance",
      "event:AllowanceRevoked", "event:AllowanceSpent",
      "step:allowance.revoke.update", "step:allowance.spend.load", "step:allowance.spend.record",
      "roles:organization.owner", "roles:allowance.grantee",
    ]));
  });

  it("touches what its starting worlds make, walking the ancestry: funded grants (allowance.grant), founded creates (organization.create)", () => {
    const rows = touched.rows.map((r) => `${r.block}:${r.subject}`);
    expect(rows).toEqual(expect.arrayContaining(["operation:allowance.grant", "operation:organization.create", "thing:organization", "event:AllowanceGranted", "event:OrganizationCreated"]));
  });

  it("does not touch what neither the world nor the steps use, and survives a world that grows from itself", () => {
    expect(touched.rows.map((r) => `${r.block}:${r.subject}`)).not.toContain("operation:invitation.send");
    const loop = { ...model, startingWorlds: { ...model.startingWorlds, founded: { ...model.startingWorlds!["founded"]!, from: "funded" } } } as TouchModel;
    expect(Touches.of({ model: loop, journey: "revoke then spend", report: ok("revoke then spend") }).green).toBe(true);
  });

  it("names a refusal the journey proves, resolving the machine's own and the built-in one", () => {
    const errors = touched.rows.filter((r) => r.block === "error").map((r) => r.subject);
    expect(errors).toEqual(["AllowanceNotActive", "NotAllowed"]);
  });

  it("lists each row once, in a stable order", () => {
    const keys = touched.rows.map((r) => `${r.block}:${r.subject}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual([...keys].sort((a, b) => a.split(":")[0]!.localeCompare(b.split(":")[0]!) || a.localeCompare(b)));
    expect(Touches.of({ model, journey: "revoke then spend", report: ok("revoke then spend") })).toEqual(touched);
  });

  it("touches the declared refusal of a data-dependent step, by its own name", () => {
    const spend = Touches.of({ model, journey: "spend within an allowance", report: ok("spend within an allowance", 4) });
    expect(spend.rows).toContainEqual({ block: "error", subject: "AllowanceExceeded" });
  });
});

describe("the shapes the compiler really writes", () => {
  const person = { ...model.operations["person.sign-up"]! };
  it("resolves a thing's not-found refusal to its name, as it does a machine's: person.notFound is PersonNotFound", () => {
    const withNotFound = { ...model, things: { ...model.things, person: { ...model.things["person"]!, notFound: { error: "PersonNotFound" } } } } as TouchModel;
    const journey = { name: "a miss", file: "journeys/a.ts", cast: {}, starts: null, steps: [{ title: "s", call: { actor: "x", operation: "person.sign-up" }, checks: [{ kind: "refuses", error: "person.notFound" }, { kind: "no-events" }, { kind: "spans", present: [], absent: [] }] }] };
    const m = { ...withNotFound, journeys: { "journeys/a.ts": journey } } as unknown as TouchModel;
    expect(Touches.of({ model: m, journey: "a miss", report: ok("a miss", 1) }).rows).toContainEqual({ block: "error", subject: "PersonNotFound" });
    expect(person.name).toBe("person.sign-up");
  });
  it("leaves a skipped step out, and a starting-world call outside the model (null), without crashing", () => {
    const journey = { name: "partly", file: "journeys/p.ts", cast: {}, starts: "w", steps: [
      { title: "omitted", skipped: "operation is outside the model" },
      { title: "real", call: { actor: "x", operation: "allowance.spend" }, checks: [{ kind: "refuses", error: "AllowanceExceeded" }] },
    ] };
    const world = { name: "w", file: "blueprint/starting-worlds/w.ts", from: null, cast: {}, makes: [null, { actor: "x", operation: "allowance.grant" }] };
    const m = { ...model, journeys: { "journeys/p.ts": journey }, startingWorlds: { w: world } } as unknown as TouchModel;
    const touched = Touches.of({ model: m, journey: "partly", report: ok("partly", 1) });
    expect(touched.green).toBe(true);
    const rows = touched.rows.map((r) => `${r.block}:${r.subject}`);
    expect(rows).toEqual(expect.arrayContaining(["operation:allowance.spend", "operation:allowance.grant", "error:AllowanceExceeded"]));
    expect(rows.filter((r) => r.startsWith("operation:"))).toEqual(["operation:allowance.grant", "operation:allowance.spend"]);
  });
  it("reads a journey whose starts is null", () => {
    const journey = { name: "nostart", file: "journeys/n.ts", cast: {}, starts: null, steps: [] };
    const m = { ...model, journeys: { "journeys/n.ts": journey } } as unknown as TouchModel;
    expect(Touches.of({ model: m, journey: "nostart", report: ok("nostart", 0) }).rows).toEqual([{ block: "journey", subject: "nostart" }]);
  });
});

describe("every journey acme's compiled model holds", () => {
  it("is read without a crash, and every refusal it names is one the model knows", () => {
    const known = new Set(Object.keys((model as unknown as { refusals: Record<string, string> }).refusals));
    for (const journey of Object.values(model.journeys ?? {})) {
      const touched = Touches.of({ model, journey: journey.name, report: ok(journey.name, journey.steps.length) });
      expect(touched.green, journey.name).toBe(true);
      for (const row of touched.rows.filter((r) => r.block === "error")) expect(known.has(row.subject), `${journey.name}: ${row.subject}`).toBe(true);
    }
  });
});

describe("a journey that is not green", () => {
  it("touches nothing, and says why", () => {
    const red = Touches.of({ model, journey: "revoke then spend", report: ["journey revoke then spend ✘ 1/3 steps"] });
    expect(red).toMatchObject({ green: false, rows: [] });
    expect(red.problems[0]).toMatch(/touches nothing until every step is green/);
    expect(Touches.of({ model, journey: "revoke then spend", report: [] }).green).toBe(false);
  });
  it("is not found when the model has no such journey", () => {
    expect(Touches.of({ model, journey: "no such journey", report: ok("no such journey") }).problems).toEqual(['the model has no journey named "no such journey"']);
  });
});

describe("switching on", () => {
  it("switches on every touched block in all nine outputs, whether or not an eval exists, with the journey that touched it", () => {
    const touched = Touches.of({ model, journey: "revoke then spend", report: ok("revoke then spend") });
    const entries = Touches.entries(touched, "revoke then spend");
    const cells = entries.map((e) => e.cell);
    for (const block of ["operation", "thing", "machine", "event", "roles", "error", "step", "journey"]) {
      for (const output of ["model", "api", "server", "sdk", "cli", "mcp", "docs", "portal", "telemetry"]) expect(cells, `${block}.${output}`).toContain(`${block}.${output}`);
    }
    expect(entries.find((e) => e.cell === "error.cli")).toEqual({ cell: "error.cli", subjects: ["AllowanceNotActive", "NotAllowed"], switchedBy: "revoke then spend" });
    expect(entries.find((e) => e.cell === "event.docs")?.subjects).toEqual(["AllowanceGranted", "AllowanceRevoked", "AllowanceSpent", "OrganizationCreated"]);
    expect(Grid.switchOn({ cells: [] }, entries).cells).toHaveLength(entries.length);
  });
});
