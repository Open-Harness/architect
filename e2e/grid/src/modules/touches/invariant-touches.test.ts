// The invariant row (G5, K14 lane 14): which rules a journey touches, read from Plugged In as ST1.19 leaves it (a throwaway stand-in of the slice, captured
// 21 November 2026, fixtures/plugged-in-rules) and from acme, which declares none.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Touches } from "./service.ts";
import type { TouchModel } from "./types.ts";

const modelOf = (project: string) => JSON.parse((JSON.parse(readFileSync(join(import.meta.dirname, `../../../fixtures/${project}/files.json`), "utf8")) as Record<string, string>)["generated/model/model.json"]!) as TouchModel;
const rules = modelOf("plugged-in-rules");
const acme = modelOf("acme");
const ok = (journey: string, steps: number) => [`journey ${journey} ✔ ${steps}/${steps} steps`];
const rowsOf = (model: TouchModel, journey: string, steps: number) => Touches.of({ model, journey, report: ok(journey, steps) }).rows.filter((r) => r.block === "invariant").map((r) => r.subject);

describe("the invariant row", () => {
  it("is touched, for every rule of the thing, by a journey that calls an operation of that thing, and by one whose world makes such a call", () => {
    expect(rowsOf(rules, "claim a handle", 8)).toEqual(["handle.oneHolderPerName", "handle.oneNamePerPerson", "profile.onePagePerHandle"]);
    // `a name is claimed once` runs handle operations only, so the profile's rule is not touched.
    expect(rowsOf(rules, "a name is claimed once", 5)).toEqual(["handle.oneHolderPerName", "handle.oneNamePerPerson"]);
  });

  it("is touched through an operation the model says can break a rule of another thing, though the call is on this one", () => {
    const crossing = { ...acme, operations: { ...acme.operations, "allowance.spend": { ...acme.operations["allowance.spend"]!, invariants: { OrganizationTaken: "organization.oneOrganizationPerName" } } } } as TouchModel;
    expect(rowsOf(acme, "spend within an allowance", 4)).toEqual([]);
    expect(rowsOf(crossing, "spend within an allowance", 4)).toEqual(["organization.oneOrganizationPerName"]);
  });

  it("is not touched where nothing declares a rule: acme's journeys touch no invariant", () => {
    const journeys = Object.values(acme.journeys ?? {});
    expect(journeys.length).toBeGreaterThan(0);
    for (const journey of journeys) expect(rowsOf(acme, journey.name, journey.steps.length), journey.name).toEqual([]);
  });

  it("is touched by nothing when the journey is not green", () => {
    expect(Touches.of({ model: rules, journey: "claim a handle", report: ["journey claim a handle ✘ 3/8 steps"] }).rows).toEqual([]);
  });

  it("switches the invariant cells on in all nine outputs, each with the three rules as subjects", () => {
    const entries = Touches.entries(Touches.of({ model: rules, journey: "claim a handle", report: ok("claim a handle", 8) }), "claim a handle").filter((e) => e.cell.startsWith("invariant."));
    expect(entries.map((e) => e.cell)).toEqual(["model", "api", "server", "sdk", "cli", "mcp", "docs", "portal", "telemetry"].map((o) => `invariant.${o}`));
    for (const entry of entries) expect(entry.subjects).toEqual(["handle.oneHolderPerName", "handle.oneNamePerPerson", "profile.onePagePerHandle"]);
  });
});
