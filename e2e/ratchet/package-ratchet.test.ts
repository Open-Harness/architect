// G11: a package's red tests behave like the m1 checks. `tools/ci/package-test.sh` on a scratch package with one passing and one failing test:
// no `expected-failing/` folder runs as it always did (the red test fails the run); a listed red test passes the run; an unlisted one fails it and is named;
// a listed test that now passes is reported ("newly passing"); a key filed under another test file's name fails. The scratch package is made in the repository's ignored `tmp/` (no vitest config above it, and
// vitest resolves from the repository's node_modules), and removed after.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const repo = resolve(import.meta.dirname, "../..");
const made: string[] = [];
afterAll(() => { for (const dir of made) rmSync(dir, { recursive: true, force: true }); });

const scratchPackage = (lists?: Readonly<Record<string, string>>, extra: Readonly<Record<string, string>> = {}): string => {
  mkdirSync(join(repo, "tmp"), { recursive: true });
  const dir = mkdtempSync(join(repo, "tmp", "scratch-package-"));
  made.push(dir);
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src/ok.test.ts"), 'import { expect, it } from "vitest";\nit("is fine", () => { expect(1).toBe(1); });\n');
  writeFileSync(join(dir, "src/red.test.ts"), 'import { describe, expect, it } from "vitest";\ndescribe("until it is built", () => { it("is red", () => { expect(1).toBe(2); }); });\n');
  for (const [name, text] of Object.entries(extra)) writeFileSync(join(dir, name), text);
  if (lists !== undefined) {
    mkdirSync(join(dir, "expected-failing"));
    for (const [name, text] of Object.entries(lists)) writeFileSync(join(dir, "expected-failing", name), text);
  }
  return dir;
};
const run = (dir: string) => {
  const r = spawnSync("bash", [join(repo, "tools/ci/package-test.sh"), dir.slice(repo.length + 1)], { cwd: repo, encoding: "utf8", timeout: 120_000 });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
};
const RED = "src/red.test.ts > until it is built > is red\n";

describe("G11: a package's expected-failing list", () => {
  it("a package without the folder runs as before: its red test fails the run", { timeout: 150_000 }, () => {
    const r = run(scratchPackage());
    expect(r.status, r.out).not.toBe(0);
    expect(r.out).not.toContain("ratchet:");
  });

  it("a listed red test passes the run, and the ratchet says how many were expected", { timeout: 150_000 }, () => {
    const r = run(scratchPackage({ "red.txt": RED }));
    expect(r.status, r.out).toBe(0);
    expect(r.out).toMatch(/ratchet: 1 failing, 1 expected, 0 unexpected, 0 newly passing/);
  });

  it("an unlisted red test fails the run and is named", { timeout: 150_000 }, () => {
    const r = run(scratchPackage({}));
    expect(r.status, r.out).not.toBe(0);
    expect(r.out).toContain("failing and not on the expected-failing list: src/red.test.ts > until it is built > is red");
  });

  it("a listed test that now passes is reported, without failing the run", { timeout: 150_000 }, () => {
    const r = run(scratchPackage({ "red.txt": RED, "ok.txt": "src/ok.test.ts > is fine\n" }));
    expect(r.status, r.out).toBe(0);
    expect(r.out).toContain("newly passing, take it off the list: src/ok.test.ts > is fine");
  });

  it("a key filed under another test file's name fails the run", { timeout: 150_000 }, () => {
    const r = run(scratchPackage({ "ok.txt": RED }));
    expect(r.status, r.out).not.toBe(0);
    expect(r.out).toContain("filed under another check's name");
  });

  it("a test that passes and then throws later fails the run, as plain vitest does", { timeout: 150_000 }, () => {
    const late = { "src/late.test.ts": 'import { expect, it } from "vitest";\nit("passes", () => { expect(1).toBe(1); setTimeout(() => { throw new Error("late throw"); }, 20); });\nit("waits", async () => { await new Promise((r) => { setTimeout(r, 200); }); });\n' };
    const r = run(scratchPackage({ "red.txt": RED }, late));
    expect(r.status, r.out).not.toBe(0);
    expect(r.out).toContain("failing and not on the expected-failing list: unhandled error > late throw");
  });

  it("a listed red test in a file whose afterAll throws still fails the run, under the hook's own key", { timeout: 150_000 }, () => {
    const torn = 'import { afterAll, describe, expect, it } from "vitest";\ndescribe("until it is built", () => { afterAll(() => { throw new Error("teardown broke"); }); it("is red", () => { expect(1).toBe(2); }); });\n';
    const r = run(scratchPackage({ "red.txt": RED }, { "src/red.test.ts": torn }));
    expect(r.status, r.out).not.toBe(0);
    expect(r.out).toContain("failing and not on the expected-failing list: src/red.test.ts > until it is built > [suite error]");
  });

  it("the same hook error passes once it is listed under its own key", { timeout: 150_000 }, () => {
    const torn = 'import { afterAll, describe, expect, it } from "vitest";\ndescribe("until it is built", () => { afterAll(() => { throw new Error("teardown broke"); }); it("is red", () => { expect(1).toBe(2); }); });\n';
    const r = run(scratchPackage({ "red.txt": `${RED}src/red.test.ts > until it is built > [suite error]\n` }, { "src/red.test.ts": torn }));
    expect(r.status, r.out).toBe(0);
  });
});
