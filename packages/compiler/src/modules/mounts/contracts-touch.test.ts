// #1133 (CX-feature-contracts, call 3): who may run a contract and who may fill one, judged as one rule. Every mounted feature, and the app,
// tries to run every contract from an operation of its own and to fill it, one pair at a time; each try is judged against the needs graph the
// model itself holds (`mounts.<name>.needs`, through any depth), never against a list written here. A feature may run a contract when it is
// the owner or depends on the owner; it may fill one only when it depends on the owner and isn't the owner. The app may run any mounted
// feature's contract and fills none. A conditional need counts only when the mount picked its option. The scratch features are
// ./fixtures/contracts/testing.ts. Written by the checks author for Goal 16; the builder never edits this file and only removes lines from
// `expected-failing/contracts-touch.txt`.
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import type { Model } from "#modules/model/types.js";
import { RIGHT, at, features, modelExit, modelOf, problemsOf, type AppSpec, type Change, type Contracts, type FillSpec, type Name, type Owners } from "./fixtures/contracts/testing.ts";

/** Every clean feature, mounted under its own name, the add-on with its conditional need on payroll picked (`on`) or not (`off`). */
const base = (link: "on" | "off"): AppSpec => ({
  mounts: { ledger: "ledger", payments: "payments", budgets: "budgets", "chart-us": "chart-us", payroll: "payroll", "payroll-tax-us": "payroll-tax-us", calendar: "calendar", "payroll-plus": "payroll-plus" },
  verbs: { "payroll-plus": (p) => (link === "on" ? [p.choose(p.choices.link.on)] : []) },
});

/** Each contract: its name in the model, its owner's mount, the fill file of its usual filler (left out while a probe fills it), and a fill of the right shape. */
const CONTRACTS: ReadonlyArray<{ readonly name: string; readonly owner: Name; readonly usual: readonly [Name, string]; readonly of: (o: Owners) => unknown; readonly shape: FillSpec }> = [
  { name: "payroll.slip-tax", owner: "payroll", usual: ["payroll-tax-us", "fills/slip-tax.js"], of: (o) => o.slipTax, shape: RIGHT["payroll-tax-us"] },
  { name: "ledger.posting-check", owner: "ledger", usual: ["budgets", "fills/posting-check.js"], of: (o) => o.postingCheck, shape: RIGHT.budgets },
  { name: "ledger.account-code", owner: "ledger", usual: ["chart-us", "fills/us-codes.js"], of: (o) => o.accountCode, shape: RIGHT["chart-us"] },
  { name: "ledger.close-period", owner: "ledger", usual: ["chart-us", "fills/close.js"], of: (o) => o.closePeriod, shape: (_s, o) => ({ input: { account: o.Account.fields.id }, output: {} }) },
];

/** Whom each mount depends on, through any depth, read off the model's own needs (`feature:<mount>`). */
const dependsOn = (m: Model) => (mount: string): ReadonlySet<string> => {
  const seen = new Set<string>();
  const walk = (at: string) => {
    for (const need of m.mounts?.[at]?.needs ?? []) {
      const next = need.replace(/^feature:/, "");
      if (!seen.has(next)) { seen.add(next); walk(next); }
    }
  };
  walk(mount);
  return seen;
};

/** An operation of `who`'s own, on a thing of its own, that runs `contract`. */
const runner = (s: Contracts, contract: unknown) => {
  const Probe = Blueprint.thing({ description: "A probe.", fields: { id: Blueprint.id("prb") }, code: "PB" });
  const run = Blueprint.operation(Probe, { description: "Run a contract.", payload: {}, answer: {}, allowed: [Blueprint.signedIn], steps: { probe: s.step(contract) } });
  return { Probe, run };
};

