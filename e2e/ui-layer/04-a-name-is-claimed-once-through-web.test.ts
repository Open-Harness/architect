// ST1.26, check 1 of 5 (Goal 5, slice 2; K29 section 3, ST1.25's row): "a name claimed once `--through web`". Written first by the checks author, against a web
// projection that does not exist yet; a builder never edits it.
//
// WHAT IS REQUIRED. `ortho prove --root <Plugged In> --only "a name is claimed once" --through web` replays Plugged In's journey through the generated pieces
// (generated/web/<thing>/<verb>.ts and .react.tsx) in headless Chromium, never jsdom, and says exactly what the same run over HTTP says:
//  - the run over HTTP is the recording: five steps, all passing, their titles and operations those of the journey in `generated/model/model.json`;
//  - `--through web` accepts the flag, exits as the HTTP run does, and its report has the same journey with the same steps, each with the same verdict and the same
//    failures, in the same order (the verdicts are prove's own checks: the answer, the refusal, the events, the spans, the machine);
//  - a real browser did it: playwright's own log (`DEBUG=pw:api`, set in the run's environment) shows a browser launched and a page opened, and at least one
//    interaction (press, type, fill or evaluate) for each step of the journey that calls handle.claim, which is as many as the model's journey has;
//  - the pieces did it: in a copy where handle.claim's piece is replaced by a module that throws, the run is not the same: no step of handle.claim passes. So a replay
//    that never reads the project's generated/web, or sends the claim itself, cannot pass;
//  - nothing of the run is left running (prove's process group and every process it started are stopped, as stage 1's checks do).
// `--only` makes prove exit 1 for the operations the one journey never reaches (coverage), over HTTP and through web alike; the journey's verdicts are what is compared.
//
// WHAT IT READS: the model's journey (titles, operations), prove's report for each run (journey, step names, verdicts, failures, operations), the exit status of both,
// playwright's log lines, the processes left behind.
import { mkdirSync, mkdtempSync } from "node:fs";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { copyOf } from "../layer1/support.ts";
import { leftRunning, plain, proveOnce, pluggedIn, type Ended } from "../stage1/support.ts";
import { model, needPieces } from "./web-support.ts";

const JOURNEY = "a name is claimed once";
const HARD_STOP_SECONDS = 600;
const reports = mkdtempSync(join(tmpdir(), "ortho-ui-layer-02-"));

interface Step { readonly name: string; readonly verdict: string; readonly failures: ReadonlyArray<string>; readonly operation: string }
interface Report { readonly journeys: ReadonlyArray<{ readonly name: string; readonly steps: ReadonlyArray<Step> }> }
const stepsOf = (ended: Ended): ReadonlyArray<Step> | undefined => (ended.report as Report | undefined)?.journeys.find((j) => j.name === JOURNEY)?.steps.map(({ name, verdict, failures, operation }) => ({ name, verdict, failures, operation }));

/** What differs between two runs of the journey: a step missing, extra, out of order, with another verdict, other failures or another operation. */
export const differences = (want: ReadonlyArray<Step>, got: ReadonlyArray<Step>): ReadonlyArray<string> => [
  ...want.filter((w) => !got.some((g) => g.name === w.name)).map((w) => `missing step "${w.name}"`),
  ...got.filter((g) => !want.some((w) => w.name === g.name)).map((g) => `extra step "${g.name}"`),
  ...got.filter((g, i) => want[i] !== undefined && want[i]!.name !== g.name && want.some((w) => w.name === g.name)).map((g) => `step "${g.name}" is out of order`),
  ...want.flatMap((w) => { const g = got.find((x) => x.name === w.name); return g === undefined ? [] : [
    ...(g.verdict === w.verdict ? [] : [`step "${w.name}": verdict ${g.verdict}, over HTTP ${w.verdict}`]),
    ...(JSON.stringify(g.failures) === JSON.stringify(w.failures) ? [] : [`step "${w.name}": failures ${JSON.stringify(g.failures)}, over HTTP ${JSON.stringify(w.failures)}`]),
    ...(g.operation === w.operation ? [] : [`step "${w.name}": operation ${g.operation}, over HTTP ${w.operation}`]),
  ]; }),
  ...(got.length === want.length ? [] : [`${got.length} steps, over HTTP ${want.length}`]),
];

