// Check 47 (CX-staging, `design/decisions/CX-staging.md`; Goal 16's done check, `design/goals/16-capxul.md`): the staging run can take Capxul's finish-line journeys. Two of the five promises
// are judged here; the other three (the workflow's root and list, the list held to the journey files, one up and one destroy whatever fails) are in `e2e/staging/workflow.test.mjs` and
// `e2e/staging/runs.test.mjs`. Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first"). It never touches the cloud: no credential reaches a
// command, every command is loaded with `deny-network.mjs`, and the only worlds judged are served on this machine, as in checks 37 and 41.
//
// WHAT IS PINNED.
//   2. `ortho prove --env staging --run <id> --only <a> --only <b> …` judges exactly the journeys named, each once, against the deployed address. `--only` may be given any number of
//      times; one name is check 41's run, unchanged. Each named journey is run and reported (its verdict and every step) whether or not another failed: a failing journey fails the run
//      (exit 1, `passed: false`, `prove ✘ <n> failing` last, n counting failing steps) and the others still say how they went. The world is asked what the named journeys ask and nothing that only an unnamed one does.
//      A name that is no journey is refused (exit 2, naming it) before any journey runs, even beside names that are. The journeys are reported in a list, judged as a set.
//   3. `ortho env up staging --plan --run <id> --root examples/capxul` prints Capxul's plan with no credential and no network: Capxul declares `blueprint/environments/staging.ts` (a Worker
//      on Cloudflare with D1), its model carries it, and the plan is check 37's judge's plan for Capxul's own model, every name under `ortho-capxul-stg-<run>`. `destroy --plan` lists the
//      same resources, so a destroy removes exactly what up made: an account listing (the spike's recorded one, other apps' resources and all) with the plan's resources added, judged by
//      the workflow's own judge (`e2e/staging/listing.mjs`), is what up made; with destroy's resources taken off again, the run's leftovers are empty and nothing of anyone else's changed.
//
// HOW 2 IS JUDGED. Check 41's instruments: recording proxies in front of worlds `ortho dev` serves from copies of Plugged In, one good and two whose `profile.get` returns the links reversed
// (one world per test that runs journeys: a starting world claims a fixed handle). In the reversed world "anyone reads a public page" and the story fail, and "claim a handle" (an empty
// page) passes. Journeys run in the order of their files, so the passing one runs after a failing one: a prove that stops at the first failure leaves it out. Plugged In and not Capxul,
// because the promise is prove's and Plugged In's journeys are the ones check 41 already proves fair; Capxul's names reach prove through the same flag.
//
// Red today (8 tests, `expected-failing/47-cx-staging-capxul.txt`) on two reasons: `--only` takes at most one value ("Invalid value for flag --only"), and Capxul declares no `staging`
// environment ("no environment \"staging\""). Controls, true today (26): the journeys chosen call and order what the check says; the judge of a several-journey run passes a right run and
// fails each planted wrong one; the destroy judgement passes a destroy of what up made and fails each planted wrong one.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as L from "./loop.ts";
import { freePorts } from "../ports.ts";
import { copyOf } from "../layer1/support.ts";
import { repo } from "./support.ts";
import { DENIED, plan, planOf, problems as planProblems, prefixOf, quiet, type Plan, type PlanModel } from "./staging-plan.ts";
import { modelOf as planModelOf } from "./staging-plan.ts";
import { recorder, routeOf, staged, startDev, stopDev, type Ran, type Recorder } from "./prove-staging.ts";
import { callsOf, modelOf, type JourneyMap } from "./prove-speed.ts";
// @ts-expect-error: a plain module of the staging workflow's, with no types
import { leftovers, made, planned, untouched, CLEAN } from "../staging/listing.mjs";

const RUN = "r4747";
const STORY = "a person claims a page and shares it";
const ONCE = "a name is claimed once";
const CLAIM = "claim a handle";
const ANYONE = "anyone reads a public page";
const PORTS = freePorts("good", "bad", "badText", "goodProxy", "badProxy", "badTextProxy");
const example = join(repo, "examples/plugged-in");
const capxul = join(repo, "examples/capxul");

