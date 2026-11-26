// What `ortho add` writes must leave the project checkable, and every command must say what is unfinished rather than
// crash or pretend it isn't there: a journey stub's blanks, a blank in a journeys folder at the project's root, and an
// operation that still has blanks (it is out of the model's operations until they are filled, #742).
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const repo = resolve(import.meta.dirname, "../../../../..");
const main = resolve(import.meta.dirname, "../../main.ts");
const fresh = join(repo, "examples/acme/test/tmp/add-journey-blanks");
const ortho = (...args: ReadonlyArray<string>) => spawnSync("node", [main, ...args, "--root", fresh], { encoding: "utf8" });

afterAll(() => rmSync(fresh, { recursive: true, force: true }));

describe("ortho add journey and an unfinished operation, in a fresh project", () => {
  it("leaves the project checkable, and check, brief and add journeys each say what is still blank", { timeout: 180_000 }, () => {
    rmSync(fresh, { recursive: true, force: true });
    mkdirSync(fresh, { recursive: true });
    cpSync(join(repo, "examples/acme/package.json"), join(fresh, "package.json"));
    writeFileSync(join(fresh, "tsconfig.json"), JSON.stringify({ extends: "../../../tsconfig.json", include: ["blueprint/**/*.ts", "journeys/**/*.ts"] }));
    expect(ortho("add", "thing", "allowance").status).toBe(0);
    expect(ortho("add", "operation", "allowance.spend").status).toBe(0);
    expect(ortho("add", "journey", "Spend within an allowance").stdout.trim()).toBe("wrote blueprint/journeys/spend-within-an-allowance.ts");
    // The same stub in the other place journeys are read from: a journeys folder at the project's root.
    mkdirSync(join(fresh, "journeys"));
    writeFileSync(join(fresh, "journeys/at-the-root.ts"), readFileSync(join(fresh, "blueprint/journeys/spend-within-an-allowance.ts"), "utf8"));

    const tsc = spawnSync(join(repo, "node_modules/.bin/tsc"), ["-p", fresh, "--noEmit", "--pretty", "false"], { cwd: fresh, encoding: "utf8" });
    expect(tsc.stdout).toBe("");

    const check = ortho("check");
    expect(check.stderr).not.toContain("TypeError");
    expect(check.status).toBe(1);
    const lines = check.stdout.trim().split("\n");
    expect(lines).toContain("journeys/spend-within-an-allowance has 2 blanks");
    expect(lines).toContain("  blueprint/journeys/spend-within-an-allowance.ts:4  who is in it, by role");
    expect(lines).toContain("  blueprint/journeys/spend-within-an-allowance.ts:5  the steps, each a call and its checks");
    expect(lines).toContain("journeys/at-the-root has 2 blanks");
    expect(lines).toContain("  journeys/at-the-root.ts:4  who is in it, by role");
    expect(lines.some((l) => l.startsWith("model ✘"))).toBe(false);

    const model = ortho("model");
    expect(model.status).toBe(0);
    expect(model.stdout).toContain("unfinished blueprint/journeys/spend-within-an-allowance.ts  2 blanks");
    expect(model.stdout).toContain("unfinished journeys/at-the-root.ts  2 blanks");

    const brief = ortho("brief", "allowance.spend");
    expect(brief.status).toBe(2);
    expect(brief.stderr).toContain("allowance.spend has no brief yet: it still has 4 blanks in blueprint/things/allowance/verbs/spend.ts");
    expect(brief.stderr).toContain("  payload: what a caller sends");
    expect(brief.stderr).toContain("Fill them, then run ortho brief allowance.spend again.");
    expect(brief.stderr).not.toContain("is not an operation with a handler");

    const journeys = ortho("add", "journeys", "allowance");
    expect(journeys.status).toBe(2);
    expect(journeys.stderr).toContain("allowance has nothing to write journeys for yet");
    expect(journeys.stderr).toContain("allowance.spend still has 4 blanks in blueprint/things/allowance/verbs/spend.ts");
    expect(journeys.stderr).not.toContain("has no machine, roles or declared errors");
  });
});
