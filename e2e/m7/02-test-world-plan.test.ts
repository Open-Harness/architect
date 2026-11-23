// Check 02 (M7.05; the plan half of "a pull request gets a test world"): `ortho env up test --plan --run <id>` prints, as one JSON document on stdout, what a pull request's world is made of, and `ortho env destroy test --plan --run <id>`
// prints the same list as what destroy would delete. It is check 37's plan (`e2e/m1/37-m7-03-staging-plan.test.ts`) for the environment Plugged In already declares for this, `blueprint/environments/test.ts`
// ("a fresh world for each pull request", `lifetime: "2 hours"`, `Cloud.cloudflare`): the same Worker, database and namespaces, derived from the model, under the run's prefix, with `test` where staging has `stg`.
// Neither verb reads a credential or opens a connection (every run is loaded with `e2e/m1/deny-network.mjs`, and no Cloudflare variable reaches the command); without `--plan` and without the two credentials, `up` and `destroy` refuse
// (exit 2, both names said) before anything is made. Written by the checks author; a builder never edits this file, `test-plan.ts`, `e2e/m1/staging-plan.ts` or check 37.
// THE CALL THIS PINS (and the open decision it rests on, in the pull request): a pull request's world is a per-run stack of its own, made and destroyed by the same `up` and `destroy` staging uses, named by the one prefix function
// (`ortho-<app>-test-<run>`); not a world inside a long-lived test Worker. What does not depend on that is in checks 01, 03 and 04.
// THE PREFIX IS FORMED IN ONE PLACE: `packages/cli/src/modules/staging/internal/plan.ts` is the only non-test source in `packages/` that spells `ortho-${`; the workflow types none (check 01), and a run of the test environment owns no name of a
// staging run with the same id, nor the other way round.
// Red today on one reason: `ortho env up` plans staging alone ("only staging is planned and deployed to the cloud so far"), and `destroy`/`up` without `--plan` name no credential for `test`. Controls, true today: the model declares the test environment; the
// judge passes the plan the model asks for and fails each planted wrong one; staging's plan is unchanged; no run owns another's names; the prefix is spelled in one place; the guard denies an outside host.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { DENIED, SHORT as STAGING_SHORT, VARIANTS, modelOf, ortho, planOf, project, quiet, says, snapshot, prefixOf as stagingPrefix } from "../m1/staging-plan.ts";
import { type Plan, ENVIRONMENT, SHORT, expected, owns, prefixOf, problems } from "./test-plan.ts";
import { repo } from "./support.ts";

const RUN = "pr7r19000000001";
const LONGEST = "pr99999r999999999999".slice(0, 20);
const OTHER = "pr8r19000000002";
const kept: Array<() => void> = [];
afterAll(() => { for (const k of kept.splice(0)) k(); });
/** A copy of Plugged In with a variant applied and `ortho generate` run on it (a few seconds each), made once per variant: no check here writes to its copy, and one asserts that planning writes nothing. */
const made = new Map<string, ReturnType<typeof project>>();
const copy = (variant: object = {}) => {
  const key = JSON.stringify(variant);
  let p = made.get(key);
  if (p === undefined) { p = project(variant, { staging: false }); made.set(key, p); kept.push(p.remove); }
  return p;
};
const planUp = (root: string, run: string | undefined, extra: ReadonlyArray<string> = []) => ortho(root, ["env", "up", ENVIRONMENT, "--plan", ...(run === undefined ? [] : ["--run", run]), ...extra]);
const planDestroy = (root: string, run: string) => ortho(root, ["env", "destroy", ENVIRONMENT, "--plan", "--run", run]);
const counts = (rs: Plan["resources"]) => rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.kind]: (n[r.kind] ?? 0) + 1 }), {});
const goodFor = (p: { root: string; app: string }, run: string): Plan => ({ app: p.app, environment: ENVIRONMENT, run, prefix: prefixOf(p.app, run), resources: expected(modelOf(p.root), prefixOf(p.app, run)) });