const copies: Array<ReturnType<typeof copyOf>> = [];
afterEach(async () => {
  for (const copy of copies.splice(0)) { const left = await leftRunning(copy.root); copy.remove(); expect(left, "something of the copy is still running").toEqual([]); }
});
const fresh = () => { const copy = copyOf(pluggedIn); copies.push(copy); return copy; };
const run = (root: string, name: string, extra: ReadonlyArray<string> = [], env: Record<string, string> = {}) =>
  proveOnce(root, ["--env", "local", "--only", JOURNEY, ...extra], { hardStopSeconds: HARD_STOP_SECONDS, report: join(reports, `${name}.json`), env });

const journey = Object.values(model().journeys).find((j) => j.name === JOURNEY)!;
const claimSteps = journey.steps.filter((s) => s.call.operation === "handle.claim").length;

/** playwright's own log of what a browser was asked to do: a launch, a page opened, and each interaction. */
export const browserLog = (out: string) => {
  const lines = plain(out).split("\n");
  const started = (what: RegExp) => lines.filter((l) => what.test(l)).length;
  return {
    launched: started(/pw:api\s+=> browserType\.launch started/),
    opened: started(/pw:api\s+=> page\.goto started/),
    interactions: started(/pw:api\s+=> (?:locator|page|frame|elementHandle|jsHandle)\.(?:click|dblclick|fill|type|pressSequentially|press|check|dispatchEvent|evaluate|evaluateHandle|selectOption|tap)\b[^\n]* started/),
  };
};

describe("04 a name is claimed once, through the web pieces", () => {
  it("the journey over HTTP is the recording: five steps, all passing, those the model declares", async () => {
    const ended = await run(fresh().root, "http");
    expect(ended.hung, "prove still running at the hard stop").toBe(false);
    const steps = stepsOf(ended);
    expect(steps, `prove wrote no report with the journey:\n${plain(ended.out).slice(-1500)}`).toBeDefined();
    expect(steps!.map((s) => [s.name, s.operation]), "the steps are the model's").toEqual(journey.steps.map((s) => [s.title, s.call.operation]));
    expect(steps!.length).toBe(5);
    expect(steps!.filter((s) => s.verdict !== "pass").map((s) => `${s.name}: ${s.failures.join("; ")}`), "every step passes").toEqual([]);
  });

  it("`--through web` gives the same verdicts and the same failures, step for step, as over HTTP", async () => {
    const missing = needPieces("handle.claim", "handle.resolve");
    expect(missing, missing).toBeUndefined();
    const copy = fresh();
    const http = await run(copy.root, "http-2");
    const web = await run(copy.root, "web", ["--through", "web"], { DEBUG: "pw:api" });
    expect(web.hung, "prove still running at the hard stop").toBe(false);
    expect(web.status, `\`--through web\` ends as the HTTP run does:\n${plain(web.out).slice(-2500)}`).toBe(http.status);
    const want = stepsOf(http)!;
    const got = stepsOf(web);
    expect(got, `\`--through web\` wrote no report with the journey:\n${plain(web.out).slice(-2500)}`).toBeDefined();
    expect(differences(want, got!), "the same steps, in order, with the same verdicts and failures").toEqual([]);
    const log = browserLog(web.out);
    expect(log.launched, "a browser was launched (playwright's log)").toBeGreaterThanOrEqual(1);
    expect(log.opened, "a page was opened").toBeGreaterThanOrEqual(1);
    expect(log.interactions, `an interaction for each of the ${claimSteps} handle.claim steps`).toBeGreaterThanOrEqual(claimSteps);
    expect(browserLog(http.out), "the HTTP run drove no browser").toEqual({ launched: 0, opened: 0, interactions: 0 });
  });

  it("the pieces did it: with handle.claim's piece broken in the project, no handle.claim step passes", async () => {
    // Without the pieces there is nothing to break, and "no step passed" would hold of any run that fails for another reason.
    const missing = needPieces("handle.claim");
    expect(missing, missing).toBeUndefined();
    const copy = fresh();
    for (const file of ["handle/claim.ts", "handle/claim.react.tsx"]) {
      const path = join(copy.root, "generated/web", file);
      mkdirSync(join(path, ".."), { recursive: true });
      writeFileSync(path, `throw new Error("planted: this piece is broken");\n`);
    }
    const ended = await run(copy.root, "broken", ["--through", "web"]);
    expect(ended.hung, "prove still running at the hard stop").toBe(false);
    const steps = stepsOf(ended);
    expect(steps, `prove wrote no report with the journey (a crash is not a refusal):\n${plain(ended.out).slice(-1500)}`).toBeDefined();
    const passing = (steps ?? []).filter((s) => s.operation === "handle.claim" && s.verdict === "pass").map((s) => s.name);
    expect(passing, `these steps of handle.claim passed with the project's piece broken, so they did not go through it:\n${plain(ended.out).slice(-1500)}`).toEqual([]);
    expect(plain(ended.out), "and the run does not end by saying it passed").not.toMatch(/^prove ✔/m);
  }, 300_000);
});

