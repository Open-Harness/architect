// `ortho add journeys <thing>` writes a stub for every refusal a journey can cause, the ones a rule gives included.
// On Plugged In, handle.claim declares no errors: HandleTaken and HandleAlreadyOwned belong to the rules in
// blueprint/things/handle/invariants.ts and the runtime gives them, and the command wrote no stub for either, while the
// canon says it writes one for "every path through the machine, every role and every refusal" (docs/canon/orthograph.mdx).
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Model } from "@orthograph/compiler";
import { renderJourneyStubs } from "./service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const modelOf = (example: string) => JSON.parse(execFileSync(process.execPath, [join(repo, "packages/compiler/src/main.ts"), join(repo, "examples", example)], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 })) as Model;
const pluggedIn = modelOf("plugged-in");

describe("a journey stub for each refusal a rule gives", () => {
  const stubs = renderJourneyStubs(pluggedIn, "handle");
  const stub = (file: string) => stubs.find((s) => s.path === `blueprint/journeys/${file}.ts`)?.content ?? "";

  it("writes one for each rule handle.claim can break, after the declared errors' and beside the others", () => {
    expect(pluggedIn.operations["handle.claim"]?.errors).toEqual([]);
    expect(Object.keys(pluggedIn.operations["handle.claim"]?.invariants ?? {}).sort()).toEqual(["HandleAlreadyOwned", "HandleTaken"]);
    expect(stubs.map((s) => s.path).filter((p) => p.includes("-claim-"))).toEqual([
      "blueprint/journeys/handle-claim-created-in-claimed.ts",
      "blueprint/journeys/handle-claim-refused-anonymous.ts",
      "blueprint/journeys/handle-claim-refused-handle-taken.ts",
      "blueprint/journeys/handle-claim-refused-handle-already-owned.ts",
    ]);
    expect(new Set(stubs.map((s) => s.path)).size).toBe(stubs.length);
  });

  it("cites the rule and its file, imports the error from the thing's errors, and leaves the world and payload as blanks naming the rule", () => {
    const taken = stub("handle-claim-refused-handle-taken");
    expect(taken.split("\n")[0]).toBe("// Scaffolded from blueprint/things/handle/invariants.ts. Yours from now on.");
    expect(taken).toContain(`import { HandleTaken } from "../things/handle/errors.ts";`);
    expect(taken).toContain(" * One refusal of handle.claim, the runtime's, for a rule in blueprint/things/handle/invariants.ts:");
    expect(taken).toContain(` *   HandleTaken (exit 10, ${pluggedIn.refusals["HandleTaken"]})`);
    expect(taken).toContain(" *   handle.oneHolderPerName: ");
    expect(taken).toContain(`export default Blueprint.journey("handle.claim: refused HandleTaken", {`);
    expect(taken).toContain(`starts: Blueprint.todo("a starting world where handle.claim would break handle.oneHolderPerName"),`);
    expect(taken).toContain(`s.someone.run(claim, Blueprint.todo("handle.claim's payload that breaks handle.oneHolderPerName: name")),`);
    expect(taken).toContain("refuses(HandleTaken),");
    expect(taken).toContain("noEvents(),");
    expect(stub("handle-claim-refused-handle-already-owned")).toContain(" *   handle.oneNamePerPerson: ");
  });

  it("stubs a rule on another thing, importing the error from that thing, and leaves a refusal's fields as a blank", () => {
    const capxul = modelOf("capxul");
    // Every operation that can break a rule of a thing other than its own, with the error that rule gives.
    const cross = Object.values(capxul.operations).flatMap((op) => Object.entries(op.invariants ?? {}).flatMap(([error, rule]) => {
      const thing = rule.slice(0, rule.lastIndexOf("."));
      return op.from.kind === "app" && thing !== op.thing ? [{ op, error, rule, thing }] : [];
    }));
    expect(cross.length, "capxul no longer has an operation that can break another thing's rule: the fixture moved").toBeGreaterThan(0);
    for (const { op, error, rule, thing } of cross) {
      const kebab = error.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
      const content = renderJourneyStubs(capxul, op.thing).find((s) => s.path === `blueprint/journeys/${op.thing}-${op.verb}-refused-${kebab}.ts`)?.content ?? "";
      expect(content, `${op.name} has no stub for ${error}`).toContain(`import { ${error} } from "../things/${thing}/errors.ts";`);
      expect(content).toContain(` *   ${rule}: `);
      const fields = Object.keys(capxul.things[thing]?.errors[error]?.fields ?? {});
      expect(content).toContain(fields.length ? `refuses(${error}, Blueprint.todo("${error}'s fields: ${fields.join(", ")}")),` : `refuses(${error}),`);
    }
    const all = Object.keys(capxul.things).flatMap((thing) => renderJourneyStubs(capxul, thing).map((s) => s.path));
    expect(new Set(all).size).toBe(all.length);
  });
});
