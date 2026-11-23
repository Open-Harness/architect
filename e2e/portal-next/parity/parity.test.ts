// Goal 6, slice 2: the parity ratchet. The parity list (`e2e/portal-next/expected-failing.txt`) holds every portal check, down to a
// clause where the check has clauses, that does not yet pass on the new client. The run fails on a red check that is not listed, and on
// a listed check that passes. These are controls of the instrument, on synthetic vitest reports: they pass today and keep passing.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const e2e = join(import.meta.dirname, "../..");
const main = join(import.meta.dirname, "main.ts");
const dirs: Array<string> = [];
afterAll(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });

const FILE = "m1/21-portal-viewer.test.ts";
const verdict = (statuses: Record<string, "passed" | "failed">, listed: ReadonlyArray<string>) => {
  const dir = mkdtempSync(join(tmpdir(), "parity-"));
  dirs.push(dir);
  const report = { testResults: [{ name: join(e2e, FILE), status: "failed", assertionResults: Object.entries(statuses).map(([title, status]) => ({ ancestorTitles: ["A the portal"], title, status })) }] };
  writeFileSync(join(dir, "report.json"), JSON.stringify(report));
  writeFileSync(join(dir, "expected-failing.txt"), `# parity list\n${listed.map((t) => `${FILE} > A the portal > ${t}`).join("\n")}\n`);
  // Off GitHub Actions, so main.ts writes `ERROR:` and not `::error::` on any runner.
  const env = { ...process.env, GITHUB_ACTIONS: "" };
  const run = spawnSync(process.execPath, [main, join(dir, "report.json"), join(dir, "expected-failing.txt")], { encoding: "utf8", env });
  return { status: run.status, out: `${run.stdout}${run.stderr}` };
};

describe("the parity ratchet", () => {
  it("passes when the red checks are exactly the listed ones", () => {
    expect(verdict({ opens: "failed", draws: "failed", control: "passed" }, ["opens", "draws"]).status).toBe(0);
  });
  it("fails on a red check that is not listed, naming it", () => {
    const run = verdict({ opens: "failed", draws: "failed" }, ["opens"]);
    expect(run.status).toBe(1);
    expect(run.out).toContain("failing and not on the expected-failing list");
    expect(run.out).toContain(`${FILE} > A the portal > draws`);
  });
  it("fails on a listed check that passes, naming it", () => {
    const run = verdict({ opens: "failed", draws: "passed" }, ["opens", "draws"]);
    expect(run.status).toBe(1);
    expect(run.out).toMatch(/ERROR: newly passing, take it off the list: .*draws/);
  });
  it("fails when there is no report", () => {
    const run = spawnSync(process.execPath, [main, join(tmpdir(), "no-such-report.json"), join(e2e, "portal-next/expected-failing.txt")], { encoding: "utf8" });
    expect(run.status).toBe(1);
  });
  it("reads the real list: every line is one check of a portal check file, sorted, and none repeats", () => {
    const lines = readFileSync(join(e2e, "portal-next/expected-failing.txt"), "utf8").split("\n").filter((l) => l !== "" && !l.startsWith("#"));
    expect(lines.length).toBeGreaterThan(0);
    expect(new Set(lines).size).toBe(lines.length);
    expect(lines).toEqual([...lines].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
    for (const line of lines) expect(line).toMatch(/^[a-z0-9-]+\/[a-z0-9-]+\.test\.ts( > .+)?$/);
  });
});