const cleanups: Array<() => void | Promise<void>> = [];
afterAll(async () => { for (const c of cleanups.splice(0).reverse()) await c(); }, 120_000);
const copy = () => { const c = L.freshProject(example); cleanups.push(() => c.remove()); return c; };
const said = (r: Ran) => (r.err.trim() || r.out.trim()).split("\n").slice(0, 3).join(" | ").slice(0, 240);
const onlys = (...names: ReadonlyArray<string>) => names.flatMap((n) => ["--only", n]);

// ---- the judge of a several-journey staging run (pure, so the same function runs on the real run and on each planted wrong one) ----

type Want = Readonly<Record<string, "pass" | "fail">>;
const record = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const parse = (text: string): unknown => { try { return JSON.parse(text); } catch { return undefined; } };
const escaped = (route: string) => route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Everything wrong with a `--json` staging prove of the journeys in `want` (each with the verdict it must have), given what the world behind it heard. */
export const several = (ran: Ran, map: JourneyMap, want: Want, heard: ReadonlyArray<string>): ReadonlyArray<string> => {
  const out: string[] = [];
  const names = Object.keys(want);
  const failing = names.filter((n) => want[n] === "fail").length;
  if (ran.status !== (failing === 0 ? 0 : 1)) out.push(`exit ${ran.status}, expected ${failing === 0 ? 0 : 1}: ${said(ran)}`);
  if (/network-denied/i.test(ran.err)) out.push(`it reached for a host that is not this machine: ${ran.err.trim().slice(0, 100)}`);
  if (ran.worlds.size > 0) out.push(`it started a world of its own: ${[...ran.worlds][0]}`);
  const json = parse(ran.out);
  if (!record(json)) return [...out, `stdout is not one JSON document: ${ran.out.trim().slice(0, 100)}`];
  if (json["passed"] !== (failing === 0)) out.push(`passed is ${JSON.stringify(json["passed"])}, expected ${failing === 0}`);
  const journeys = Array.isArray(json["journeys"]) ? (json["journeys"] as ReadonlyArray<unknown>) : undefined;
  if (journeys === undefined) return [...out, `journeys is ${JSON.stringify(json["journeys"])?.slice(0, 60)}, expected a list`];
  const judged = journeys.map((j) => (record(j) ? j["name"] : j));
  if (JSON.stringify([...judged].map(String).sort()) !== JSON.stringify([...names].sort())) out.push(`the journeys judged are ${JSON.stringify(judged)}, expected each of ${JSON.stringify(names)} once`);
  for (const name of names) {
    const j = journeys.find((x) => record(x) && x["name"] === name) as Record<string, unknown> | undefined;
    if (j === undefined) continue;
    if (j["verdict"] !== want[name]) out.push(`${JSON.stringify(name)}'s verdict is ${JSON.stringify(j["verdict"])}, expected ${JSON.stringify(want[name])}`);
    if (j["stopped"] !== undefined) out.push(`${JSON.stringify(name)} stopped: ${JSON.stringify(j["stopped"])}`);
    const steps = Array.isArray(j["steps"]) ? (j["steps"] as ReadonlyArray<unknown>) : [];
    const titles = Object.values(map.journeys).find((x) => x.name === name)!.steps.map((s) => s.title);
    if (JSON.stringify(steps.map((s) => (record(s) ? s["name"] : s))) !== JSON.stringify(titles)) out.push(`${JSON.stringify(name)} reports the steps ${JSON.stringify(steps.map((s) => (record(s) ? s["name"] : s)))}, expected every one of ${JSON.stringify(titles)}`);
    const bad = steps.filter((s) => !record(s) || s["verdict"] !== "pass").length;
    if ((want[name] === "pass") !== (bad === 0)) out.push(`${JSON.stringify(name)} has ${bad} steps that did not pass, and its verdict must be ${want[name]}`);
  }
  const totals = json["totals"];
  if (!record(totals) || totals["journeys"] !== names.length || totals["journeysPassed"] !== names.length - failing) out.push(`totals are ${JSON.stringify(totals)}, expected ${names.length} journeys, ${names.length - failing} passed`);
  const posts = heard.filter((h) => h.startsWith("POST ")).map((h) => h.slice(5));
  const reach = new Set(names.flatMap((n) => [...callsOf(map, n)].map(routeOf)));
  for (const name of names) for (const route of [...callsOf(map, name)].map(routeOf)) if (!posts.includes(route)) out.push(`the world was never asked ${route}, which ${JSON.stringify(name)} calls: it was not judged against it`);
  for (const route of Object.keys(map.operations).map(routeOf).filter((r) => !reach.has(r))) if (heard.some((h) => new RegExp(`${escaped(route)}(/|$)`).test(h))) out.push(`the world was asked ${route}, which no named journey calls: a journey not named was judged`);
  return out;
};

