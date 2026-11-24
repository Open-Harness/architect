// Check 25 (#900, from #756): the refusal of a stale save is the app's own, found from the blueprint, never by the superagent's name.
// GOAL17-stage-one call 9 has the framework serve `versions:`; #756 found the stale refusal by the string "StaleRevision"
// (`packages/projections/src/modules/server/internal/versioned.ts`), so in any other app a stale save dies as a 500. Three things are read:
// 1. On a copy whose Policy save and restore declare `PolicyOutOfDate { current }` in place of `StaleRevision`, `ortho prove` runs
//    `e2e/fixtures/superagent/stale-elsewhere/journeys/`, and each stale save and restore is refused with `PolicyOutOfDate`.
// 2. A versioned save or restore that declares no stale refusal, or only an error with no `current`, is refused by `ortho check`, naming
//    the operation (one copy for each). The stale refusal is in the middle of save's errors and first in restore's, beside one-field errors.
// 3. No framework package writes the superagent's error name as a string (AGENTS.md: a declared name is never a string outside `generated/`).
// CONTROLS: the copies are the app but for the one edit each plants, and the renamed copy passes `ortho generate` and `ortho check`,
// so a red here is the stale refusal and nothing else.
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { copyApp, edit, lazy, removeCopies, repo, run, swapPlugins } from "./app.ts";
import { fixtures, problemsOf, proveCopy, type Wanted } from "./stage-one.ts";

afterAll(removeCopies);
const here = join(repo, "e2e/fixtures/superagent/stale-elsewhere");
const WANT: Wanted = { file: "a-stale-save-under-another-name-is-refused.ts", name: "a stale save under another name is refused", steps: 5, dir: here };
const policy = "blueprint/things/policy";

/** A copy of the app with Policy's stale refusal renamed `PolicyOutOfDate`, declared beside Policy; `more` plants one thing more. */
const renamed = (more: (intake: string) => void = () => {}) => {
  const root = copyApp();
  swapPlugins(root, (dirs) => {
    const intake = dirs["intake"]!;
    // The stale refusal sits in the middle of save's errors and first in restore's, beside errors of one field each, so a server or a compiler
    // that finds it by its place (first, last) or takes any one-field error is caught: it is found by what it carries, `current`.
    writeFileSync(join(intake, policy, "errors.ts"), `import { Blueprint } from "orthograph";\n\n/** A policy with more rules than a superagent may hold. */\nexport class PolicyTooLarge extends Blueprint.error({ limit: Blueprint.uint(32) }, { exit: 90 }) {}\n/** A save made from a version that is no longer the current one. */\nexport class PolicyOutOfDate extends Blueprint.error({ current: Blueprint.uint(32) }, { exit: 91 }) {}\n/** A policy a person has locked against changes. */\nexport class PolicyLocked extends Blueprint.error({ reason: Blueprint.text({ max: 200 }) }, { exit: 92 }) {}\n`);
    for (const [verb, errors] of [["save", "PolicyTooLarge, PolicyOutOfDate, PolicyLocked"], ["restore", "PolicyOutOfDate, PolicyTooLarge"]] as const) {
      edit(intake, `${policy}/verbs/${verb}.ts`, (t) => t.replace(`import { StaleRevision } from "@orthograph/superagent/blueprint/things/superagent/errors.ts";`, `import { PolicyTooLarge, PolicyOutOfDate, PolicyLocked } from "../errors.ts";`).replace("errors: [StaleRevision],", `errors: [${errors}],`));
    }
    more(intake);
  });
  return root;
};

const proved = lazy(async () => {
  const root = renamed();
  mkdirSync(join(root, "blueprint/starting-worlds"), { recursive: true });
  for (const f of readdirSync(join(fixtures, "starting-worlds"))) cpSync(join(fixtures, "starting-worlds", f), join(root, "blueprint/starting-worlds", f));
  mkdirSync(join(root, "journeys"), { recursive: true });
  cpSync(join(here, "journeys", WANT.file), join(root, "journeys", WANT.file));
  const generated = run(root, ["generate"]);
  expect(generated.status, `ortho generate on the renamed copy:\n${generated.out}`).toBe(0);
  return (await proveCopy(root)).journeys;
});

describe("25 a stale save in any app: controls", () => {
  it("the renamed copy is a correct blueprint: `ortho generate` and `ortho check` pass on it", () => {
    const root = renamed();
    const generated = run(root, ["generate"]);
    expect(generated.status, `ortho generate:\n${generated.out}`).toBe(0);
    const checked = run(root, ["check"]);
    expect(checked.status, `ortho check:\n${checked.out}`).toBe(0);
  });
});

describe("25 a stale save in any app", () => {
  it("a stale save and restore are refused with the app's own error when it is not named StaleRevision", async () => {
    expect(problemsOf(await proved(), WANT)).toEqual([]);
  }, 1_000_000);

  for (const verb of ["save", "restore"]) {
    it(`a versioned ${verb} that declares no stale refusal is refused by \`ortho check\`, naming policy.${verb}`, () => {
      const root = renamed((intake) => edit(intake, `${policy}/verbs/${verb}.ts`, (t) => t.replace(/errors: \[[^\]]*\],/, "errors: [],")));
      const generated = run(root, ["generate"]);
      const checked = generated.status === 0 ? run(root, ["check"]) : generated;
      expect(checked.status, `ortho generate and check accepted policy.${verb} with no stale refusal:\n${checked.out}`).not.toBe(0);
      expect(checked.out, "the refusal names the operation").toContain(`policy.${verb}`);
    });

    it(`a versioned ${verb} whose only declared error carries no \`current\` is refused by \`ortho check\`, naming policy.${verb}`, () => {
      const root = renamed((intake) => edit(intake, `${policy}/verbs/${verb}.ts`, (t) => t.replace(/errors: \[[^\]]*\],/, "errors: [PolicyTooLarge, PolicyLocked],")));
      const generated = run(root, ["generate"]);
      const checked = generated.status === 0 ? run(root, ["check"]) : generated;
      expect(checked.status, `ortho generate and check accepted policy.${verb} with no stale refusal among its errors:\n${checked.out}`).not.toBe(0);
      expect(checked.out, "the refusal names the operation").toContain(`policy.${verb}`);
    });
  }

  it("no framework package writes the superagent's error name as a string", () => {
    const found = spawnSync("git", ["grep", "-n", "-E", `["'\`]StaleRevision["'\`]`, "--", "packages", ":(exclude)**/*.test.ts", ":(exclude)**/generated/**"], { cwd: repo, encoding: "utf8" });
    expect(found.stdout.split("\n").filter((l) => l !== "")).toEqual([]);
  });
});
