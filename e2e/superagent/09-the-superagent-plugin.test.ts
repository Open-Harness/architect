// Check 09 (Goal 17 slice 5): @orthograph/superagent, the Superagent and its Proposal, are in examples/superagent's
// model and in its generated docs, CLI and MCP, as `design/goals/17-superagent.md` and GOAL17-pause, -executor-slots and
// -derived-reads name them. The lists are in blueprint-names.ts, each with the section it comes from.
import { afterAll, describe, expect, it } from "vitest";
import { build, lazy, removeCopies } from "./app.ts";
import { superagent } from "./blueprint-names.ts";
import { describePlugin } from "./names-check.ts";

describePlugin("09", superagent);

describe("09 @orthograph/superagent: what only this plugin's design says", () => {
  const built = lazy(build);
  afterAll(removeCopies);

  it("`superagent.create` and `superagent.update` can refuse SlotsOutOfRange (GOAL17-executor-slots: slots are 1 to 254)", () => {
    const ops = built().model["operations"];
    for (const o of ["superagent.create", "superagent.update"]) expect(ops[o]?.refusals ?? [], o).toContain("SlotsOutOfRange");
  });

  it("slots is a uint(8), and the seat each Assignment holds is one too: 0 to 255, with 255 the reserve (GOAL17-executor-slots)", () => {
    expect(built().model["things"]["superagent"]?.fields?.["slots"]?.value).toMatchObject({ type: "uint", bits: 8 });
    expect(built().model["things"]["assignment"]?.fields?.["seat"]?.value).toMatchObject({ type: "uint", bits: 8 });
  });

  it("the pause fields are the sizes GOAL17-pause gives: pausedAt and pausedFor uint(64), passGen uint(32); the events' times uint(64)", () => {
    const f = built().model["things"]["superagent"]?.fields;
    expect(f?.["pausedAt"]?.value, "pausedAt").toMatchObject({ type: "uint", bits: 64 });
    expect(f?.["pausedAt"]?.optional, "pausedAt is empty until a pause begins").toBe(true);
    expect(f?.["pausedFor"]?.value, "pausedFor").toMatchObject({ type: "uint", bits: 64 });
    expect(f?.["passGen"]?.value, "passGen").toMatchObject({ type: "uint", bits: 32 });
    const events = built().model["things"]["superagent"]?.events;
    for (const [e, k] of [["SuperagentPaused", "at"], ["SuperagentResumed", "at"], ["SuperagentResumed", "length"]] as const) expect(events?.[e]?.[k]?.value, `${e}.${k}`).toMatchObject({ type: "uint", bits: 64 });
  });

  it("pause and resume are a signed-in person's, through a session, and nobody else's (GOAL17-pause)", () => {
    const ops = built().model["operations"];
    for (const o of ["superagent.pause", "superagent.resume"]) expect(ops[o]?.allowed, o).toEqual([{ kind: "signed-in", via: ["session"] }]);
  });

  it("a proposal is applied by a person only: approve and reject are not an agent's tools (K39: only a signed-in person applies it)", () => {
    const ops = built().model["operations"];
    for (const o of ["proposal.approve", "proposal.reject"]) {
      expect(ops[o]?.agentTool, `${o} must not be an agent's tool`).toBe(false);
      const allowed = (ops[o]?.allowed ?? []) as ReadonlyArray<any>;
      expect(allowed.length, `${o} is allowed to someone`).toBeGreaterThan(0);
      expect(allowed.filter((a) => a.kind !== "signed-in" || (a.via ?? []).includes("agent")), `${o}: only a signed-in person, never through an agent`).toEqual([]);
    }
  });

  it("the Superagent has versions keyed by its own id (17-superagent.md: `versions: { key: \"id\" }`; K40 fix 2)", () => {
    expect(built().model["things"]["superagent"]?.versions).toEqual({ key: "id" });
  });
});