describe("02: ortho env up|destroy test --plan --run <id> (M7.05), with no cloud", () => {
  describe("controls (true today)", () => {
    it("Plugged In declares the test environment for a world per pull request, on Cloudflare with D1, living two hours", () => {
      const model = JSON.parse(readFileSync(join(repo, "examples/plugged-in/generated/model/model.json"), "utf8")) as { environments: Record<string, { runs: string; lifetimeMs: number | null; cloud: unknown }> };
      expect(model.environments["test"]).toMatchObject({ runs: "a fresh world for each pull request", lifetimeMs: 7_200_000, cloud: { provider: "cloudflare", database: "d1" } });
    });

    it("the judge passes the plan the model asks for, for the real example and for each variant", () => {
      const real = copy();
      expect(problems(goodFor(real, RUN), modelOf(real.root), real.app, RUN)).toEqual([]);
      expect(goodFor(real, RUN).prefix).toBe(`ortho-pluggedin-test-${RUN}`);
      expect(goodFor(real, RUN).resources.map((r) => r.kind).sort()).toEqual(["d1", "durable-object-namespace", "worker"]);
      for (const [name, variant] of Object.entries(VARIANTS)) {
        const p = copy(variant);
        expect(problems(goodFor(p, RUN), modelOf(p.root), p.app, RUN), name).toEqual([]);
      }
    });

    // Every thing the judge reads, planted wrong one way at a time: a wider type, one part left out, something added, something repeated, a name outside the prefix.
    const wrong: ReadonlyArray<readonly [string, (p: Plan) => unknown, RegExp]> = [
      ["a plan that is not an object", () => "plan", /not one JSON object/],
      ["a list for a plan", () => [], /not one JSON object/],
      ["null resources", (p) => ({ ...p, resources: null }), /resources is null/],
      ["staging as the environment", (p) => ({ ...p, environment: "staging" }), /environment is/],
      ["staging's prefix", (p) => ({ ...p, prefix: stagingPrefix("plugged-in", RUN) }), /prefix is/],
      ["the environment spelled out in the prefix", (p) => ({ ...p, prefix: `ortho-pluggedin-${ENVIRONMENT}s-${RUN}` }), /prefix is/],
      ["another run's prefix", (p) => ({ ...p, prefix: prefixOf("plugged-in", OTHER) }), /prefix is/],
      ["a number for the run", (p) => ({ ...p, run: 7 }), /run is/],
      ["the Worker left out", (p) => ({ ...p, resources: p.resources.filter((r) => r.kind !== "worker") }), /missing worker/],
      ["the database left out", (p) => ({ ...p, resources: p.resources.filter((r) => r.kind !== "d1") }), /missing d1/],
      ["the namespace left out", (p) => ({ ...p, resources: p.resources.filter((r) => r.kind !== "durable-object-namespace") }), /missing durable-object-namespace/],
      ["the database's binding left out", (p) => ({ ...p, resources: p.resources.map(({ binding: _b, ...r }) => r) }), /lacks binding/],
      ["an R2 bucket added", (p) => ({ ...p, resources: [...p.resources, { kind: "r2", name: `${p.prefix}-bucket` }] }), /unexpected r2/],
      ["a logbook Worker added (its place is an open decision, not this plan)", (p) => ({ ...p, resources: [...p.resources, { kind: "worker", name: `${p.prefix}-logbook` }] }), /unexpected worker/],
      ["a second database added", (p) => ({ ...p, resources: [...p.resources, { kind: "d1", name: `${p.prefix}-db-ledger`, binding: "DB_LEDGER" }] }), /unexpected d1/],
      ["the Worker twice", (p) => ({ ...p, resources: [...p.resources, p.resources[0]] }), /planned twice/],
      ["an extra member", (p) => ({ ...p, extra: "x" }), /the plan has extra/],
      ["a Worker named without the prefix", (p) => ({ ...p, resources: p.resources.map((r) => (r.kind === "worker" ? { ...r, name: "plugged-in" } : r)) }), /not under the run's prefix/],
      ["a database under staging's prefix", (p) => ({ ...p, resources: p.resources.map((r) => (r.kind === "d1" ? { ...r, name: `${stagingPrefix("plugged-in", RUN)}-db` } : r)) }), /not under the run's prefix/],
      ["a name that continues the prefix with no dash", (p) => ({ ...p, resources: p.resources.map((r) => (r.kind === "d1" ? { ...r, name: `${p.prefix}x-db` } : r)) }), /not under the run's prefix/],
    ];
    it.each(wrong)("the judge fails %s", (name, make, say) => {
      const p = copy();
      const found = problems(make(goodFor(p, RUN)), modelOf(p.root), p.app, RUN);
      expect(found.length, `nothing was wrong with ${name}`).toBeGreaterThan(0);
      expect(found.join("\n")).toMatch(say);
    });

    it("a test run and a staging run with the same id own none of each other's names, and `1` does not own `12`", () => {
      for (const [a, b] of [[prefixOf("plugged-in", RUN), stagingPrefix("plugged-in", RUN)], [stagingPrefix("plugged-in", RUN), prefixOf("plugged-in", RUN)]] as const) {
        expect(owns(a, `${b}-worker`)).toBe(false);
        expect(owns(a, b)).toBe(false);
      }
      expect(owns(prefixOf("plugged-in", "1"), `${prefixOf("plugged-in", "12")}-worker`)).toBe(false);
      expect([SHORT, STAGING_SHORT]).toEqual(["test", "stg"]);
    });

    it("staging is still planned as staging (the test environment changes nothing of it)", () => {
      const p = copy();
      const ran = ortho(p.root, ["env", "up", "staging", "--plan", "--run", RUN]);
      expect((JSON.parse(ran.out) as Plan).prefix, says(ran)).toBe(stagingPrefix("plugged-in", RUN));
    });

    it("the prefix is spelled in one place: only the plan module's source has `ortho-${`", () => {
      const spellings = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const path = join(dir, e.name);
        if (e.isDirectory()) return e.name === "node_modules" || e.name === "dist" || e.name === "generated" ? [] : spellings(path);
        return /\.(ts|mjs)$/.test(e.name) && !/\.test\.|\.d\.ts$/.test(e.name) && /ortho-\$\{/.test(readFileSync(path, "utf8")) ? [path.slice(repo.length + 1)] : [];
      });
      expect(spellings(join(repo, "packages"))).toEqual(["packages/cli/src/modules/staging/internal/plan.ts"]);
      // The scan finds a second spelling when there is one (a plant on a copy of the tree), so an empty answer elsewhere means something.
      const tree = mkdtempSync(join(tmpdir(), "ortho-m7-scan-"));
      kept.push(() => rmSync(tree, { recursive: true, force: true }));
      mkdirSync(join(tree, "a/src"), { recursive: true });
      writeFileSync(join(tree, "a/src/second.ts"), "export const p = (r: string) => `ortho-${r}`;\n");
      writeFileSync(join(tree, "a/src/second.test.ts"), "export const p = (r: string) => `ortho-${r}`;\n");
      expect(spellings(tree)).toEqual([join(tree, "a/src/second.ts").slice(repo.length + 1)]);
    });

    it("the guard ends a process that reaches for a host outside this machine", () => {
      const done = spawnSync(process.execPath, ["--input-type=module", "-e", `try { await fetch("https://test-world-check.invalid/"); } catch {} console.log("went on");`], { encoding: "utf8", env: quiet(), timeout: 30_000 });
      expect(done.stderr).toContain(`${DENIED} test-world-check.invalid`);
    });
  });

  describe("the plan, from the model", () => {
    it("`ortho env up test --plan --run <id>` plans a Worker, a database and the World namespace, every name under the run's prefix", () => {
      const p = copy();
      const ran = planUp(p.root, RUN);
      const printed = planOf(ran, "`ortho env up test --plan --run <id>`");
      expect(problems(printed, modelOf(p.root), p.app, RUN)).toEqual([]);
      expect(counts((printed as Plan).resources)).toEqual({ worker: 1, d1: 1, "durable-object-namespace": 1 });
      expect(ran.err).not.toContain(DENIED);
    });

    it.each(Object.entries(VARIANTS))("a model with %s plans what that model needs", (name, variant) => {
      const p = copy(variant);
      const printed = planOf(planUp(p.root, RUN), `\`ortho env up test --plan --run <id>\` (${name})`) as Plan;
      expect(problems(printed, modelOf(p.root), p.app, RUN)).toEqual([]);
    });

    it("the longest run id the workflow makes (20 letters and digits) is planned, and a name Cloudflare would refuse is refused before anything is made", () => {
      const p = copy();
      const printed = planOf(planUp(p.root, LONGEST), "the plan for the longest run id") as Plan;
      expect(LONGEST).toMatch(/^[a-z0-9]{20}$/);
      expect(problems(printed, modelOf(p.root), p.app, LONGEST)).toEqual([]);
      expect(Math.max(...printed.resources.map((r) => (r.name ?? r.script ?? "").length))).toBeLessThanOrEqual(63);
    });

    it("another run is the same plan with the run's text replaced, and nothing else; nothing of one run is in the other", () => {
      const p = copy();
      const a = planOf(planUp(p.root, RUN), "plan for run A") as Plan;
      const b = planOf(planUp(p.root, OTHER), "plan for run B") as Plan;
      expect(problems(b, modelOf(p.root), p.app, OTHER)).toEqual([]);
      const swap = (v: unknown): unknown => typeof v === "string" ? v.replaceAll(a.prefix, b.prefix) : Array.isArray(v) ? v.map(swap) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)])) : v;
      expect(swap({ ...a, run: OTHER })).toEqual(b);
      expect(JSON.stringify(b)).not.toContain(a.prefix);
    });

    it("a project's configured name is the app's: another name, another prefix, and every name follows", () => {
      const p = copy(VARIANTS["another project name"]);
      const printed = planOf(planUp(p.root, RUN), "plan under another name") as Plan;
      expect(printed.prefix).toBe(`ortho-acmelinks-test-${RUN}`);
      expect(JSON.stringify(printed)).not.toContain("pluggedin");
    });

    it("destroy's plan is the same list: what `up` would make is what `destroy` would delete, by the same prefix", () => {
      const p = copy();
      const up = planOf(planUp(p.root, RUN), "the up plan") as Plan;
      const down = planOf(planDestroy(p.root, RUN), "`ortho env destroy test --plan --run <id>`") as Plan;
      expect(down).toEqual(up);
    });

    it("planning is deterministic, writes nothing, and holds no credential: the project is byte for byte as it was", () => {
      const p = copy();
      const before = snapshot(p.root);
      const first = planUp(p.root, RUN);
      planOf(first, "the first plan");
      expect(planUp(p.root, RUN).out).toBe(first.out);
      expect(first.out.endsWith("\n")).toBe(true);
      expect(snapshot(p.root)).toEqual(before);
    });
  });

  describe("refused before anything is made", () => {
    const bad: ReadonlyArray<readonly [string, ReadonlyArray<string> | undefined]> = [
      ["no --run", undefined], ["an empty run", [""]], ["an upper-case run", ["Pr7"]], ["a run with a dash", ["pr7-1"]], ["a run with a slash", ["../1"]], ["a run of 21 characters", ["1".repeat(21)]],
    ];
    it.each(bad)("%s: exit 2, a line naming --run, no plan on stdout", (_name, run) => {
      const ran = planUp(copy().root, undefined, run === undefined ? [] : ["--run", run[0]!]);
      expect(ran.status, `${_name}: ${says(ran)}`).toBe(2);
      expect(ran.out.trim()).toBe("");
      expect(ran.err).toMatch(/--run|run id/i);
    });

    it.each(["up", "destroy"])("`%s test --run <id>` without the two credentials: exit 2, both names said, no connection, nothing written", (verb) => {
      const p = copy();
      const before = snapshot(p.root);
      const ran = ortho(p.root, ["env", verb, ENVIRONMENT, "--run", RUN]);
      expect(ran.status, says(ran)).toBe(2);
      expect(ran.err).toContain("CLOUDFLARE_API_TOKEN");
      expect(ran.err).toContain("CLOUDFLARE_ACCOUNT_ID");
      expect(ran.err).not.toContain(DENIED);
      expect(snapshot(p.root)).toEqual(before);
    });

    it("an environment that is not the test one and not staging is still refused (no world is planned for local)", () => {
      const ran = ortho(copy().root, ["env", "up", "local", "--plan", "--run", RUN]);
      expect(ran.status).toBe(2);
      expect(ran.out.trim()).toBe("");
    });
  });
});
