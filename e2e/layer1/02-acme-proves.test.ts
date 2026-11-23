// Check 2: acme proves locally. Every journey passes (fifteen, with M2.02's four principal journeys), every operation shows its nine evals, and coverage holds.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { coverageLine } from "@orthograph/prove";
import { afterAll, describe, expect, it } from "vitest";
import { acme, ortho, copyOf, nothingRunning } from "./support.ts";

const project = copyOf(acme);
afterAll(project.remove);

describe("check 2: ortho prove --env local on acme", () => {
  it("passes fifteen journeys and fifteen operations with nine evals each, and leaves nothing running", () => {
    const run = ortho(project.root, "prove", "--env", "local", "--port", "0");
    expect(run.status, run.stdout + run.stderr).toBe(0);
    const lines = run.stdout.trimEnd().split("\n");
    expect(lines.filter((l) => /^journey .* ✔ \d+\/\d+ steps$/.test(l))).toHaveLength(15);
    expect(lines.filter((l) => / 9 evals ✔ /.test(l))).toHaveLength(15);
    for (const op of ["allowance.grant", "allowance.spend", "allowance.revoke", "allowance.get"]) expect(lines.some((l) => l.startsWith(`${op} 9 evals ✔`))).toBe(true);
    const model = JSON.parse(readFileSync(join(project.root, "generated/model/model.json"), "utf8"));
    expect(lines).toContain(coverageLine("moves 7/7 · outcomes 7/7 · refusals 4/4 · runtime refusals 15/17", model));
    expect(lines.at(-1)).toBe("prove ✔");
    // The suffix names IdempotencyConflict, literally, exactly when an operation lists it (HAN-10): not whatever the helper infers.
    const listed = Object.values(model.operations as Record<string, { refusals: Array<string> }>).some((op) => op.refusals.includes("IdempotencyConflict"));
    expect(lines.find((l) => l.startsWith("coverage ✔"))?.includes("(not counted: IdempotencyConflict,") ?? false, "the coverage line's suffix").toBe(listed);
    nothingRunning(project.root);
  });
});
