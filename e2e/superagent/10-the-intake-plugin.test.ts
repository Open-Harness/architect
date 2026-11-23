// Check 10 (Goal 17 slice 5): @orthograph/intake is in examples/superagent's model and generated docs, CLI and MCP:
// Source, Account, Trigger, Thread, Correlation, Eval, Decision and Policy, with their states, operations and events.
import { afterAll, describe, expect, it } from "vitest";
import { build, lazy, removeCopies } from "./app.ts";
import { intake } from "./blueprint-names.ts";
import { describePlugin } from "./names-check.ts";

describePlugin("10", intake);

describe("10 @orthograph/intake: what only this plugin's design says", () => {
  const built = lazy(build);
  afterAll(removeCopies);

  it("Policy has versions, keyed by superagent (K39: one per superagent; K40's example keyed it by repository)", () => {
    expect(built().model["things"]["policy"]?.versions).toEqual({ key: "superagent" });
  });

  it("the Source's failures count and its failAfter are whole numbers (GOAL17-derived-reads)", () => {
    const fields = built().model["things"]["source"]?.fields;
    expect(fields?.["failures"]?.value?.type).toBe("uint");
    expect(fields?.["failAfter"]?.value?.type).toBe("uint");
  });

  it("an Eval's activeAtStart and timeoutMs are uint(64) milliseconds on the world's clock (GOAL17-pause)", () => {
    const fields = built().model["things"]["eval"]?.fields;
    for (const f of ["activeAtStart", "timeoutMs"]) expect(fields?.[f]?.value, `eval.${f}`).toMatchObject({ type: "uint", bits: 64 });
  });

  it("an Account is unique by (superagent, source, external): the outside id is `external`, `id` is the row's own (GOAL17-account-key)", () => {
    const rules = Object.values<any>(built().model["things"]["account"]?.invariants ?? {});
    expect(rules.some((r) => r.kind === "unique" && JSON.stringify([...r.fields].sort()) === JSON.stringify(["external", "source", "superagent"]))).toBe(true);
  });

  it("an Account's row key is its own id, and the outside account's id is the text field `external` (GOAL17-account-key)", () => {
    const f = built().model["things"]["account"]?.fields;
    expect(f?.["id"]?.value?.type).toBe("id");
    expect(f?.["external"]?.value?.type).toBe("text");
  });

  it("the Account's `listed` role is a role of the Account (K40 fix 1: the `actor:` form)", () => {
    expect(built().model["things"]["account"]?.roles).toContain("listed");
  });
});
