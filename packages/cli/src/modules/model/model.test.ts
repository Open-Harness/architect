import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { ModelCommand } from "./service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const acme = resolve(repo, "examples/acme");
const main = resolve(import.meta.dirname, "../../main.ts");
const snapshot = resolve(repo, "packages/compiler/src/modules/model/__snapshots__/acme.model.json");

describe("ortho model", () => {
  it("--json on acme prints the model snapshot, from a real process", { timeout: 60_000 }, () => {
    const out = execFileSync("node", [main, "model", "--json", "--root", acme], { encoding: "utf8" });
    expect(out).toBe(readFileSync(snapshot, "utf8"));
  });

  it("summarises things and operations without --json", async () => {
    const said = await Effect.runPromise(ModelCommand.run({ root: acme, json: false }));
    expect(said.exit).toBe(0);
    expect(said.out).toContain("thing allowance (active, exhausted, revoked)");
    expect(said.out).toMatch(/operation allowance\.grant {2}refuses AllowanceLimitTooHigh, PersonNotFound, NotAllowed, IdempotencyConflict {2}[0-9a-f]{16}/);
  });

  it("--json is optional on the real command line", { timeout: 60_000 }, () => {
    const run = spawnSync("node", [main, "model", "--root", acme], { encoding: "utf8" });
    expect(run.stderr).toBe("");
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("operation allowance.grant");
  });

  it("an invalid blueprint lists its problems and exits 2", { timeout: 60_000 }, () => {
    const planted = resolve(repo, "packages/compiler/test/fixtures/not-an-operation");
    const run = spawnSync("node", [main, "model", "--json", "--root", planted], { encoding: "utf8" });
    expect(run.status).toBe(2);
    expect(run.stdout).toBe("");
    expect(run.stderr).toContain("blueprint/things/widget/verbs/spin.ts");
  });
});