describe("04 controls: differences refuses each way a run can differ from the HTTP run", () => {
  const http: ReadonlyArray<Step> = [
    { name: "a", verdict: "pass", failures: [], operation: "handle.claim" },
    { name: "b", verdict: "pass", failures: [], operation: "handle.claim" },
    { name: "c", verdict: "pass", failures: [], operation: "handle.resolve" },
  ];
  const plant = (change: (steps: Array<Step>) => Array<Step>) => differences(http, change([...http]));
  it("accepts the same run", () => expect(differences(http, [...http])).toEqual([]));
  it("refuses a step missing, extra, repeated and out of order", () => {
    expect(plant((s) => s.slice(1))).not.toEqual([]);
    expect(plant((s) => [...s, { name: "d", verdict: "pass", failures: [], operation: "handle.claim" }])).not.toEqual([]);
    expect(plant((s) => [...s, s[0]!])).not.toEqual([]);
    expect(plant((s) => [s[1]!, s[0]!, s[2]!])).not.toEqual([]);
  });
  it("refuses another verdict, other failures and another operation, on any step and not only the first", () => {
    expect(plant((s) => s.map((x, i) => (i === 2 ? { ...x, verdict: "fail" } : x)))).not.toEqual([]);
    expect(plant((s) => s.map((x, i) => (i === 1 ? { ...x, failures: ["expected a, got b"] } : x)))).not.toEqual([]);
    expect(plant((s) => s.map((x, i) => (i === 2 ? { ...x, operation: "handle.claim" } : x)))).not.toEqual([]);
  });
});

describe("04 controls: browserLog reads what a real browser run says and nothing else", () => {
  const real = [
    "2026-11-22T07:49:12.992Z pw:api => browserType.launch started",
    "2026-11-22T07:49:14.088Z pw:api => page.goto started",
    "2026-11-22T07:49:14.125Z pw:api => locator.pressSequentially started",
    "2026-11-22T07:49:14.472Z pw:api => locator.click started",
    "2026-11-22T07:49:14.610Z pw:api => page.evaluate started",
  ].join("\n");
  it("counts a launch, a page and three interactions", () => expect(browserLog(real)).toEqual({ launched: 1, opened: 1, interactions: 3 }));
  it("counts nothing in prose that only mentions a browser", () => expect(browserLog("launched chromium, clicked the button, page.goto happened\n")).toEqual({ launched: 0, opened: 0, interactions: 0 }));
  it("does not count a finished call twice", () => expect(browserLog("pw:api <= locator.click succeeded\npw:api => locator.click started\n").interactions).toBe(1));
});