const tried = async (link: "on" | "off", who: Name | "app", c: (typeof CONTRACTS)[number], how: "run" | "fill") => {
  const app = base(link);
  const probe = who === "app" ? (how === "run" ? "blueprint/things/probe/verbs/run.ts" : "blueprint/fills/probe.ts") : at(who, how === "run" ? "things/probe/verbs/run.js" : "fills/probe.js");
  const files = (s: Contracts, o: Owners) => {
    if (how === "fill") return [{ path: `fills/probe.${who === "app" ? "ts" : "js"}`, exports: { default: s.fill(c.of(o), { description: "A probe's fill.", ...c.shape(s, o) }) } }];
    const { Probe, run } = runner(s, c.of(o));
    const ext = who === "app" ? "ts" : "js";
    return [{ path: `things/probe/thing.${ext}`, exports: { Probe } }, { path: `things/probe/verbs/run.${ext}`, exports: { default: run } }];
  };
  // A probe that fills a contract takes its usual filler's place: one fill, so a refusal is about who fills it, never about a second.
  const change: Change = who === "app" ? {} : { extra: { [who]: files }, ...(how === "fill" ? { drop: { [c.usual[0]]: [c.usual[1]] } } : {}) };
  const f = features(change);
  const own = who === "app" ? files(f.o.s, f.o).map((x) => ({ ...x })) : [];
  return { probe, problems: problemsOf(await modelExit(f, { ...app, files: own })) };
};

describe("#1133: who may run a contract and who may fill one, every pair", () => {
  for (const link of ["on", "off"] as const) {
    it(`judges every mounted feature and the app, running and filling every contract, against the model's needs graph (payroll-plus ${link === "on" ? "needs" : "doesn't need"} payroll)`, { timeout: 120_000 }, async () => {
      const m = await modelOf(features(), base(link));
      const deps = dependsOn(m);
      // The graph is the model's: the add-on depends on payroll only when its mount picked `on`.
      expect(deps("payroll-plus").has("payroll"), "the conditional need is in the model only when picked").toBe(link === "on");
      expect(deps("budgets").has("payroll"), "siblings: budgets and payroll both need payments, and neither depends on the other").toBe(false);
      const whos: ReadonlyArray<Name | "app"> = [...(Object.keys(base(link).mounts) as ReadonlyArray<Name>), "app"];
      const wrong: Array<string> = [];
      for (const c of CONTRACTS) {
        for (const who of whos) {
          for (const how of ["run", "fill"] as const) {
            const depends = who !== "app" && deps(who).has(c.owner);
            const allowed = who === "app" ? how === "run" : how === "run" ? who === c.owner || depends : depends && who !== c.owner;
            const { probe, problems } = await tried(link, who, c, how);
            const named = problems.filter((p) => p.includes(probe));
            const said = `${who} ${how}s ${c.name}: ${allowed ? "allowed" : "refused"}; the problems were:\n${problems.join("\n")}`;
            if (allowed) {
              if (problems.length > 0) wrong.push(said);
            } else {
              // Refused once, at the probe's file; a feature's refusal names the owner's package, the app's names the place it may not write.
              const owner = new RegExp(`@fixture/${c.owner}(?![\\w-])`);
              const ok = named.length === 1 && problems.length === 1 && (who === "app" ? named[0]!.includes("blueprint/fills/probe.ts") : owner.test(named[0]!));
              if (!ok) wrong.push(said);
            }
          }
        }
      }
      expect(wrong, wrong.join("\n\n")).toEqual([]);
    });
  }

  it("holds no contract of a feature that isn't mounted, and refuses the app running one, word for word", async () => {
    const f = features();
    const m = await modelOf(f, base("on"));
    expect(JSON.stringify(m), "nothing in the model names the unmounted leave feature").not.toContain("leave");
    const { Probe, run } = runner(f.o.s, f.o.leaveDays);
    const problems = problemsOf(await modelExit(f, { ...base("on"), files: [{ path: "things/probe/thing.ts", exports: { Probe } }, { path: "things/probe/verbs/run.ts", exports: { default: run } }] }));
    expect(problems).toEqual(["blueprint/things/probe/verbs/run.ts: step probe runs a contract of @fixture/leave, which isn't mounted: mount it (ortho add feature @fixture/leave)"]);
  });
});
