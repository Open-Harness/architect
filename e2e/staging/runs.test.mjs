// Run by `nx run e2e:test` (node --test): CX-staging check 4. The staging runs in `runs.mjs` name journeys that exist, by their own names, so a renamed or removed journey fails here
// instead of being skipped by the staging run; Capxul's run is its finish line, part by part. No cloud, no credential, no `ortho`: the journey files are read as text.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { CAPXUL, PARTS, PENDING, RUNS, STORY, journeysIn, listProblems, select } from "./runs.mjs";

const repo = join(import.meta.dirname, "../..");
const scratch = mkdtempSync(join(tmpdir(), "ortho-staging-runs-"));
after(() => rmSync(scratch, { recursive: true, force: true }));
/** A copy of an example's journey files only, with `change` applied to one file's text. */
const copyJourneys = (example, file, change) => {
  const root = mkdtempSync(join(scratch, "copy-"));
  cpSync(join(repo, example, "journeys"), join(root, "journeys"), { recursive: true });
  if (file !== undefined) { const path = join(root, "journeys", file); writeFileSync(path, change(readFileSync(path, "utf8"))); }
  return root;
};

describe("CX-staging 4: each run's list is held to the journey files", () => {
  for (const [app, run] of Object.entries(RUNS)) {
    test(`${app}: every listed journey is declared by a journey file of ${run.root}, once, and every journey file there can be read`, () => {
      assert.deepEqual(listProblems(run.journeys, join(repo, run.root)), []);
    });
  }

  test("Capxul's run is its finish line, part by part: the books, HR, payroll, KYC and KYB, and the bank account; every part with journeys in main lists some, and the pending parts are the books and payroll", () => {
    assert.deepEqual(Object.keys(CAPXUL), PARTS);
    assert.deepEqual(PARTS, ["books", "hr", "payroll", "kyc-kyb", "bank-account"]);
    assert.deepEqual(PENDING, ["books", "payroll"]);
    for (const part of PARTS) assert.equal(CAPXUL[part].length === 0, PENDING.includes(part), `${part}: ${CAPXUL[part].length} journeys, ${PENDING.includes(part) ? "pending" : "not pending"}`);
    assert.deepEqual(RUNS.capxul, { root: "examples/capxul", journeys: PARTS.flatMap((p) => CAPXUL[p]) });
  });

  // Subsets, not equalities: a journey that lands in main later (the books' from goal/capxul) must not turn main red; the checks author adds it to its part (CX-staging, section 2).
  test("Capxul's KYC, KYB and bank account parts hold only Bridge's journeys, and its HR part none of them", () => {
    for (const name of [...CAPXUL["kyc-kyb"], ...CAPXUL["bank-account"]]) assert.match(name, /^bridge: /);
    for (const name of CAPXUL.hr) assert.doesNotMatch(name, /^bridge: /);
  });

  test("Plugged In's run is its one story", () => assert.deepEqual(RUNS["plugged-in"], { root: "examples/plugged-in", journeys: [STORY] }));

  // The plants: each is a journey file changed so the list no longer matches it.
  for (const [name, example, list, file, change, say] of [
    ["a Capxul journey renamed", "examples/capxul", RUNS.capxul.journeys, "bridge-open-a-bank-account.ts", (t) => t.replace('Blueprint.journey("bridge: open a bank account"', 'Blueprint.journey("bridge: open an account"'), /named "bridge: open a bank account"/],
    ["an HR journey renamed by one letter", "examples/capxul", RUNS.capxul.journeys, "hire-an-employee.ts", (t) => t.replace('"hire an employee"', '"hire an employe"'), /named "hire an employee"/],
    ["a name with an apostrophe changed to a curly one", "examples/capxul", RUNS.capxul.journeys, "branch-names-are-the-companys.ts", (t) => t.replace("company's\"", "company\u2019s\""), /named "branch names are the company's"/],
    ["a Capxul journey removed", "examples/capxul", RUNS.capxul.journeys, "bridge-start-a-kyb.ts", () => "export {};\n", /declares 0 journeys|named "bridge: start a kyb"/],
    ["a journey whose name is no longer a plain string (the check cannot read it)", "examples/capxul", RUNS.capxul.journeys, "set-up-grades.ts", (t) => t.replace('Blueprint.journey("set up grades"', "Blueprint.journey(`set up grades`"), /set-up-grades\.ts declares 0 journeys/],
    ["two files with one name", "examples/capxul", RUNS.capxul.journeys, "add-holidays.ts", (t) => t.replace('"add holidays"', '"a one-day list"'), /both named "a one-day list"/],
    ["Plugged In's story renamed", "examples/plugged-in", RUNS["plugged-in"].journeys, "the-story.ts", (t) => t.replace(`"${STORY}"`, '"the story"'), /named "a person claims a page and shares it"/],
  ]) {
    test(`the list fails when ${name}`, () => {
      const found = listProblems(list, copyJourneys(example, file, change)).join("\n");
      assert.notEqual(found, "", `nothing was wrong with: ${name}`);
      assert.match(found, say);
    });
  }
  test("the list fails when it names a journey twice or names none", () => {
    const root = copyJourneys("examples/capxul");
    assert.match(listProblems([...RUNS.capxul.journeys, "hire an employee"], root).join("\n"), /"hire an employee" is listed twice/);
    assert.match(listProblems([], root).join("\n"), /empty/);
    assert.deepEqual(listProblems(RUNS.capxul.journeys, root), []);
  });
  test("the reader sees every journey file of Capxul, one name each", () => {
    const { names, unread } = journeysIn(join(repo, "examples/capxul"));
    assert.deepEqual(unread, []);
    assert.equal(names.size, readdirSync(join(repo, "examples/capxul/journeys")).filter((f) => f.endsWith(".ts")).length);
  });
});

describe("select: what the workflow's select step writes", () => {
  test("each run's root is an example folder, and its file is one name per line, every line ended", () => {
    for (const [app, run] of Object.entries(RUNS)) {
      const chosen = select(app);
      assert.equal(chosen.root, run.root);
      assert.match(chosen.root, /^examples\/[a-z0-9-]+$/);
      assert.equal(chosen.text, run.journeys.map((j) => `${j}\n`).join(""));
      assert.ok(run.journeys.every((j) => !j.includes("\n") && j.trim() === j && j !== ""));
    }
  });
  test("an unknown app, or one inherited from Object, is refused", () => {
    for (const app of ["nonesuch", "toString", "__proto__", ""]) assert.match(select(app).problem ?? "", /no staging run named/);
  });
  test("the command prints only ROOT=<root> and writes the file; an unknown app exits 2 and writes nothing", () => {
    const file = join(scratch, "journeys.txt");
    const ok = spawnSync(process.execPath, [join(import.meta.dirname, "runs.mjs"), "select", "capxul", file], { encoding: "utf8" });
    assert.deepEqual([ok.status, ok.stdout], [0, "ROOT=examples/capxul\n"]);
    assert.equal(readFileSync(file, "utf8"), select("capxul").text);
    const other = join(scratch, "none.txt");
    const bad = spawnSync(process.execPath, [join(import.meta.dirname, "runs.mjs"), "select", "nonesuch", other], { encoding: "utf8" });
    assert.deepEqual([bad.status, bad.stdout, existsSync(other)], [2, "", false]);
  });
});
