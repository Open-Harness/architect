// Check 41 (M7.04, `design/milestones.md`; the call is recorded in `design/decisions/M7-cloud.md`, addendum of 21 November 2026): `ortho prove --env staging --run <id>` judges the
// journeys against the Worker that `ortho env up staging --run <id>` deployed, at its `workers.dev` address. The staging workflow runs it (`.github/workflows/staging.yml`, the story step).
// Written by the checks author; a builder never edits this file or `prove-staging.ts` (AGENTS.md, "Journeys and checks come first"). It never touches the cloud: no credential reaches
// the command, every run is loaded with `deny-network.mjs` (a connection to any host that is not this machine ends the process), and the only world it judges is one served here.
//
// THE SURFACE PINNED, AND WHY.
//   ortho prove --env staging --run <id> [--root R] [--only <journey>] [--json] [--report <file>]
//   `staging` is a third value of `--env`, beside `local` and `test`, because the workflow already calls it and "the same prove the other environments use" is the goal's word. `--run` is the
//   same id check 37 pins (`[a-z0-9]{1,20}`), so the address and the resources `up` made share one prefix and one place that forms it.
//   THE ADDRESS is `https://<prefix>-worker.<subdomain>.workers.dev`, `<prefix>-worker` being check 37's Worker (`ortho-<app>-stg-<run>-worker`) and `<subdomain>` the variable
//   `ORTHO_STAGING_SUBDOMAIN` (one DNS label: lower-case letters, digits and dashes, 1 to 63, not starting or ending with a dash). WHY A VARIABLE AND NOT THE ACCOUNT: reading the account's
//   subdomain is a Cloudflare API call that needs the token, and the story step does not read it (it holds the credentials only for D1's facts, see below), so the workflow hands the subdomain over
//   as the output of an earlier step that holds the token and reads the account's subdomain (`e2e/staging/subdomain.mjs`; a subdomain is not a secret and only it is written). It is never typed in a project: `ortho.config.ts` and the blueprint
//   name no host, and the check builds the address from the model and the variable alone, for four apps/runs/subdomains, so a typed one fails.
//   A LOCAL OVERRIDE, so the same code is judged without the cloud: `ORTHO_STAGING_ORIGIN=http://127.0.0.1:<port>` is the address, used as it is, and the subdomain is then not needed. Loopback
//   only (as `ORTHO_STAGING_API` is for the lister): any other host is refused, so a stray variable cannot send a proof somewhere that is not this machine.
//   WHAT IS JUDGED. The project's journeys (`--only <name>` narrows to the one journey of that name, as it does locally), their steps' answers, refusals and events, over HTTP, at that address.
//   It starts no world, no wrangler, no workerd. The nine evals read spans, and staging has no collector (`M7-cloud.md`: staging runs without traces until an external sink is set), so a
//   staging prove judges the journeys and not the evals (`totals.evalsFailed` is 0), and a `spans(...)` check cannot be judged from a collector it does not have: the check pins the outcome, that the
//   story passes against a good world, and not how a builder gets there. `--only`, `--json` and `--report` mean what they mean for `--env local`; `--empty` and `--changed` are refused with `--env
//   staging` (an empty world is a local one; `--changed` reads a local record), and `--run` is refused with `--env local` and `--env test`.
//   REFUSED, exit 2, a line naming what is wrong, no journey run and no host contacted: no `--run`, a bad one, a missing or bad subdomain, an override that is not loopback, an unknown `--only`.
//   UNREACHABLE, exit 2, a line naming the address and the run, no journey run: nothing listens at the address, or what answers is not the project's server (a 404 for every route, what Cloudflare
//   says for a Worker that was never deployed). A run that reached the Worker and failed a step is exit 1, as locally.
//
// HOW IT IS JUDGED. A recording proxy sits in front of a world that `ortho dev` serves on this machine from a copy of Plugged In, and the prove (of another copy) is pointed at the proxy. What the
// proxy heard is what the run reached: every operation of the story, and none the story does not call (so `--only` is honoured and nothing else is judged). Processes are polled every 120 ms
// for the whole run: a prove that starts a world of its own (the wrong implementation that "works" by proving locally) shows. A second world, whose `profile.get` handler returns the links in
// the wrong order, must fail the story's last step with exit 1: the verdict is the served world's, not a local one's (a prove that starts its own good world passes there, and fails here).
// The address is read from the guard: with no override, the first host a prove connects to is `NETWORK-DENIED <host>` and the check wants exactly `ortho-<app>-stg-<run>-worker.<subdomain>.workers.dev`
// for each app, run and subdomain it tries. NOT JUDGED HERE: the cloud itself (https, D1's facts, a Worker answering): `/_world` stays open in the local world, where the deployed one closes it (spike
// snag 16), so M7.04's own staging run is the proof of that part.
//
// Red today on one reason: `--env` is `local` or `test` and there is no `--run` ("--env staging" is not a value). Controls, true today: the address is check 37's Worker on a workers.dev
// subdomain; the story and the routes it must and must not reach come from the model; the guard denies a workers.dev host and lets loopback through; the proxy passes and records; the judge
// passes the right run and fails each planted wrong one; the workflow's story step runs a journey that exists, with the subdomain from the earlier step's output and exactly `up`'s two credentials (M7-04-story-reads-d1) and no other secret; the judge of that step fails each planted wrong env. No Docker.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as L from "./loop.ts";
import { freePorts } from "../ports.ts";
import { repo } from "./support.ts";
import { expected, prefixOf, project as planProject, type PlanModel } from "./staging-plan.ts";
import { modelOf } from "./staging-plan.ts";
import { DENIED, STORY, SUBDOMAIN, guarded, hostOf, problems, recorder, startDev, staged, stopDev, storyOf, type Ran, type Recorder, type Story } from "./prove-staging.ts";