// ---- the judge of a destroy against the plan of up (pure; the listings are the workflow's own shape, judged by the workflow's own functions) ----

const recordedBefore = JSON.parse(readFileSync(join(repo, "e2e/staging/recorded/run-5-after-destroy.json"), "utf8")) as ReadonlyArray<{ label: string; names: ReadonlyArray<string> }>;
/** A listing with `plan`'s resources added (what the account holds while up) or taken off (after destroy), in the listing's own words; a namespace gets the name the API would give it. */
const withPlan = (listing: typeof recordedBefore, p: Plan, add: boolean) => {
  const rows = (planned(p) as { rows: ReadonlyArray<{ label: string; name: string }> }).rows;
  const named = (r: { label: string; name: string }) => (r.label === "durable-object-namespaces" ? `${r.name}:${r.name.split(":")[1]!.toLowerCase()}` : r.name);
  return listing.map((e) => {
    const mine = rows.filter((r) => r.label === e.label).map(named);
    return { label: e.label, names: add ? [...e.names, ...mine] : e.names.filter((n) => !mine.some((m) => n === m || (e.label === "durable-object-namespaces" && n.split(":").slice(0, 2).join(":") === m.split(":").slice(0, 2).join(":")))) };
  });
};
/** Everything wrong when `up` makes `upPlan`'s resources on the recorded account and `destroy` then removes `destroyPlan`'s: up made exactly its plan, nothing of the run is left, nothing else changed. */
export const destroyProblems = (upPlan: Plan, destroyPlan: Plan): ReadonlyArray<string> => {
  const during = withPlan(recordedBefore, upPlan, true);
  const after = withPlan(during, destroyPlan, false);
  const verdicts = [made(upPlan, during, upPlan.prefix), leftovers(after, upPlan.prefix), untouched(recordedBefore, after, upPlan.prefix)] as ReadonlyArray<{ exit: number; lines: ReadonlyArray<string> }>;
  return verdicts.filter((v) => v.exit !== CLEAN).flatMap((v) => v.lines);
};

// ---- Capxul's copy: what is committed, plugins and generated model included, nothing regenerated ----

const capxulCopy = () => { const c = copyOf(capxul, ["ortho.config.ts", "blueprint", "generated", "src", "journeys", "package.json", "plugins"]); cleanups.push(() => c.remove()); return c.root; };

let map: JourneyMap;
let judged: ReturnType<typeof copy>;
let good: Recorder, bad: Recorder, badText: Recorder;
beforeAll(async () => {
  judged = copy();
  map = modelOf(judged.root);
  // One world for each test that runs journeys: a starting world claims a fixed handle, so a second run against the same world would meet its own first run.
  const served = { good: copy(), bad: copy(), badText: copy() };
  for (const root of [served.bad.root, served.badText.root]) {
    const broken = join(root, "src/profile/get.ts");
    writeFileSync(broken, readFileSync(broken, "utf8").replace("return { handle, links };", "return { handle, links: [...links].reverse() };"));
  }
  const started = await Promise.allSettled([startDev(served.good.root, PORTS.good), startDev(served.bad.root, PORTS.bad), startDev(served.badText.root, PORTS.badText)]);
  for (const r of started) if (r.status === "fulfilled") cleanups.push(() => stopDev(r.value.child));
  const failed = started.find((r) => r.status === "rejected");
  if (failed !== undefined) throw (failed as PromiseRejectedResult).reason;
  const urls = started.map((r) => (r as PromiseFulfilledResult<{ readonly url: string }>).value.url);
  [good, bad, badText] = await Promise.all([recorder(PORTS.goodProxy, urls[0]), recorder(PORTS.badProxy, urls[1]), recorder(PORTS.badTextProxy, urls[2])]);
  cleanups.push(() => good.close(), () => bad.close(), () => badText.close());
}, 280_000);

