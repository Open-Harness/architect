// The canon's example proves locally: every journey passes, every operation shows its nine evals, and coverage is whole.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { coverageLine } from "@orthograph/prove";
import { afterAll, describe, expect, it } from "vitest";
import { acme, ortho, copyOf, nothingRunning } from "./support.ts";

const project = copyOf(join(acme, "../signup"));
afterAll(project.remove);

describe("ortho prove --env local on signup, the canon's example", () => {
  it("passes four journeys and four operations with nine evals each, and leaves nothing running", () => {
    const run = ortho(project.root, "prove", "--env", "local", "--port", "0");
    expect(run.status, run.stdout + run.stderr).toBe(0);
    const lines = run.stdout.trimEnd().split("\n");
    const model = JSON.parse(readFileSync(join(project.root, "generated/model/model.json"), "utf8"));
    expect(lines.filter((l) => /^journey .* ✔ \d+\/\d+ steps$/.test(l))).toHaveLength(4);
    expect(lines.filter((l) => / 9 evals ✔ /.test(l))).toHaveLength(4);
    expect(lines).toContain(coverageLine("moves 3/3 · outcomes 3/3 · refusals 1/1 · runtime refusals 2/4", model));
    expect(lines.at(-1)).toBe("prove ✔");
    // The suffix names IdempotencyConflict, literally, exactly when an operation lists it (HAN-10): not whatever the helper infers.
    const listed = Object.values(model.operations as Record<string, { refusals: Array<string> }>).some((op) => op.refusals.includes("IdempotencyConflict"));
    expect(lines.find((l) => l.startsWith("coverage ✔"))?.includes("(not counted: IdempotencyConflict,") ?? false, "the coverage line's suffix").toBe(listed);
    nothingRunning(project.root);
  });
});