const PORTS = freePorts("good", "text", "bad", "goodProxy", "textProxy", "badProxy", "dead", "silent", "refuse");
const example = join(repo, "examples/plugged-in");
const SORT = "src/profile/get.ts";
const WRONG = "return { handle, links: [...links].reverse() };";
const RUN = "r4417";

const scratch = mkdtempSync(join(tmpdir(), "ortho-check41-"));
const cleanups: Array<() => void | Promise<void>> = [];
afterAll(async () => { for (const c of cleanups.splice(0).reverse()) await c(); rmSync(scratch, { recursive: true, force: true }); }, 120_000);
const copy = () => { const c = L.freshProject(example); cleanups.push(() => c.remove()); return c; };
const out = (r: Ran) => `${r.out}${r.err}`;
const said = (r: Ran) => (r.err.trim() || r.out.trim()).split("\n").slice(0, 3).join(" | ").slice(0, 200);
const noJourney = (r: Ran) => !out(r).includes(STORY) && !/"journeys"/.test(r.out) && !out(r).includes("prove ✔");

let judged: ReturnType<typeof copy>;
let story: Story;
let good: Recorder, text: Recorder, bad: Recorder, dead: Recorder, silent: Recorder;
beforeAll(async () => {
  judged = copy();
  story = storyOf(judged.root);
  const served = { good: copy(), text: copy(), bad: copy() };
  const broken = join(served.bad.root, SORT);
  writeFileSync(broken, readFileSync(broken, "utf8").replace("return { handle, links };", WRONG));
  // Each world that started is registered for stopping before anything else can fail, so one world failing to start leaves no other running.
  const started = await Promise.allSettled([startDev(served.good.root, PORTS.good), startDev(served.text.root, PORTS.text), startDev(served.bad.root, PORTS.bad)]);
  for (const r of started) if (r.status === "fulfilled") cleanups.push(() => stopDev(r.value.child));
  const failed = started.find((r) => r.status === "rejected");
  if (failed !== undefined) throw (failed as PromiseRejectedResult).reason;
  const devs = started.map((r) => (r as PromiseFulfilledResult<Awaited<ReturnType<typeof startDev>>>).value);
  [good, text, bad] = await Promise.all([recorder(PORTS.goodProxy, devs[0]!.url), recorder(PORTS.textProxy, devs[1]!.url), recorder(PORTS.badProxy, devs[2]!.url)]);
  dead = await recorder(PORTS.dead);
  for (const r of [good, text, bad, dead]) cleanups.push(() => r.close());
  silent = { url: `http://127.0.0.1:${PORTS.silent}`, heard: () => [], close: async () => {} };
}, 280_000);

