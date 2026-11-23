// Run by `nx run e2e:test` (node --test). Not a vitest file: the tool's fixture tests are red on purpose.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { facts, parseList, readKeys, render } from "./totals.mjs";

const here = dirname(fileURLToPath(import.meta.url));
// A copy of the fixture under this folder (so `vitest` and the fixture's imports resolve), thrown away afterwards.
const work = mkdtempSync(join(here, ".work-"));
cpSync(join(here, "fixture"), work, { recursive: true });
after(() => rmSync(work, { recursive: true, force: true }));

const tool = (...args) => spawnSync(process.execPath, [join(here, "totals.mjs"), "--root", work, ...args], { encoding: "utf8" });

test("it prints the totals of every suite with an expected-failing/ folder, and writes no file", () => {
  const before = readdirSync(join(work, "demo")).sort();
  const out = tool();
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /^### e2e\/demo$/m);
  assert.match(out.stdout, /6 tests in all; 3 pass; 3 expected to fail, listed in `expected-failing\/`\. 1 listed line matches no test/);
  assert.match(out.stdout, /\| `alpha\.test\.ts` \| 3 \| 2 \|/);
  assert.match(out.stdout, /\| `beta\.test\.ts` \| 2 \| 1 \|/);
  assert.match(out.stdout, /\| `gamma\.test\.ts` \| 1 \| 0 \|/);
  assert.doesNotMatch(out.stdout, /### e2e\/plain/, "a suite with no list is named with --suite");
  assert.deepEqual(readdirSync(join(work, "demo")).sort(), before, "nothing is written");
  assert.equal(existsSync(join(work, "demo/README.md")), false);
});

test("--suite names a suite with no list, whose tests all pass", () => {
  const out = tool("--suite", "plain");
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /2 tests in all; all pass\./);
  assert.doesNotMatch(out.stdout, /Expected to fail/);
});

test("a test added changes the printed count, and nothing else needs updating", () => {
  const was = tool("--suite", "plain").stdout;
  cpSync(join(work, "plain/one.test.ts"), join(work, "plain/two.test.ts"));
  assert.match(was, /2 tests in all/);
  assert.match(tool("--suite", "plain").stdout, /4 tests in all/);
});

test("readKeys reads every .txt file of a folder, and render and facts work without vitest", () => {
  assert.equal(readKeys(join(work, "plain/expected-failing")), undefined);
  assert.equal(readKeys(join(work, "demo/expected-failing")).length, 5);
  const tests = [{ file: "s/a.test.ts", name: "x" }, { file: "s/a.test.ts", name: "y > z" }, { file: "s/b.test.ts", name: "w" }];
  const keys = parseList("# note\n\ns/a.test.ts > y > z\ns/a.test.ts > [file error]\n");
  const f = facts("s", tests, keys);
  assert.deepEqual(f.rows, [{ file: "a.test.ts", tests: 2, red: 1 }, { file: "b.test.ts", tests: 1, red: 0 }]);
  assert.equal(f.stale, 0, "a hook or file error key is not a test, so it is not stale");
  assert.match(render("s", f), /3 tests in all; 2 pass; 1 expected to fail/);
  assert.match(readFileSync(join(work, "demo/alpha.test.ts"), "utf8"), /alpha/);
});
