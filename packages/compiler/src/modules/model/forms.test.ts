// Goal 17 slice 5: an agent kind's `slots.held` names the thing whose rows are the seats, by the thing or by the id it owns. The id
// is resolved to the one thing that owns it, and anything else is a problem that says which.
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import type { Thing, Value } from "orthograph";
import { agentsModel } from "./internal/forms.ts";
import { readLayout } from "./internal/layout.ts";

const Pool = Blueprint.thing({ description: "A pool.", fields: { id: Blueprint.id("pol"), size: Blueprint.uint(8) }, code: "PO" });
const Assignment = Blueprint.thing({ description: "A stretch of a seat.", fields: { id: Blueprint.id("asg") }, code: "AS" });
const Twin = Blueprint.thing({ description: "Another with the same id.", fields: { id: Blueprint.id("asg") }, code: "TW" });

const resolve = (held: Thing | Value, names: ReadonlyArray<readonly [Thing, string]> = [[Pool, "pool"], [Assignment, "assignment"]]) => {
  const layout = readLayout([{ path: "agents/executor.ts", exports: { default: Blueprint.agent({ model: "m", slots: { size: Pool.fields.size, reserve: 1, held } }) } }]);
  const problems: Array<string> = [];
  const model = agentsModel({ layout, thingNames: new Map(names), problems });
  return { held: (model["executor"] as { slots: { held: string } }).slots.held, problems };
};

describe("slots.held", () => {
  it("is the thing named, when it is the thing itself", () => {
    expect(resolve(Assignment)).toEqual({ held: "assignment", problems: [] });
  });

  it("is the one thing that owns the id named", () => {
    expect(resolve(Blueprint.id("asg"))).toEqual({ held: "assignment", problems: [] });
  });

  it("is refused when no thing owns the id, naming it", () => {
    const r = resolve(Blueprint.id("zzz"));
    expect(r.held).toBe("?");
    expect(r.problems).toEqual(['blueprint/agents/executor.ts: slots.held names the id prefix "zzz", which no thing owns']);
  });

  it("is refused when two things own the id, naming both: a plugin mounted twice must not bind the pool to one by luck", () => {
    const r = resolve(Blueprint.id("asg"), [[Pool, "pool"], [Assignment, "assignment"], [Twin, "work-assignment"]]);
    expect(r.held).toBe("?");
    expect(r.problems).toHaveLength(1);
    expect(r.problems[0]).toContain("which 2 things own (assignment, work-assignment)");
  });

  it("is refused when the value is not an id", () => {
    const r = resolve(Blueprint.uint(8));
    expect(r.problems).toEqual(["blueprint/agents/executor.ts: slots.held must be a thing, or the id of one (Blueprint.id(\"asg\")), and it is a uint"]);
  });
});