/** A prove of the story at an override address: what the proxy heard is the part of its list after `from`. */
const against = (at: Recorder, args: ReadonlyArray<string>, vars: Record<string, string> = {}) =>
  staged(judged.root, args, { ORTHO_STAGING_ORIGIN: at.url, ...vars });

describe("41: ortho prove --env staging --run <id> (M7.04), with no cloud", () => {
  describe("controls (true today)", () => {
    it("the address is check 37's Worker on a workers.dev subdomain, and the story and its routes come from the model", () => {
      const model = modelOf(judged.root) as PlanModel;
      const worker = expected(model, prefixOf("plugged-in", RUN)).find((r) => r.kind === "worker")!.name;
      expect(hostOf("plugged-in", RUN, SUBDOMAIN)).toBe(`${worker}.${SUBDOMAIN}.workers.dev`);
      expect(hostOf("plugged-in", RUN, SUBDOMAIN)).toBe(`ortho-pluggedin-stg-${RUN}-worker.acme-account.workers.dev`);
      expect(story.steps).toHaveLength(5);
      expect([...story.reach].sort()).toEqual(["/handle/claim", "/link/add", "/profile/get"]);
      expect(story.others).toEqual(expect.arrayContaining(["/handle/release", "/link/order", "/link/remove"]));
      expect(story.others.filter((o) => story.reach.includes(o))).toEqual([]);
    });

    it("the guard denies a workers.dev host by name and lets loopback through", () => {
      const host = hostOf("plugged-in", RUN, SUBDOMAIN);
      const denied = guarded(host);
      expect([denied.status, denied.stderr.trim()]).toEqual([97, `${DENIED} ${host}`]);
      const local = guarded(`127.0.0.1:${PORTS.refuse}`);
      expect([local.status, local.stderr]).toEqual([3, ""]);
    });

    it("the proxy passes a request to the world and writes it down; with no world it answers 404 to every route", async () => {
      const before = good.heard().length;
      const health = await fetch(`${good.url}/_world/health`);
      expect(health.ok).toBe(true);
      expect(good.heard().slice(before)).toEqual(["GET /_world/health"]);
      expect((await fetch(`${dead.url}/handle/claim`, { method: "POST" })).status).toBe(404);
      expect(dead.heard()).toContain("POST /handle/claim");
    });

    // Every thing the judge reads, planted wrong one way at a time (the table of the pull request: each row is one thing read against one way).
    const steps = () => story.steps;
    const doc = (over: Record<string, unknown> = {}, journey: Record<string, unknown> = {}, stepOver: (i: number) => Record<string, unknown> | null = () => ({})) => ({
      schemaVersion: 1, passed: true, seconds: 1, lines: ["journey a ✔", "prove ✔"],
      totals: { journeys: 1, journeysPassed: 1, steps: steps().length, stepsPassed: steps().length, evalsFailed: 0, failing: 0 },
      journeys: [{ name: STORY, verdict: "pass", skipped: [], ms: 1, steps: steps().map((name, i) => ({ name, verdict: "pass", failures: [], ...stepOver(i) })), ...journey }], ...over,
    });
    const reached = () => [...story.reach.map((r) => `POST ${r}`), "POST /api/auth/sign-up/email"];
    const right = () => ({ ran: { status: 0, out: JSON.stringify(doc(), null, 2) + "\n", err: "", worlds: new Set<string>() } as Ran, file: JSON.stringify(doc()), heard: reached() });
    const withDoc = (d: unknown, file: string | undefined = JSON.stringify(d)) => ({ ...right(), ran: { ...right().ran, out: JSON.stringify(d) }, file });
    const wrong: ReadonlyArray<readonly [string, () => ReturnType<typeof right>, RegExp]> = [
      ["exit 1", () => ({ ...right(), ran: { ...right().ran, status: 1 } }), /exit 1/],
      ["exit 2", () => ({ ...right(), ran: { ...right().ran, status: 2 } }), /exit 2/],
      ["no exit status (killed)", () => ({ ...right(), ran: { ...right().ran, status: null } }), /exit null/],
      ["a host denied on stderr", () => ({ ...right(), ran: { ...right().ran, err: `${DENIED} x.workers.dev\n` } }), /not this machine/],
      ["a world of its own started", () => ({ ...right(), ran: { ...right().ran, worlds: new Set(["1 workerd serve"]) } }), /world of its own/],
      ["a line before the JSON", () => ({ ...right(), ran: { ...right().ran, out: `prove: judging\n${right().ran.out}` } }), /not one JSON document/],
      ["an array for the document", () => ({ ...right(), ran: { ...right().ran, out: "[]" } }), /not one JSON document/],
      ["empty stdout", () => ({ ...right(), ran: { ...right().ran, out: "" } }), /not one JSON document/],
      ["passed as the text true", () => withDoc(doc({ passed: "true" })), /passed is "true"/],
      ["passed null", () => withDoc(doc({ passed: null })), /passed is null/],
      ["passed missing", () => withDoc(doc({ passed: undefined })), /passed is undefined/],
      ["passed false", () => withDoc(doc({ passed: false })), /passed is false/],
      ["journeys null", () => withDoc(doc({ journeys: null })), /journeys is null/],
      ["journeys an object", () => withDoc(doc({ journeys: {} })), /expected a list/],
      ["no journey", () => withDoc(doc({ journeys: [] })), /0 journeys/],
      ["the story twice", () => withDoc(doc({ journeys: [doc().journeys[0], doc().journeys[0]] })), /2 journeys/],
      ["another journey instead", () => withDoc(doc({}, { name: "a name is claimed once" })), /the journey judged is/],
      ["another journey added", () => withDoc(doc({ journeys: [doc().journeys[0], { ...doc().journeys[0], name: "release a handle" }] })), /2 journeys/],
      ["the story failed", () => withDoc(doc({}, { verdict: "fail" })), /verdict is "fail"/],
      ["the story's verdict missing", () => withDoc(doc({}, { verdict: undefined })), /verdict is undefined/],
      ["steps null", () => withDoc(doc({}, { steps: null })), /expected a list/],
      ["the last step left out", () => withDoc(doc({}, { steps: doc().journeys[0]!.steps.slice(0, -1) })), /the steps judged/],
      ["the first step left out", () => withDoc(doc({}, { steps: doc().journeys[0]!.steps.slice(1) })), /the steps judged/],
      ["a step added", () => withDoc(doc({}, { steps: [...doc().journeys[0]!.steps, { name: "one more", verdict: "pass", failures: [] }] })), /the steps judged/],
      ["a step repeated", () => withDoc(doc({}, { steps: [doc().journeys[0]!.steps[0], ...doc().journeys[0]!.steps] })), /the steps judged/],
      ["the steps reordered", () => withDoc(doc({}, { steps: [...doc().journeys[0]!.steps].reverse() })), /the steps judged/],
      ["a step renamed", () => withDoc(doc({}, {}, (i) => (i === 2 ? { name: "aaron adds a blog" } : {}))), /the steps judged/],
      ["the first step failing", () => withDoc(doc({}, {}, (i) => (i === 0 ? { verdict: "fail" } : {}))), /did not pass/],
      ["the last step failing", () => withDoc(doc({}, {}, (i) => (i === steps().length - 1 ? { verdict: "fail", failures: [{ message: "x" }] } : {}))), /did not pass/],
      ["a step's verdict missing", () => withDoc(doc({}, {}, (i) => (i === 1 ? { verdict: undefined } : {}))), /did not pass/],
      ["a passing step with a failure", () => withDoc(doc({}, {}, (i) => (i === 3 ? { failures: [{ message: "x" }] } : {}))), /did not pass/],
      ["a step's failures null", () => withDoc(doc({}, {}, (i) => (i === 3 ? { failures: null } : {}))), /did not pass/],
      ["totals null", () => withDoc(doc({ totals: null })), /totals are null/],
      ["a step count off", () => withDoc(doc({ totals: { ...doc().totals, steps: 4 } })), /totals are/],
      ["a passed count off", () => withDoc(doc({ totals: { ...doc().totals, stepsPassed: 4 } })), /totals are/],
      ["the evals judged and failing, as a local --only run has them", () => withDoc(doc({ totals: { ...doc().totals, evalsFailed: 7 } })), /totals are/],
      ["two journeys in the totals", () => withDoc(doc({ totals: { ...doc().totals, journeys: 2 } })), /totals are/],
      ["schemaVersion missing", () => withDoc(doc({ schemaVersion: undefined })), /schemaVersion is undefined/],
      ["schemaVersion 2", () => withDoc(doc({ schemaVersion: 2 })), /schemaVersion is 2/],
      ["journeysPassed 0 in the totals", () => withDoc(doc({ totals: { ...doc().totals, journeysPassed: 0 } })), /totals are/],
      ["5 failing in the totals", () => withDoc(doc({ totals: { ...doc().totals, failing: 5 } })), /totals are/],
      ["the story stopped", () => withDoc(doc({}, { stopped: "a starting world failed" })), /the story stopped/],
      ["the story skipped a step", () => withDoc(doc({}, { skipped: [{ step: "x", operation: "link.add", file: "f" }] })), /skipped/],
      ["the story's skipped list missing", () => withDoc(doc({}, { skipped: undefined })), /skipped/],
      ["a report file that differs only in its lines", () => ({ ...right(), file: JSON.stringify(doc({ lines: ["prove ✘ 1 failing"] })) }), /not the --json document/],
      ["a report file that differs only in schemaVersion", () => ({ ...right(), file: JSON.stringify(doc({ schemaVersion: 2 })) }), /not the --json document/],
      ["a denied host named in lower case on stderr", () => ({ ...right(), ran: { ...right().ran, err: "network-denied x.workers.dev\n" } }), /not this machine/],
      ["another route asked with a trailing slash", () => ({ ...right(), heard: [...reached(), "POST /link/remove/"] }), /--only was ignored/],
      ["another route asked under a prefix", () => ({ ...right(), heard: [...reached(), "POST /v2/handle/release"] }), /--only was ignored/],
      ["no report file", () => ({ ...right(), file: undefined as unknown as string }), /wrote no file/],
      ["a report file of another verdict", () => ({ ...right(), file: JSON.stringify(doc({}, {}, (i) => (i === 4 ? { verdict: "fail" } : {}))) }), /not the --json document/],
      ["a report file that is not JSON", () => ({ ...right(), file: "prove ✔" }), /not the --json document/],
      ["a report file that is an array", () => ({ ...right(), file: "[]" }), /not the --json document/],
      ["the world heard nothing", () => ({ ...right(), heard: [] }), /never asked/],
      ["the world never asked for the claim", () => ({ ...right(), heard: reached().filter((h) => h !== "POST /handle/claim") }), /never asked \/handle\/claim/],
      ["the world never asked for the page read", () => ({ ...right(), heard: reached().filter((h) => h !== "POST /profile/get") }), /never asked \/profile\/get/],
      ["the world only heard GETs", () => ({ ...right(), heard: story.reach.map((r) => `GET ${r}`) }), /never asked/],
      ["a journey the story is not asked too", () => ({ ...right(), heard: [...reached(), "POST /handle/release"] }), /--only was ignored/],
      ["every other journey's routes asked", () => ({ ...right(), heard: [...reached(), ...story.others.map((r) => `POST ${r}`)] }), /--only was ignored/],
    ];
    it("the judge passes the right run", () => {
      const r = right();
      expect(problems(r.ran, story, r.file, r.heard)).toEqual([]);
    });
    it.each(wrong)("the judge fails %s", (name, make, say) => {
      const w = make();
      const found = problems(w.ran, story, w.file, w.heard);
      expect(found.length, `nothing was wrong with ${name}`).toBeGreaterThan(0);
      expect(found.join(" | ")).toMatch(say);
    });

    // M7-04-story-reads-d1: the story reads the run's own D1 databases with the operator's credential, so its env is exactly the subdomain plus the two credentials, from the same
    // expressions `up` uses, and no other `secrets.` expression. A pure judge, run on the real step and on each planted wrong one.
    const TOKEN = "${{ secrets.CLOUDFLARE_API_TOKEN }}", ACCOUNT = "${{ vars.CLOUDFLARE_ACCOUNT_ID }}", SUB = "${{ steps.subdomain.outputs.subdomain }}";
    const storyStep = (text: string) => /- name: the story\n([\s\S]*?)\n\n/.exec(text)?.[1] ?? "";
    const upStep = (text: string) => /- name: up\n([\s\S]*?)\n\n/.exec(text)?.[1] ?? "";
    const envOf = (step: string) => Object.fromEntries([...(/\n {8}env:\n((?: {10}\S.*\n?)+)/.exec(`\n${step}\n`)?.[1] ?? "").matchAll(/^ {10}([A-Z_]+): (.*)$/gm)].map((m) => [m[1]!, m[2]!.trim()]));
    const storyProblems = (text: string): string[] => {
      const step = storyStep(text), up = envOf(upStep(text)), env = envOf(step), found: string[] = [];
      if (JSON.stringify(Object.entries(env).sort()) !== JSON.stringify([["CLOUDFLARE_ACCOUNT_ID", ACCOUNT], ["CLOUDFLARE_API_TOKEN", TOKEN], ["ORTHO_STAGING_SUBDOMAIN", SUB]])) found.push(`story env is ${JSON.stringify(env)}`);
      if (env.CLOUDFLARE_API_TOKEN !== up.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_ACCOUNT_ID !== up.CLOUDFLARE_ACCOUNT_ID) found.push("story credentials are not up's expressions");
      const code = step.split("\n").filter((l) => !l.trim().startsWith("#")).join("\n");
      const secrets = [...code.matchAll(/\$\{\{\s*secrets\.[^}]*\}\}/g)].map((m) => m[0]);
      if (secrets.length !== 1 || secrets[0] !== TOKEN) found.push(`story secrets are ${JSON.stringify(secrets)}`);
      return found;
    };
    const flow = readFileSync(join(repo, ".github/workflows/staging.yml"), "utf8");
    const plant = (re: RegExp, to: string) => { const t = flow.replace(re, to); expect(t, "the plant matched nothing").not.toBe(flow); return t; };
    const inStory = (what: string) => new RegExp(`(- name: the story\\n[\\s\\S]*?)${what}`);
    it("the story step's judge passes the real workflow", () => expect(storyProblems(flow)).toEqual([]));
    it.each<readonly [string, () => string]>([
      ["a second secret on the story", () => plant(/( {10}ORTHO_STAGING_SUBDOMAIN:)/, "          EXTRA: ${{ secrets.OTHER }}\n$1")],
      ["a token from a different secret name", () => plant(inStory(" {10}CLOUDFLARE_API_TOKEN: .*"), "$1          CLOUDFLARE_API_TOKEN: ${{ secrets.OTHER_TOKEN }}")],
      ["a missing account", () => plant(inStory(" {10}CLOUDFLARE_ACCOUNT_ID: .*\\n"), "$1")],
      ["a missing token", () => plant(inStory(" {10}CLOUDFLARE_API_TOKEN: .*\\n"), "$1")],
      ["an account typed in", () => plant(inStory(" {10}CLOUDFLARE_ACCOUNT_ID: .*"), "$1          CLOUDFLARE_ACCOUNT_ID: 0123456789abcdef")],
      ["a secret mentioned in the script", () => plant(/(prove --env staging --run "\$RUN")/, '$1 --token "${{ secrets.OTHER }}"')],
    ])("the story step's judge fails %s", (_name, make) => expect(storyProblems(make()).length).toBeGreaterThan(0));
    it("the workflow's story step judges a journey that exists, gets the subdomain from an earlier step's output, and holds exactly up's two credentials", () => {
      const text = flow;
      const step = storyStep(text);
      expect(/--only "([^"]+)"/.exec(step)?.[1], step).toBe(STORY);
      expect(storyOf(judged.root).names).toContain(STORY);
      expect(step).toContain("ORTHO_STAGING_SUBDOMAIN: ${{ steps.subdomain.outputs.subdomain }}");
      expect(text, "a step that runs before the story reads the account's subdomain").toMatch(/- name: subdomain\n[\s\S]*?subdomain\.mjs[\s\S]*?- name: the story/);
      expect(storyProblems(text)).toEqual([]);
    });
  });

  describe("the address: derived from the prefix and the subdomain, never typed", () => {
    const rows: ReadonlyArray<readonly [string, string, string, string?]> = [
      ["the project, one run", RUN, SUBDOMAIN],
      ["another run: another address", "r9902", SUBDOMAIN],
      ["another subdomain: another address", RUN, "other-account"],
      ["another project name: another address", RUN, SUBDOMAIN, "acme-links"],
    ];
    it.each(rows)("%s", async (_name, run, subdomain, app) => {
      const root = app === undefined ? judged.root : (() => { const p = planProject({ name: app }, { staging: false }); cleanups.push(p.remove); return p.root; })();
      const ran = await staged(root, ["--run", run!, "--only", STORY], { ORTHO_STAGING_SUBDOMAIN: subdomain! });
      const host = hostOf(app ?? "plugged-in", run!, subdomain!);
      expect(ran.err.split("\n").filter((l) => l.startsWith(DENIED)), `a staging prove went to the address ${host}? it said: ${said(ran)}`).toEqual([`${DENIED} ${host}`]);
      expect(ran.worlds.size).toBe(0);
    }, 120_000);

    it("the override is the address when it is set, and the derived host is never contacted", async () => {
      const before = good.heard().length;
      const ran = await against(good, ["--run", RUN, "--only", "no such journey"], { ORTHO_STAGING_SUBDOMAIN: SUBDOMAIN });
      expect(ran.err).not.toContain(DENIED);
      expect(ran.status, said(ran)).toBe(2);
      expect(good.heard().slice(before).filter((h) => h.startsWith("POST /"))).toEqual([]);
    }, 120_000);

    it("an override that is not on this machine is refused, naming the variable, with nothing contacted", async () => {
      const ran = await staged(judged.root, ["--run", RUN, "--only", STORY], { ORTHO_STAGING_ORIGIN: "http://example.com" });
      expect([ran.status, ran.err.includes(DENIED), /ORTHO_STAGING_ORIGIN/.test(out(ran)), noJourney(ran)]).toEqual([2, false, true, true]);
    }, 120_000);
  });

  describe("refused before anything runs: exit 2, a line naming it, no journey, no host contacted", () => {
    const refused = async (args: ReadonlyArray<string>, vars: Record<string, string>, names: RegExp) => {
      const ran = await staged(judged.root, args, vars);
      expect(ran.status, said(ran)).toBe(2);
      expect(out(ran), "the line names what is wrong").toMatch(names);
      expect(ran.err, "a host was contacted").not.toContain(DENIED);
      expect(noJourney(ran), `a journey ran: ${out(ran).slice(0, 120)}`).toBe(true);
      expect(ran.worlds.size).toBe(0);
    };
    const withSub = { ORTHO_STAGING_SUBDOMAIN: SUBDOMAIN };
    it("no --run", () => refused(["--only", STORY], withSub, /--run/));
    it.each([["an empty run", ""], ["an upper-case run", "R4417"], ["a run with a dash", "r-4417"], ["a run with a slash", "r/4417"], ["a run of 21 characters", "a".repeat(21)], ["a run with a dot", "r.4417"], ["a run with a space", "r 4417"]])(
      "%s is refused naming --run", (_n, run) => refused(["--run", run, "--only", STORY], withSub, /--run/), 120_000);
    it("no subdomain: ORTHO_STAGING_SUBDOMAIN is named", () => refused(["--run", RUN, "--only", STORY], {}, /ORTHO_STAGING_SUBDOMAIN/));
    it.each([["an empty subdomain", ""], ["an upper-case one", "Acme"], ["one with a dot (a host, not a label)", "a.b"], ["one that starts with a dash", "-acme"], ["one that ends with a dash", "acme-"], ["one with a space", "ac me"], ["one of 64 characters", "a".repeat(64)], ["one with a slash", "a/b"]])(
      "%s is refused naming ORTHO_STAGING_SUBDOMAIN", (_n, sub) => refused(["--run", RUN, "--only", STORY], { ORTHO_STAGING_SUBDOMAIN: sub }, /ORTHO_STAGING_SUBDOMAIN/), 120_000);
    it.each([["--empty", ["--empty"]], ["--changed", ["--changed"]]])("%s with --env staging is refused naming it, and no world is made", (flag, args) =>
      refused(["--run", RUN, ...args], { ORTHO_STAGING_ORIGIN: silent.url, ...withSub }, new RegExp(flag)), 120_000);
    it.each(["local", "test"])("--run with --env %s is refused naming --run and staging", async (env) => {
      const ran = await staged(judged.root, ["--run", RUN], withSub, ["prove", "--env", env]);
      expect([ran.status, /--run/.test(out(ran)) && /staging/.test(out(ran)), ran.worlds.size]).toEqual([2, true, 0]);
    }, 120_000);
    it("an unknown --only: no journey named, and the world is asked nothing", async () => {
      const before = good.heard().length;
      const ran = await against(good, ["--run", RUN, "--only", "no such journey"]);
      expect([ran.status, /no journey named "no such journey"/.test(out(ran)), noJourney(ran)]).toEqual([2, true, true]);
      expect(good.heard().slice(before).filter((h) => h.startsWith("POST /"))).toEqual([]);
    }, 120_000);
  });

  describe("unreachable: exit 2, the address and the run named, no journey run", () => {
    it("nothing listens at the address", async () => {
      const ran = await staged(judged.root, ["--run", RUN, "--only", STORY], { ORTHO_STAGING_ORIGIN: silent.url });
      expect([ran.status, out(ran).includes(silent.url), out(ran).includes(RUN), noJourney(ran), ran.worlds.size]).toEqual([2, true, true, true, 0]);
      expect(ran.err).not.toContain(DENIED);
    }, 120_000);
    it("a server answers 404 to every route (a Worker that was never deployed): the project's server is not there", async () => {
      const before = dead.heard().length;
      const ran = await against(dead, ["--run", RUN, "--only", STORY]);
      expect([ran.status, out(ran).includes(dead.url), out(ran).includes(RUN), noJourney(ran), ran.worlds.size]).toEqual([2, true, true, true, 0]);
      expect(dead.heard().slice(before).filter((h) => h.startsWith("POST /handle") || h.startsWith("POST /link") || h.startsWith("POST /profile"))).toEqual([]);
    }, 120_000);
  });

  describe("judged there: the same journeys, against the served world, with nothing local started", () => {
    it("--only, --json and --report: the story passes against a good world, every step, and the world was asked what the story asks and no more", async () => {
      const file = join(scratch, "report.json");
      mkdirSync(scratch, { recursive: true });
      const before = good.heard().length;
      const ran = await against(good, ["--run", RUN, "--only", STORY, "--json", "--report", file], { ORTHO_STAGING_SUBDOMAIN: SUBDOMAIN });
      const report = (() => { try { return readFileSync(file, "utf8"); } catch { return undefined; } })();
      expect(problems(ran, story, report, good.heard().slice(before))).toEqual([]);
    }, 240_000);

    it("without --json the lines are prove's own: the story's line, then the verdict last; the exit is 0", async () => {
      const ran = await against(text, ["--run", RUN, "--only", STORY]);
      const lines = ran.out.trim().split("\n");
      expect([ran.status, ran.worlds.size, ran.err.includes(DENIED)], said(ran)).toEqual([0, 0, false]);
      expect(lines.some((l) => l.includes(STORY) && l.includes("✔") && l.includes(`${story.steps.length}/${story.steps.length} steps`)), ran.out).toBe(true);
      expect(lines.at(-1)).toBe("prove ✔");
    }, 240_000);

    it("a wrong world fails the story: exit 1, the last step fails with what was expected and what came back, the first four pass; the verdict is the served world's", async () => {
      const before = bad.heard().length;
      const ran = await against(bad, ["--run", RUN, "--only", STORY, "--json"]);
      const json = (() => { try { return JSON.parse(ran.out) as unknown; } catch { return null; } })() as { passed: boolean; journeys: ReadonlyArray<{ verdict: string; steps: ReadonlyArray<{ name: string; verdict: string; failures: ReadonlyArray<{ expected?: string; got?: string }> }> }> } | null;
      expect([ran.status, ran.worlds.size, ran.err.includes(DENIED)], said(ran)).toEqual([1, 0, false]);
      expect(json?.passed).toBe(false);
      expect(json?.journeys[0]?.verdict).toBe("fail");
      expect(json?.journeys[0]?.steps.map((s) => s.verdict)).toEqual(["pass", "pass", "pass", "pass", "fail"]);
      const failure = json?.journeys[0]?.steps[4]?.failures[0];
      expect([typeof failure?.expected, typeof failure?.got]).toEqual(["string", "string"]);
      expect(bad.heard().slice(before).filter((h) => h.startsWith("POST ")).map((h) => h.slice(5))).toEqual(expect.arrayContaining([...story.reach]));
    }, 240_000);
  });
});
