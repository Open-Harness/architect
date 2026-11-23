// Check 37 (M7.03, the infra projection; `design/milestones.md`, `design/decisions/M7-cloud.md` and its addenda): `ortho env up staging --plan --run <id>` prints the plan of what a
// staging deploy would make, from the model, and nothing else happens. Written by the checks author; a builder never edits this file or `staging-plan.ts` (AGENTS.md,
// "Journeys and checks come first"). It never touches the cloud: no credential reaches the command and every run is loaded with `deny-network.mjs`, which ends the process on
// the first connection to a host that is not this machine.
//
// THE PLAN SURFACE PINNED, AND WHY.
//   ortho env up      staging --plan --run <id> [--root <dir>]     the resources `up` would make
//   ortho env destroy staging --plan --run <id> [--root <dir>]     the resources `destroy` would delete: the same list
// Both exit 0 and print ONE JSON document on stdout, write nothing, read no credential and make no network call. `--plan` is a flag of the real verb, not a verb of its own, because the
// spike (`spikes/staging-pass`, snag 12) found that destroy by name needs no state from `up`: so a plan is only the list of names, computed in one place, and `up` and `destroy` run
// the same function they print. A flag keeps the printed plan and the executed one from being two code paths. It is JSON on stdout because `ortho model --json` and
// `ortho prove --json` already print structured data that way, and the staging workflow reads `prefix` from it (`.github/workflows/staging.yml`).
//
//   { "app": "plugged-in", "environment": "staging", "run": "<id>", "prefix": "ortho-pluggedin-stg-<id>",
//     "resources": [ { "kind": "worker", "name": "<prefix>-worker" },
//                    { "kind": "d1", "name": "<prefix>-db", "binding": "DB" },
//                    { "kind": "durable-object-namespace", "script": "<prefix>-worker", "class": "World" } ] }
//
// WHAT THE PLAN MUST HOLD (all of it derived from `generated/model/model.json`, the project's configured name, the environment and the run, never typed by the builder):
//   - the prefix is `ortho-<the app's name, letters and digits only>-stg-<run>`, formed in one place (`design/decisions/M7-cloud.md`, addendum item 1). Every resource name, and every
//     namespace's script, is the prefix or continues it past a dash, so run `1` never owns run `12`'s resources. Another run id changes the prefix and nothing else;
//   - one Worker `<prefix>-worker`; one D1 database `<prefix>-db` bound as `DB`, and one `<prefix>-db-<store>` bound as `DB_<STORE>` for each declared database store (K3 item 5);
//   - the Durable Object namespaces the Worker needs: `World` always, and `Actor` when some thing lives as an actor (K3: all actor things share the one namespace, "a namespace of its
//     own per actor store is not made", `packages/projections/.../worker-config.ts`). So "one more thing" adds a database only when it is in a store, and a namespace only when it
//     is the first to live as an actor: the model has no one-namespace-per-thing rule to pin, and the plan follows the model's;
//   - no R2 bucket (nothing in the model needs one) and no Worker for a collector or a sink. Staging carries none: a Worker cannot export OTLP to another `workers.dev` Worker (spike
//     snag 8) and `M7-cloud.md` has staging run without traces until an external sink is set. The list is exact: a resource the model does not need fails as surely as a missing one.
//   - a name Cloudflare would reject is refused: the plan exits 2 with no plan when the app's name or a database store's name would make a resource name longer than 63 characters (a Worker's
//     limit with `workers.dev`; Cloudflare states none for D1, so 63 is held there too), and says which name is too long. The longest that is still planned is planned.
//   - the run id is `[a-z0-9]{1,20}`; no `--run`, an empty, upper-case, dashed, slashed or too long one is refused with exit 2 and no plan, so a prefix can never be ambiguous.
// The same plan, byte for byte, on every run with the same inputs. `up` and `destroy` without credentials say so (naming `CLOUDFLARE_API_TOKEN`) and do not reach for the network.
//
// WHAT IS READ. The plan's `app`, `environment`, `run`, `prefix` and `resources` (each resource's kind and exactly its fields); the exit code, stdout and stderr of each command; the files
// of the project before and after. The variants (a thing in the default database, in a database store, as an actor, two as actors, another project name) are the inputs.
//
// Red today on one reason: `ortho env` knows `up`, `down` and `status` for a long-lived local environment and has no `--plan`, no `--run` and no `destroy`; and Plugged In declares no `staging`
// environment (spike snag 3), which the one test on the real example says in its own words. Controls, true today: the judge passes the right plan and fails each planted wrong one; a hard-coded
// plan fails the variants; the network guard catches a fetch; each variant changes the model as the table says.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  DENIED, ENVIRONMENT, MAX_NAME, VARIANTS, expected, longestName, maxApp, maxStore, modelOf, storeVariant, ortho, owns, plan, planOf, prefixOf, problems, project, pluggedIn, quiet, says, snapshot,
  type Plan, type PlanModel, type Project, type Resource, type Variant,
} from "./staging-plan.ts";

