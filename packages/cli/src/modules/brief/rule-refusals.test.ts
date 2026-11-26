// The brief said of every refusal the runtime gives that it comes "before the handler runs". A rule's refusal does not: the
// rule is checked after the handler has made its move and before the commit (docs/canon/invariants.mdx, "The runtime
// refuses"), so on Plugged In handle.claim's handler runs, its record step runs, and then the call is refused HandleTaken.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const main = resolve(import.meta.dirname, "../../main.ts");
const example = (name: string) => resolve(import.meta.dirname, "../../../../../examples", name);
const brief = (project: string, operation: string) => spawnSync("node", [main, "brief", operation, "--root", example(project)], { encoding: "utf8" });

describe("ortho brief on an operation a rule can refuse", () => {
  it("says a rule's refusal comes after the handler and before the commit, and keeps the others before the handler", { timeout: 60_000 }, () => {
    const run = brief("plugged-in", "handle.claim");
    expect(run.status).toBe(0);
    const lines = run.stdout.split("\n").filter((l) => l.includes("never refuse"));
    expect(lines).toEqual([
      "  never refuse NotAllowed yourself: the runtime does, before the handler runs",
      "  never refuse HandleTaken or HandleAlreadyOwned yourself: each belongs to a rule (handle.oneHolderPerName, handle.oneNamePerPerson), which the runtime checks after your handler has run and made its move, and before the commit. Your handler runs as if the call will succeed; when the rule is broken the call is refused and nothing is committed",
    ]);
  });

  it("says it of one rule in the singular, and names no move for an operation that makes none", { timeout: 60_000 }, () => {
    const lines = brief("superagent", "thread.follow").stdout.split("\n").filter((l) => l.includes("belongs to a rule"));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/yourself: it belongs to a rule \(subscription\.oneFollowPerThread\), which the runtime checks after your handler has run, and before the commit\./);
  });

  it("leaves an operation no rule can refuse as it was", { timeout: 60_000 }, () => {
    const lines = brief("acme", "allowance.spend").stdout.split("\n").filter((l) => l.includes("never refuse"));
    expect(lines).toEqual(["  never refuse AllowanceNotActive or NotAllowed yourself: the runtime does, before the handler runs"]);
  });
});
