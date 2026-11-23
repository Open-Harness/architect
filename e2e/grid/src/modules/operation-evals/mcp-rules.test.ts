// operation.mcp once rules own refusals (G5, ST1.17): a tool's description is the model's, then one sentence `Refuses <Error> when <reason>.` for each refusal a rule owns for the
// operation, and nothing else. Judged over Plugged In as ST1.19 leaves it (fixtures/plugged-in-rules, a throwaway stand-in of the slice) and a wrong description planted at a time.
import { describe, expect, it } from "vitest";
import type { ProjectEvidence } from "../project-evidence/types.ts";
import { evidenceOf, judge } from "../project-evidence/testing.ts";
import { OperationEvals } from "./service.ts";

const pluggedIn = await evidenceOf("plugged-in-rules");
const check = (op: string, e: ProjectEvidence) => judge(OperationEvals.evals, "operation.mcp", op, e);
const described = (op: string, change: (description: string) => string): ProjectEvidence => ({ ...pluggedIn, mcp: pluggedIn.mcp!.map((t) => (t.name === op ? { ...t, description: change(t.description ?? "") } : t)) });
const said = (op: string, e: ProjectEvidence) => { const found = check(op, e); return found.ok ? [] : found.why; };
const claim = pluggedIn.model.operations["handle.claim"]!.description!;

describe("operation.mcp with rules", () => {
  it("is green for every operation: the model's description, and a sentence for each refusal a rule owns", () => {
    for (const op of Object.keys(pluggedIn.model.operations)) expect({ op, ...check(op, pluggedIn) }).toEqual({ op, ok: true, why: [] });
    expect(pluggedIn.mcp!.find((t) => t.name === "handle.claim")!.description).toMatch(/^Claim a free name.* Refuses HandleTaken when .*\. Refuses HandleAlreadyOwned when .*\.$/);
  });
  it("is red for a tool that says only the model's words, though the model owes the sentences", () => {
    expect(said("handle.claim", described("handle.claim", () => claim))[0]).toContain("the model also owes a sentence for HandleTaken, HandleAlreadyOwned");
  });
  it("is red for one sentence missing, one said twice, one for another operation's refusal, and one that is not a sentence of a rule", () => {
    expect(said("handle.claim", described("handle.claim", (d) => d.replace(/ Refuses HandleAlreadyOwned.*$/, "")))[0]).toContain("no sentence for HandleAlreadyOwned");
    expect(said("handle.claim", described("handle.claim", (d) => `${d} Refuses HandleTaken when another claimed handle holds this name.`))[0]).toContain("HandleTaken is said more than once");
    expect(said("handle.claim", described("handle.claim", (d) => `${d} Refuses LinkNeedsHandle when you have no page.`))[0]).toContain("a sentence for LinkNeedsHandle, which no rule refuses for this operation");
    expect(said("handle.claim", described("handle.claim", (d) => `${d} It is fast.`))[0]).toContain('"It is fast." is not a "Refuses <Error> when <reason>." sentence');
  });
  it("is red for a tool of an operation no rule can break that says it refuses for one", () => {
    expect(said("handle.release", described("handle.release", (d) => `${d} Refuses HandleTaken when another claimed handle holds this name.`))[0]).toContain("a sentence for HandleTaken, which no rule refuses for this operation");
  });
  it("is red for a description that is not the model's before the sentences, or the model's with no space after it", () => {
    expect(said("handle.claim", described("handle.claim", (d) => d.replace("Claim a free name", "Claim a name")))[0]).toContain("the model says");
    expect(said("handle.claim", described("handle.claim", (d) => d.replace(`${claim} `, `${claim}Also. `)))[0]).toContain("the model says");
  });
  it("still wants an operation's description exactly when no rule refuses for it", () => {
    expect(said("handle.release", described("handle.release", (d) => `${d} Fast.`))[0]).toContain('"Fast." is not a "Refuses <Error> when <reason>." sentence');
    expect(said("handle.release", described("handle.release", (d) => d.replace("Free your name", "Free a name")))[0]).toContain("the model says");
    expect(said("handle.resolve", described("handle.resolve", () => "something else"))[0]).toContain("the model says");
  });
});
