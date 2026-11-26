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
const modelOf = (example: string) => JSON.parse(execFileSync(process.execPath, [join(repo, "packages/compiler/src/main.ts"), join(repo, "examples", example)], { encoding: "utf8" })) as Model;
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

  it("writes none for the runtime's other refusals: NotAllowed, the machine's and a missing record have their own stubs or none", () => {
    const refused = stubs.map((s) => s.path).filter((p) => p.includes("-refused-"));
    expect(refused.some((p) => /not-allowed|idempotency-conflict|not-from/.test(p))).toBe(false);
  });
});