const against = (at: Recorder, args: ReadonlyArray<string>) => staged(judged.root, ["--run", RUN, ...args], { ORTHO_STAGING_ORIGIN: at.url });

describe("47: the staging run takes Capxul's finish line (CX-staging)", () => {
  describe("controls (true today)", () => {
    it("the journeys chosen run in the order of their files, a failing one before a passing one: a name claimed once, anyone reads a public page, claim a handle, then the story", () => {
      const order = Object.values(map.journeys).map((j) => j.name);
      expect([ONCE, ANYONE, CLAIM, STORY].map((n) => order.indexOf(n))).toEqual([...[ONCE, ANYONE, CLAIM, STORY].map((n) => order.indexOf(n))].sort((a, b) => a - b));
      expect(readFileSync(join(example, "journeys/anyone-reads-a-public-page.ts"), "utf8")).toContain("every link, in order");
      expect(readFileSync(join(example, "journeys/claim-a-handle.ts"), "utf8")).toContain('{ handle: "firstpage", links: [] }');
    });

    it("the journeys chosen call what the check says: the story reads a page, a name claimed once never does, and none of them calls release, order or remove", () => {
      expect([...callsOf(map, STORY)].sort()).toEqual(["handle.claim", "link.add", "profile.get"]);
      expect([...callsOf(map, ONCE)].sort()).toEqual(["handle.claim", "handle.resolve"]);
      expect([...callsOf(map, CLAIM)]).toContain("profile.get");
      expect([...callsOf(map, ANYONE)]).toContain("profile.get");
      const named = new Set([STORY, ONCE, CLAIM, ANYONE].flatMap((n) => [...callsOf(map, n)]));
      expect(Object.keys(map.operations).filter((o) => !named.has(o)).sort()).toEqual(["handle.release", "link.order", "link.remove"]);
    });

    // The judge of a several-journey run, on a right run and on each planted wrong one.
    const want: Want = { [STORY]: "fail", [ONCE]: "pass" };
    const journey = (name: string, verdict: "pass" | "fail") => {
      const titles = Object.values(map.journeys).find((j) => j.name === name)!.steps.map((s) => s.title);
      return { name, verdict, skipped: [], ms: 1, steps: titles.map((t, i) => ({ name: t, verdict: verdict === "fail" && i === titles.length - 1 ? "fail" : "pass", failures: verdict === "fail" && i === titles.length - 1 ? [{ message: "x" }] : [] })) };
    };
    const doc = (over: Record<string, unknown> = {}) => ({ schemaVersion: 1, passed: false, journeys: [journey(STORY, "fail"), journey(ONCE, "pass")], totals: { journeys: 2, journeysPassed: 1, failing: 1, evalsFailed: 0 }, ...over });
    const heard = () => [...callsOf(map, STORY), ...callsOf(map, ONCE)].map((o) => `POST ${routeOf(o)}`);
    const run = (d: unknown, status: number | null = 1, err = "", worlds = new Set<string>()): Ran => ({ status, out: JSON.stringify(d), err, worlds });
    it("the judge passes a right run: the story failed, the other passed, both reported, exit 1", () => {
      expect(several(run(doc()), map, want, heard())).toEqual([]);
    });
    const wrong: ReadonlyArray<readonly [string, () => readonly [Ran, ReadonlyArray<string>], RegExp]> = [
      ["only the last --only judged (one name kept, as today)", () => [run(doc({ journeys: [journey(ONCE, "pass")], passed: true, totals: { journeys: 1, journeysPassed: 1 } }), 0), heard()], /journeys judged|exit 0/],
      ["only the first --only judged", () => [run(doc({ journeys: [journey(STORY, "fail")], totals: { journeys: 1, journeysPassed: 0 } })), heard()], /journeys judged/],
      ["the run stopping at the failing journey (the other never reported)", () => [run(doc({ journeys: [journey(STORY, "fail")] })), heard()], /journeys judged/],
      ["a journey judged twice", () => [run(doc({ journeys: [journey(STORY, "fail"), journey(ONCE, "pass"), journey(ONCE, "pass")] })), heard()], /journeys judged/],
      ["an unnamed journey judged too", () => [run(doc({ journeys: [journey(STORY, "fail"), journey(ONCE, "pass"), journey(CLAIM, "pass")] })), heard()], /journeys judged/],
      ["exit 0 with a failing journey", () => [run(doc(), 0), heard()], /exit 0/],
      ["exit 2 with a failing journey", () => [run(doc(), 2), heard()], /exit 2/],
      ["passed true with a failing journey", () => [run(doc({ passed: true })), heard()], /passed is true/],
      ["the passing journey reported failed", () => [run(doc({ journeys: [journey(STORY, "fail"), journey(ONCE, "fail")] })), heard()], /a name is claimed once"'s verdict/],
      ["the failing journey reported passed", () => [run(doc({ journeys: [journey(STORY, "pass"), journey(ONCE, "pass")] })), heard()], /shares it"'s verdict/],
      ["the failing journey's later steps left out", () => [run(doc({ journeys: [{ ...journey(STORY, "fail"), steps: journey(STORY, "fail").steps.slice(0, 2) }, journey(ONCE, "pass")] })), heard()], /reports the steps/],
      ["a journey stopped", () => [run(doc({ journeys: [{ ...journey(STORY, "fail"), stopped: "x" }, journey(ONCE, "pass")] })), heard()], /stopped/],
      ["totals of one journey", () => [run(doc({ totals: { journeys: 1, journeysPassed: 0 } })), heard()], /totals are/],
      ["the world never asked the other journey's own route", () => [run(doc()), heard().filter((h) => h !== "POST /handle/resolve")], /never asked \/handle\/resolve/],
      ["the world asked a route only an unnamed journey calls", () => [run(doc()), [...heard(), "POST /link/remove"]], /no named journey calls/],
      ["a host that is not this machine", () => [run(doc(), 1, `${DENIED} x.workers.dev\n`), heard()], /not this machine/],
      ["a world of its own", () => [run(doc(), 1, "", new Set(["1 workerd serve"])), heard()], /world of its own/],
      ["not JSON", () => [{ status: 1, out: "prove ✘ 1 failing", err: "", worlds: new Set() }, heard()], /not one JSON/],
    ];
    it.each(wrong)("the judge fails %s", (_name, make, say) => {
      const [r, h] = make();
      const found = several(r, map, want, h);
      expect(found.length, `nothing was wrong with ${_name}`).toBeGreaterThan(0);
      expect(found.join(" | ")).toMatch(say);
    });

    // The destroy judgement: a pair of plans that agree passes; each planted wrong pair is caught by the workflow's own judge.
    const pluggedPlan = (run = RUN): Plan => ({ app: "plugged-in", environment: "staging", run, prefix: prefixOf("plugged-in", run), resources: [
      { kind: "worker", name: `${prefixOf("plugged-in", run)}-worker` }, { kind: "d1", name: `${prefixOf("plugged-in", run)}-db`, binding: "DB" },
      { kind: "durable-object-namespace", script: `${prefixOf("plugged-in", run)}-worker`, class: "World" }] });
    it("the destroy judgement passes a destroy that removes what up made", () => expect(destroyProblems(pluggedPlan(), pluggedPlan())).toEqual([]));
    it.each<readonly [string, () => Plan, RegExp]>([
      ["a destroy that leaves the database", () => ({ ...pluggedPlan(), resources: pluggedPlan().resources.filter((r) => r.kind !== "d1") }), /LEFTOVER d1/],
      ["a destroy that leaves the namespace", () => ({ ...pluggedPlan(), resources: pluggedPlan().resources.filter((r) => r.kind !== "durable-object-namespace") }), /LEFTOVER durable-object-namespaces/],
      ["a destroy of another run", () => pluggedPlan("r1"), /LEFTOVER/],
      ["a destroy that also removes another app's Worker", () => ({ ...pluggedPlan(), resources: [...pluggedPlan().resources, { kind: "worker", name: "other-app-a" }] }), /REMOVED 1 workers/],
    ])("the destroy judgement fails %s", (_name, make, say) => expect(destroyProblems(pluggedPlan(), make()).join("\n")).toMatch(say));
  });

  describe("2: several --only, each journey judged and reported", () => {
    it("three names against a good world: exactly those three judged, each passing, exit 0, and nothing an unnamed journey calls asked", async () => {
      const before = good.heard().length;
      const ran = await against(good, [...onlys(STORY, ONCE, CLAIM), "--json"]);
      expect(several(ran, map, { [STORY]: "pass", [ONCE]: "pass", [CLAIM]: "pass" }, good.heard().slice(before))).toEqual([]);
    }, 300_000);

    it("a failing journey fails the run, and the journeys after it still run and are reported: against a world that reverses a page's links, anyone reads a public page fails, claim a handle (an empty page) passes after it, the story fails last, exit 1", async () => {
      const before = bad.heard().length;
      const ran = await against(bad, [...onlys(STORY, ANYONE, CLAIM), "--json"]);
      expect(several(ran, map, { [STORY]: "fail", [ANYONE]: "fail", [CLAIM]: "pass" }, bad.heard().slice(before))).toEqual([]);
    }, 300_000);

    it("without --json, prove's own lines name each journey with its result, and the verdict is last", async () => {
      const ran = await against(badText, onlys(CLAIM, ANYONE));
      const lines = ran.out.trim().split("\n");
      expect([ran.status, ran.worlds.size, ran.err.includes(DENIED)], said(ran)).toEqual([1, 0, false]);
      expect(lines.some((l) => l.startsWith(`journey ${ANYONE} ✘`)), ran.out).toBe(true);
      expect(lines.some((l) => l.startsWith(`journey ${CLAIM} ✔`)), ran.out).toBe(true);
      expect(lines.at(-1)).toMatch(/^prove ✘ [1-9]\d* failing$/);
    }, 300_000);

    it("a name that is no journey, beside two that are, is refused naming it: exit 2, no journey run, the world asked nothing", async () => {
      const before = good.heard().length;
      const ran = await against(good, [...onlys(STORY, "no such journey", ONCE), "--json"]);
      expect([ran.status, /no journey named "no such journey"/.test(`${ran.out}${ran.err}`), ran.out.includes(`"journeys"`)], said(ran)).toEqual([2, true, false]);
      expect(good.heard().slice(before).filter((h) => h.startsWith("POST /handle") || h.startsWith("POST /link") || h.startsWith("POST /profile"))).toEqual([]);
    }, 300_000);
  });

  describe("3: Capxul's staging plan, with no credential and no network, and a destroy that removes what up made", () => {
    it("Capxul declares a staging environment on Cloudflare with D1, in blueprint/environments/staging.ts and in its committed model", () => {
      const model = planModelOf(capxul) as { environments?: Record<string, { cloud?: unknown }> };
      expect(model.environments?.["staging"]?.cloud, "examples/capxul's model has no staging environment on Cloudflare with D1").toEqual({ provider: "cloudflare", database: "d1" });
    });

    it("`ortho env up staging --plan --run <id> --root examples/capxul` plans what Capxul's model needs, every name under ortho-capxul-stg-<run>, with no credential and the network denied", () => {
      const root = capxulCopy();
      const ran = plan(root, "up", RUN);
      expect(ran.err).not.toContain(DENIED);
      const printed = planOf(ran, "`ortho env up staging --plan` on Capxul") as Plan;
      expect(planProblems(printed, planModelOf(root) as PlanModel, "capxul", RUN)).toEqual([]);
      expect(printed.prefix).toBe(`ortho-capxul-stg-${RUN}`);
      expect(Object.keys(quiet()).filter((k) => /^(CLOUDFLARE_|CF_|WRANGLER_)/.test(k))).toEqual([]);
    }, 180_000);

    it("the plan for the workflow's own run id (run id and attempt, up to 20 characters) is planned, and names fit Cloudflare's 63", () => {
      const run = "19876543210123456781";
      const printed = planOf(plan(capxulCopy(), "up", run), "Capxul's plan for a 20-character run") as Plan;
      expect(printed.resources.map((r) => (r.name ?? r.script ?? "").length).filter((n) => n > 63)).toEqual([]);
    }, 180_000);

    it("destroy plans the same resources, and removing them from the account up left leaves nothing of the run and touches nothing else", () => {
      const root = capxulCopy();
      const up = planOf(plan(root, "up", RUN), "Capxul's up plan") as Plan;
      const destroy = planOf(plan(root, "destroy", RUN), "Capxul's destroy plan") as Plan;
      expect(destroy).toEqual(up);
      expect(destroyProblems(up, destroy)).toEqual([]);
    }, 180_000);
  });
});