const RUN = "4417200010";
const OTHER = "4417200011";
const made: Project[] = [];
afterAll(() => { for (const p of made.splice(0)) p.remove(); });
const cache = new Map<string, Project>();
/** One generated copy per variant (and one of the real example as it stands), made when first asked for and shared: plans only read them. */
const copyOf = (name: string, variant: Variant = {}, options: { readonly staging?: boolean } = {}): Project => {
  const key = `${name}|${options.staging ?? true}`;
  const have = cache.get(key);
  if (have) return have;
  const p = project(variant, options);
  made.push(p);
  cache.set(key, p);
  return p;
};
const base = () => copyOf("base");

/** What a right plan is, written from a copy's own model (so a variant has its own); the same pure function the controls plant their wrong ones against. */
const planFor = (model: PlanModel, app: string, run: string): Plan => ({
  app, environment: ENVIRONMENT, run, prefix: prefixOf(app, run), resources: expected(model, prefixOf(app, run)) as ReadonlyArray<Resource>,
});
const counts = (resources: ReadonlyArray<Resource>) => resources.reduce<Record<string, number>>((n, r) => ({ ...n, [r.kind]: (n[r.kind] ?? 0) + 1 }), {});

describe("37: the infra projection plans staging (M7.03), with no cloud", () => {
  describe("controls (true today)", () => {
    const model = (): PlanModel => modelOf(base().root);
    const good = () => planFor(model(), base().app, RUN);

    it("the variants change the model as the table says: a store, an actor, two actors, a name; Plugged In itself has no store and no actor thing", () => {
      const m = modelOf(base().root);
      expect(m.stores ?? {}).toEqual({});
      expect(Object.values(m.things).filter((t) => t.lives === "actor")).toEqual([]);
      expect(Object.keys(modelOf(copyOf("store", VARIANTS["one more thing, in a database store of its own"]).root).stores ?? {})).toEqual(["ledger"]);
      expect(Object.values(modelOf(copyOf("actor", VARIANTS["one more thing, living as an actor"]).root).things).filter((t) => t.lives === "actor")).toHaveLength(1);
      expect(Object.values(modelOf(copyOf("actors", VARIANTS["two more things, both living as actors"]).root).things).filter((t) => t.lives === "actor")).toHaveLength(2);
      expect(copyOf("name", VARIANTS["another project name"]).app).toBe("acme-links");
      expect(base().app).toBe("plugged-in");
    });

    it("the judge passes the plan the model asks for, for the real example and for each variant", () => {
      expect(problems(good(), model(), base().app, RUN)).toEqual([]);
      for (const [name, variant] of Object.entries(VARIANTS)) {
        const p = copyOf(name, variant);
        expect(problems(planFor(modelOf(p.root), p.app, RUN), modelOf(p.root), p.app, RUN), name).toEqual([]);
      }
      expect(good().resources.map((r) => r.kind).sort()).toEqual(["d1", "durable-object-namespace", "worker"]);
    });

    // Every thing the judge reads, planted wrong one way at a time: a wider type, one part left out, something added, something repeated, two pointing at one target, a name outside the prefix.
    const wrong: ReadonlyArray<readonly [string, (p: Plan) => unknown, RegExp]> = [
      ["a plan that is not an object", () => "plan", /not one JSON object/],
      ["a list for a plan", () => [], /not one JSON object/],
      ["null resources", (p) => ({ ...p, resources: null }), /resources is null/],
      ["resources as one object", (p) => ({ ...p, resources: p.resources[0] }), /expected a list/],
      ["a number for the run", (p) => ({ ...p, run: Number(RUN) }), /run is/],
      ["another run", (p) => ({ ...p, run: OTHER }), /run is/],
      ["no run field", (p) => ({ ...p, run: undefined }), /run is undefined/],
      ["another environment", (p) => ({ ...p, environment: "production" }), /environment is/],
      ["another app name", (p) => ({ ...p, app: "acme" }), /app is/],
      ["the app name with its dash kept in the prefix", (p) => ({ ...p, prefix: `ortho-plugged-in-stg-${RUN}` }), /prefix is/],
      ["the environment spelled out in the prefix", (p) => ({ ...p, prefix: `ortho-pluggedin-staging-${RUN}` }), /prefix is/],
      ["another run's prefix", (p) => ({ ...p, prefix: prefixOf("plugged-in", OTHER) }), /prefix is/],
      ["no prefix field", (p) => ({ ...p, prefix: undefined }), /prefix is undefined/],
      ["the Worker left out", (p) => ({ ...p, resources: p.resources.filter((r) => r.kind !== "worker") }), /missing worker/],
      ["the database left out", (p) => ({ ...p, resources: p.resources.filter((r) => r.kind !== "d1") }), /missing d1/],
      ["the World namespace left out", (p) => ({ ...p, resources: p.resources.filter((r) => r.kind !== "durable-object-namespace") }), /missing durable-object-namespace/],
      ["no resources at all", (p) => ({ ...p, resources: [] }), /missing worker/],
      ["the database's binding left out", (p) => ({ ...p, resources: p.resources.map(({ binding: _binding, ...r }) => r) }), /lacks binding/],
      ["the namespace's class left out", (p) => ({ ...p, resources: p.resources.map(({ class: _class, ...r }) => r) }), /lacks class/],
      ["the Worker's name left out", (p) => ({ ...p, resources: p.resources.map(({ name: _name, ...r }) => r) }), /lacks name/],
      ["a null for a name", (p) => ({ ...p, resources: p.resources.map((r) => (r.kind === "worker" ? { ...r, name: null } : r)) }), /lacks name/],
      ["a resource of an unknown kind", (p) => ({ ...p, resources: [...p.resources, { kind: "queue", name: `${prefixOf("plugged-in", RUN)}-q` }] }), /not a resource of a known kind/],
      ["an extra top-level member", (p) => ({ ...p, extra: "x" }), /the plan has extra/],
      ["an inherited name for a kind", (p) => ({ ...p, resources: [...p.resources, { kind: "constructor", name: "x" }] }), /not a resource of a known kind/],
      ["__proto__ for a kind", (p) => ({ ...p, resources: [...p.resources, { kind: "__proto__", name: "x" }] }), /not a resource of a known kind/],
      ["resources as an object with numeric keys", (p) => ({ ...p, resources: { 0: p.resources[0], 1: p.resources[1], 2: p.resources[2], length: 3 } }), /expected a list/],
      ["a resource that is a string", (p) => ({ ...p, resources: [...p.resources, "worker"] }), /not a resource of a known kind/],
      ["an extra field on a Worker", (p) => ({ ...p, resources: p.resources.map((r) => (r.kind === "worker" ? { ...r, route: "x.workers.dev" } : r)) }), /does not carry/],
      ["a sink Worker added", (p) => ({ ...p, resources: [...p.resources, { kind: "worker", name: `${prefixOf("plugged-in", RUN)}-sink` }] }), /unexpected worker/],
      ["an R2 bucket added", (p) => ({ ...p, resources: [...p.resources, { kind: "r2", name: `${prefixOf("plugged-in", RUN)}-bucket` }] }), /unexpected r2/],
      ["a second database added", (p) => ({ ...p, resources: [...p.resources, { kind: "d1", name: `${prefixOf("plugged-in", RUN)}-db-ledger`, binding: "DB_LEDGER" }] }), /unexpected d1/],
      ["an Actor namespace added to a model with no actor", (p) => ({ ...p, resources: [...p.resources, { kind: "durable-object-namespace", script: `${prefixOf("plugged-in", RUN)}-worker`, class: "Actor" }] }), /unexpected durable-object-namespace/],
      ["the Worker twice", (p) => ({ ...p, resources: [...p.resources, p.resources[0]] }), /planned twice/],
      ["two databases with one name", (p) => ({ ...p, resources: [...p.resources, { kind: "d1", name: `${prefixOf("plugged-in", RUN)}-db`, binding: "DB_OTHER" }] }), /named by 2 resources|unexpected d1/],
      ["a Worker with no prefix", (p) => ({ ...p, resources: p.resources.map((r) => (r.kind === "worker" ? { ...r, name: "plugged-in" } : r)) }), /not under the run's prefix/],
      ["a database under another run's prefix", (p) => ({ ...p, resources: p.resources.map((r) => (r.kind === "d1" ? { ...r, name: `${prefixOf("plugged-in", OTHER)}-db` } : r)) }), /not under the run's prefix/],
      ["a name that continues the prefix with no dash", (p) => ({ ...p, resources: p.resources.map((r) => (r.kind === "d1" ? { ...r, name: `${p.prefix}x-db` } : r)) }), /not under the run's prefix/],
      ["a namespace whose script is not the run's", (p) => ({ ...p, resources: p.resources.map((r) => (r.kind === "durable-object-namespace" ? { ...r, script: "someone-elses-worker" } : r)) }), /not under the run's prefix/],
      ["the Worker named after the old spike", (p) => ({ ...p, resources: p.resources.map((r) => (r.kind === "worker" ? { ...r, name: `ortho-staging-pass-${RUN}-plugged-in` } : r)) }), /not under the run's prefix/],
    ];
    it.each(wrong)("the judge fails %s", (_name, make, say) => {
      const found = problems(make(good()), model(), base().app, RUN);
      expect(found.length, `nothing was wrong with ${_name}`).toBeGreaterThan(0);
      expect(found.join("\n")).toMatch(say);
    });

    it("a plan typed out for Plugged In passes Plugged In and fails the variants that change what it needs (a hard-coded plan is caught)", () => {
      const typed = good();
      expect(problems(typed, model(), base().app, RUN)).toEqual([]);
      const verdict = (name: string) => { const p = copyOf(name, VARIANTS[name as keyof typeof VARIANTS]); return problems(typed, modelOf(p.root), p.app, RUN); };
      expect(verdict("one more thing, in the default database")).toEqual([]);
      expect(verdict("one more thing, in a database store of its own").join("\n")).toMatch(/missing d1 .*-db-ledger/);
      expect(verdict("one more thing, living as an actor").join("\n")).toMatch(/missing durable-object-namespace .*:Actor/);
      expect(verdict("two more things, both living as actors").join("\n")).toMatch(/missing durable-object-namespace .*:Actor/);
      expect(verdict("another project name").join("\n")).toMatch(/app is "plugged-in", expected "acme-links"/);
    });

    it("a run owns its own names and not a longer run's: `1` does not own `12`", () => {
      expect(owns(prefixOf("plugged-in", "1"), `${prefixOf("plugged-in", "1")}-worker`)).toBe(true);
      expect(owns(prefixOf("plugged-in", "1"), `${prefixOf("plugged-in", "12")}-worker`)).toBe(false);
      expect(owns(prefixOf("plugged-in", "12"), prefixOf("plugged-in", "1"))).toBe(false);
      expect(prefixOf("plugged-in", RUN)).toBe(`ortho-pluggedin-stg-${RUN}`);
    });

    it("the network guard ends a process that reaches for a host outside this machine, and lets a local one through", () => {
      const reach = (url: string) => spawnSync(process.execPath, ["--input-type=module", "-e", `try { await fetch(${JSON.stringify(url)}); } catch {} console.log("went on");`], { encoding: "utf8", env: quiet(), timeout: 30_000 });
      // An address that cannot resolve: even without the guard nothing reaches the cloud.
      const outsider = reach("https://staging-check.invalid/");
      expect(outsider.stderr).toContain(`${DENIED} staging-check.invalid`);
      expect(outsider.stdout).not.toContain("went on");
      const local = reach("http://127.0.0.1:9/");
      expect(local.stderr).not.toContain(DENIED);
      expect(local.stdout).toContain("went on");
    });

    it("the network guard also ends a direct connection by address (net.createConnection and net.connect, which bypass DNS), and lets a local one through", () => {
      const probe = (code: string) => spawnSync(process.execPath, ["--input-type=module", "-e", `import net from "node:net"; ${code}; await new Promise((r) => setTimeout(r, 300)); console.log("went on");`], { encoding: "utf8", env: quiet(), timeout: 30_000 });
      for (const [what, code] of [
        ["createConnection with an options object", `net.createConnection({ host: "203.0.113.7", port: 9 }).on("error", () => {})`],
        ["connect with a port and a host", `net.connect(9, "203.0.113.7").on("error", () => {})`],
        ["a socket's own connect", `new net.Socket().on("error", () => {}).connect({ host: "203.0.113.7", port: 9 })`],
      ] as const) {
        const ran = probe(code);
        expect(ran.stderr, what).toContain(`${DENIED} 203.0.113.7`);
        expect(ran.stdout, what).not.toContain("went on");
      }
      const local = probe(`net.createConnection({ host: "127.0.0.1", port: 9 }).on("error", () => {})`);
      expect(local.stderr).not.toContain(DENIED);
      expect(local.stdout).toContain("went on");
    });

    it("the command's environment has no Cloudflare credential, whatever the shell holds", () => {
      const held = process.env["CLOUDFLARE_API_TOKEN"];
      process.env["CLOUDFLARE_API_TOKEN"] = "not-a-token";
      try { expect(Object.keys(quiet()).filter((k) => /^(CLOUDFLARE_|CF_|WRANGLER_)/.test(k))).toEqual([]); }
      finally { if (held === undefined) delete process.env["CLOUDFLARE_API_TOKEN"]; else process.env["CLOUDFLARE_API_TOKEN"] = held; }
    });
  });

  describe("plugged in's own staging", () => {
    it("Plugged In declares a staging environment on Cloudflare with D1, in blueprint/environments/staging.ts and in its model (spike snag 3)", () => {
      expect(existsSync(join(pluggedIn, "blueprint/environments/staging.ts")), "examples/plugged-in/blueprint/environments/staging.ts does not exist").toBe(true);
      const model = JSON.parse(readFileSync(join(pluggedIn, "generated/model/model.json"), "utf8")) as { environments: Record<string, { cloud: unknown }> };
      expect(model.environments["staging"]?.cloud).toEqual({ provider: "cloudflare", database: "d1" });
    });

    it("`ortho env up staging --plan` on a copy of Plugged In exactly as it stands plans what its model needs", () => {
      const p = copyOf("real", {}, { staging: false });
      const printed = planOf(plan(p.root, "up", RUN), "`ortho env up staging --plan --run <id>` on Plugged In as it stands");
      expect(problems(printed, modelOf(p.root), p.app, RUN)).toEqual([]);
    });
  });

  describe("the plan, from the model", () => {
    it("`ortho env up staging --plan --run <id>` plans a Worker, a database and the World namespace, every name under the run's prefix", () => {
      const p = base();
      const printed = planOf(plan(p.root, "up", RUN), "`ortho env up staging --plan --run <id>`");
      expect(problems(printed, modelOf(p.root), p.app, RUN)).toEqual([]);
      expect(counts((printed as Plan).resources)).toEqual({ worker: 1, d1: 1, "durable-object-namespace": 1 });
    });

    it.each(Object.entries(VARIANTS))("a model with %s plans what that model needs", (name, variant) => {
      const p = copyOf(name, variant);
      const printed = planOf(plan(p.root, "up", RUN), `\`ortho env up staging --plan --run <id>\` (${name})`) as Plan;
      expect(problems(printed, modelOf(p.root), p.app, RUN)).toEqual([]);
      // And what it adds to Plugged In's own plan, said outright: the rule in the header, not the judge's own function.
      const before = planOf(plan(base().root, "up", RUN), "the base plan") as Plan;
      const delta = (kind: string) => (counts(printed.resources)[kind] ?? 0) - (counts(before.resources)[kind] ?? 0);
      const adds: Record<string, readonly [number, number]> = {
        "one more thing, in the default database": [0, 0],
        "one more thing, in a database store of its own": [1, 0],
        "one more thing, living as an actor": [0, 1],
        "two more things, both living as actors": [0, 1],
        "another project name": [0, 0],
      };
      expect([delta("d1"), delta("durable-object-namespace")], `${name} adds [databases, namespaces]`).toEqual(adds[name]);
      expect(delta("worker")).toBe(0);
    });

    it("the prefix is formed in one place: another run is the same plan with the run's text replaced, and nothing else", () => {
      const p = base();
      const a = planOf(plan(p.root, "up", RUN), "plan for run A") as Plan;
      const b = planOf(plan(p.root, "up", OTHER), "plan for run B") as Plan;
      expect(problems(b, modelOf(p.root), p.app, OTHER)).toEqual([]);
      const swap = (v: unknown): unknown => typeof v === "string" ? v.replaceAll(a.prefix, b.prefix) : Array.isArray(v) ? v.map(swap) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)])) : v;
      expect(swap({ ...a, run: OTHER })).toEqual(b);
      // Nothing of run A's is in run B's plan.
      expect(JSON.stringify(b)).not.toContain(a.prefix);
    });

    it("a project's configured name is the app's: another name, another prefix, and every name follows", () => {
      const p = copyOf("name", VARIANTS["another project name"]);
      const printed = planOf(plan(p.root, "up", RUN), "plan under another name") as Plan;
      expect(printed.app).toBe("acme-links");
      expect(printed.prefix).toBe(`ortho-acmelinks-stg-${RUN}`);
      expect(printed.resources.every((r) => owns(printed.prefix, r.kind === "durable-object-namespace" ? r.script! : r.name!))).toBe(true);
      expect(JSON.stringify(printed)).not.toContain("pluggedin");
    });

    it("the plan is deterministic: the same inputs, byte for byte, twice, and again after generate runs once more", () => {
      const p = base();
      const first = plan(p.root, "up", RUN);
      const second = plan(p.root, "up", RUN);
      planOf(first, "the first plan");
      expect(second.out).toBe(first.out);
      expect(first.out.endsWith("\n")).toBe(true);
      const again = ortho(p.root, ["generate"]);
      expect(again.status, again.err).toBe(0);
      expect(plan(p.root, "up", RUN).out).toBe(first.out);
    });

    it("planning writes nothing: the project is byte for byte as it was, dot-folders too", () => {
      const p = base();
      const before = snapshot(p.root);
      planOf(plan(p.root, "up", RUN), "the plan");
      expect(snapshot(p.root)).toEqual(before);
    });

    it("planning needs no credential and no network: the command holds no Cloudflare variable and any outside connection ends it", () => {
      const p = base();
      const ran = plan(p.root, "up", RUN);
      expect(ran.err).not.toContain(DENIED);
      planOf(ran, "the plan with no credential and the network denied");
    });
  });

  describe("a run id that could make a prefix ambiguous is refused", () => {
    const refused: ReadonlyArray<readonly [string, ReadonlyArray<string> | undefined]> = [
      ["no --run", undefined],
      ["an empty run", [""]],
      ["an upper-case run", ["Run1"]],
      ["a run with a dash", ["12-3"]],
      ["a run with a slash", ["../1"]],
      ["a run with a space", ["1 2"]],
      ["a run of 21 characters", ["1".repeat(21)]],
    ];
    it.each(refused)("%s: exit 2, a line naming --run, no plan on stdout", (_name, run) => {
      const ran = plan(base().root, "up", undefined, run === undefined ? [] : ["--run", run[0]!]);
      expect(ran.status, `${_name}: ${says(ran)}`).toBe(2);
      expect(ran.out.trim()).toBe("");
      expect(ran.err).toMatch(/--run|run id/i);
      expect(ran.err).not.toContain(DENIED);
    });

    it("the limit's arithmetic: with a 10-character run an app of maxApp letters makes a 63-character Worker, and one more makes 64; a store likewise (a control, true today)", () => {
      const m = modelOf(base().root);
      expect(MAX_NAME).toBe(63);
      expect(longestName(m, prefixOf("a".repeat(maxApp(RUN)), RUN))).toBe(MAX_NAME);
      expect(longestName(m, prefixOf("a".repeat(maxApp(RUN) + 1), RUN))).toBe(MAX_NAME + 1);
      expect(`${prefixOf(base().app, RUN)}-db-${"s".repeat(maxStore(base().app, RUN))}`).toHaveLength(MAX_NAME);
    });

    it("an app whose name would make a Worker name over 63 characters is refused: exit 2, a line saying the name is too long, no plan on stdout", () => {
      const copy = copyOf("long-app", { name: "a".repeat(maxApp(RUN) + 1) });
      for (const verb of ["up", "destroy"] as const) {
        const ran = plan(copy.root, verb, RUN);
        expect(ran.status, `${verb}: ${says(ran)}`).toBe(2);
        expect(ran.out.trim()).toBe("");
        expect(ran.err).toMatch(/too long|63/i);
        expect(ran.err).not.toContain(DENIED);
      }
    });

    it("an app of exactly the longest name is planned, every name 63 characters or fewer", () => {
      const copy = copyOf("longest-app", { name: "a".repeat(maxApp(RUN)) });
      const made = planOf(plan(copy.root, "up", RUN), "the plan for the longest app") as Plan;
      expect(made.resources.map((r) => (r.name ?? r.script ?? "").length).filter((n) => n > MAX_NAME)).toEqual([]);
      expect(problems(made, modelOf(copy.root), copy.app, RUN)).toEqual([]);
    });

    it("a database store whose name would make a database name over 63 characters is refused: exit 2, a line naming the store, no plan on stdout", () => {
      const store = "s".repeat(maxStore(base().app, RUN) + 1);
      const ran = plan(copyOf("long-store", storeVariant(store)).root, "up", RUN);
      expect(ran.status, says(ran)).toBe(2);
      expect(ran.out.trim()).toBe("");
      expect(ran.err).toContain(store);
      expect(ran.err).toMatch(/too long|63/i);
    });

    it("a database store of exactly the longest name is planned", () => {
      const store = "s".repeat(maxStore(base().app, RUN));
      const copy = copyOf("longest-store", storeVariant(store));
      const made = planOf(plan(copy.root, "up", RUN), "the plan for the longest store") as Plan;
      expect(made.resources.map((r) => r.name)).toContain(`${prefixOf(copy.app, RUN)}-db-${store}`);
      expect(problems(made, modelOf(copy.root), copy.app, RUN)).toEqual([]);
    });

    it("an environment that is not declared is refused naming it, with no plan", () => {
      const ran = ortho(base().root, ["env", "up", "nonesuch", "--plan", "--run", RUN]);
      expect(ran.status, says(ran)).toBe(2);
      expect(ran.out.trim()).toBe("");
      expect(ran.err).toContain("nonesuch");
    });
  });

  describe("destroy plans the same resources, from names alone", () => {
    it("`ortho env destroy staging --plan --run <id>` on a project nothing was ever deployed from lists what `up` makes, and nothing more", () => {
      const p = base();
      const up = planOf(plan(p.root, "up", RUN), "the up plan") as Plan;
      const destroy = planOf(plan(p.root, "destroy", RUN), "`ortho env destroy staging --plan --run <id>`") as Plan;
      expect(problems(destroy, modelOf(p.root), p.app, RUN)).toEqual([]);
      expect(destroy).toEqual(up);
      expect(existsSync(join(p.root, ".ortho")), "a plan made a state folder").toBe(false);
    });

    it.each(Object.entries(VARIANTS))("destroy and up agree for a model with %s", (name, variant) => {
      const p = copyOf(name, variant);
      expect(planOf(plan(p.root, "destroy", RUN), `destroy plan (${name})`)).toEqual(planOf(plan(p.root, "up", RUN), `up plan (${name})`));
    });

    it("destroy for run `1` names nothing that run `12` made", () => {
      const p = base();
      const one = planOf(plan(p.root, "destroy", "1"), "destroy plan for run 1") as Plan;
      const twelve = planOf(plan(p.root, "destroy", "12"), "destroy plan for run 12") as Plan;
      expect(one.resources.every((r) => owns(one.prefix, r.kind === "durable-object-namespace" ? r.script! : r.name!))).toBe(true);
      expect(one.resources.some((r) => owns(twelve.prefix, r.kind === "durable-object-namespace" ? r.script! : r.name!))).toBe(false);
      expect(twelve.resources.some((r) => owns(one.prefix, r.kind === "durable-object-namespace" ? r.script! : r.name!))).toBe(false);
    });
  });

  describe("without credentials, deploy and destroy stop before the cloud", () => {
    it.each([["up"], ["destroy"]] as const)("`ortho env %s staging --run <id>` with no CLOUDFLARE_API_TOKEN exits non-zero, names it, and makes no connection", (verb) => {
      const ran = ortho(base().root, ["env", verb, ENVIRONMENT, "--run", RUN]);
      expect(ran.status, `${verb} with no credential: ${says(ran)}`).not.toBe(0);
      expect(ran.err).toContain("CLOUDFLARE_API_TOKEN");
      expect(ran.err).not.toContain(DENIED);
    });
  });
});
