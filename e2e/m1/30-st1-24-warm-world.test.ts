// Check 30 (ST1.24, Goal 3): a warm world. `ortho dev` keeps the world and the collector up, and `ortho prove` uses them when they are
// there, so a second prove in a row skips the five seconds of start-up, with the verdict a cold run gives and none of the last run's
// records in its way. Written by the checks author from `design/research/speed-and-vitest-proposal.md` (A1); a builder never edits this
// file or `prove-speed.ts` (AGENTS.md, "Journeys and checks come first"). The reasoning is in `design/decisions/ST1-23-prove-changed.md`
// ("The warm world's check").
//
// THE SURFACE THE CHECK EXPECTS (the builder's brief). No new flag: `ortho dev --root R --port P` as today, and `ortho prove --root R`.
//   `ortho dev` also keeps the collector (the one a prove makes), and leaves under `.ortho/` what prove needs to find both, removed when
//   dev stops. `ortho prove` (--env local, no --empty or --only needed) that finds a live one uses it instead of starting its own, and
//   says so, in its text and in the report's `lines`, as one line:
//       prove: reusing the world of ortho dev at http://127.0.0.1:<dev's port>
//   It starts no wrangler and no workerd process of its own. Whatever the world holds from an earlier run, or from the developer, it must
//   not be in a run's way: reset before the run, or an isolated store for the run, its builder's call; the check asks only that a run
//   never sees the last one's records, and that the verdict is the cold run's. A record that is stale (dev was stopped, or killed) is
//   not used: prove starts a world of its own and says nothing of reusing one. The collector `ortho dev` keeps writes to
//   `.ortho/dev-telemetry/` (where `ortho telemetry trace` already looks), and the world's spans of a warm prove reach it: the check reads
//   the operations a warm run really asked of the world from there, and wants those of a cold run of the same project, so a prove that
//   prints the line and replays a cached verdict, or runs the journeys somewhere else, is caught.
//
// HOW IT IS JUDGED, and why. Wall-clock on the shared Mac is noisy, so the proof of "warm" is not the time. Three rows:
//   1. HARD, structural: against `ortho dev`, a prove starts no wrangler or workerd process (a poll of `ps` every 120 ms for the whole run,
//      minus the processes that were already running when it started: dev's own), says it is reusing dev's world, at dev's URL, and gives
//      the verdict a cold run of the same project gave (every journey and step, by name), and the world's spans in dev's collector folder
//      name the operations a cold run's did (the process poll also counts anything wrangler, workerd or miniflare under prove's own pid).
//   2. HARD, isolation: a fixture journey (`a run leaves a record`: a person signs up with one fixed email, which a world refuses a second
//      time) is run three times in a row against one warm world; each run must pass and each must reuse the world. A world that kept the
//      last run's person would refuse the second.
//   3. RATIO, speed: the warm run of one fixed journey, `health is up` (`--only`), is timed after a warm-up, three times, and the fastest is at most 70% of
//      the cold run of that same journey measured on the same machine in the same test (a cold run twice as slow on a loaded runner has a warm run twice as
//      slow). One journey, because the saving is a fixed start-up of about 5 s: on the whole project the ratio would move with acme's journey count
//      (`design/decisions/ST1-24-timing.md`, addendum of 21 November 2026). Rows 1 and 2 keep the whole project's verdict and spans covered.
//      Row 1 says the speed-up is real; this row says it is enough. It prints every time it measured, and whether the fastest warm run was
//      under 6 s, which is the target on a developer's machine and information only here (design/decisions/ST1-24-timing.md). It runs
//      only if the warm-up reused dev's world.
// Guards that pass today and must keep passing: a handler edited between two warm runs is what the next run judges (its verdict is the
// cold run's on the same edit), a prove after `ortho dev` has stopped, or been killed (its record left behind), starts a world of its
// own, says nothing of reusing one, and passes. Not planted: a reset that clears only some of a world's stores. The fixture is a
// sign-up, which the person's store refuses; a build that resets less than the world holds is for its own tests and for the review.
//
// Red today on one reason: `ortho prove` ignores `ortho dev` and starts a world of its own ("prove did not say it was reusing the world"
// and "started wrangler or workerd processes of its own"), so rows 1 to 3 fail. Controls, true today: the cold run is the reference;
// the poll sees the processes of a world while `ortho dev` runs and of a cold prove, and none after; a world that lives past a run keeps
// the fixture's record (so there is a leak to catch); the verdict comparison tells one failing step from a passing one.
// No Docker. dev's port is free from the OS (`e2e/ports.ts`); prove's own worlds use port 0. Every process started is stopped by pid.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cli, copyOf, nothingRunning, acme } from "../layer1/support.ts";
import { freePorts } from "../ports.ts";
import { edit, prove, proveWarm, worldProcesses, worldProcessesUnder, DEV_FOLDER, type Proved, type Report } from "./prove-speed.ts";

const PORTS = freePorts("dev", "control", "leak", "stopped", "killed", "edited");
const SPEND = "src/allowance/spend.ts";
const FIXTURE = `// Check 30's fixture. A person signs up with one fixed email: a world that still holds the last run's person refuses it.
import { Blueprint, expect, spans } from "orthograph";
import signUp from "../blueprint/things/person/verbs/sign-up.ts";

export default Blueprint.journey("a run leaves a record", {
  cast: { newcomer: Blueprint.anyone },
  steps: (s) => [
    s.step(
      "the same email signs up",
      s.newcomer.run(signUp, { email: "left-behind@example.test", password: s.newcomer.password, name: "Left Behind" }),
      expect((a) => a.person).toMatch(/^per_[0-9a-z]+$/),
      spans({ present: ["person.sign-up"] }),
    ),
  ],
});
`;
const REUSING = /^prove: reusing the world of ortho dev at (http:\/\/127\.0\.0\.1:\d+)\s*$/m;

const project = () => {
  const copy = copyOf(acme);
  mkdirSync(join(copy.root, "journeys"), { recursive: true });
  writeFileSync(join(copy.root, "journeys/a-run-leaves-a-record.ts"), FIXTURE);
  return copy;
};
/** What a verdict is: every journey and every step, by name, with its verdict. Never a time, a port or an id. */
const verdictOf = (report: Report | undefined) => JSON.stringify({
  passed: report?.passed,
  journeys: [...(report?.journeys ?? [])].sort((a, b) => a.name.localeCompare(b.name)).map((j) => [j.name, j.verdict, j.steps.map((s) => [s.name, s.verdict])]),
});

/** `ortho dev`, started as a user does, ready once the world answers; stopped by its pid, and what it started with it. */
const startDev = async (root: string, port: number) => {
  const child = spawn(process.execPath, [cli, "dev", "--root", root, "--port", String(port)], { cwd: root, stdio: "ignore" });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 480; i++) {
    if (child.exitCode !== null) throw new Error("ortho dev exited before the world answered");
    if (await fetch(`${url}/_world/health`).then((r) => r.ok, () => false)) return { child, url };
    await new Promise((r) => setTimeout(r, 250));
  }
  child.kill("SIGTERM");
  throw new Error(`${url} never answered`);
};
const stopDev = async (child: ChildProcess) => {
  if (child.exitCode !== null) return;
  const exited = new Promise<void>((r) => child.once("exit", () => r()));
  child.kill("SIGTERM");
  await Promise.race([exited, new Promise((r) => setTimeout(r, 30_000))]);
  if (child.exitCode === null) child.kill("SIGKILL");
};
const reused = (run: Proved, url: string) => run.out.match(REUSING)?.[1] === url && run.report?.lines.some((l) => REUSING.test(l)) === true;
const why = (run: Proved) => `${run.out.slice(-300)}\nworld processes started by prove: ${[...run.worlds].join(" | ") || "none"}`;

/** The speed row's rule: the faster timed warm run takes at most this share of the cold run on the same machine. */
const WARM_AT_MOST = 0.7;
const fastEnough = (warmSeconds: ReadonlyArray<number>, coldSeconds: number) => Math.min(...warmSeconds) <= WARM_AT_MOST * coldSeconds;

const copies: Array<ReturnType<typeof project>> = [];
const fresh = () => { const copy = project(); copies.push(copy); return copy; };
// The controls and the guards run together (each on a dev port of its own), so a copy goes when the file is done, never by one row's hook.
afterAll(() => { for (const copy of copies.splice(0)) copy.remove(); });

let cold: Proved;
let reference: ReturnType<typeof project>;
beforeAll(async () => {
  reference = project();
  cold = await prove(reference.root);
}, 600_000);
afterAll(() => reference?.remove());

describe.concurrent("30 controls: the reference, and the instruments", () => {
  it("a cold prove of the project, with the fixture, passes all 16 journeys and starts a world of its own (the poll sees it), saying nothing of reusing one", () => {
    expect(cold.status, why(cold)).toBe(0);
    expect(cold.report?.journeys).toHaveLength(16);
    expect(cold.worlds.size, "the poll never saw the cold prove's wrangler or workerd").toBeGreaterThan(0);
    expect(cold.out).not.toMatch(REUSING);
    console.log(`30: a cold prove took ${cold.seconds.toFixed(1)} s`);
    nothingRunning(reference.root);
  });

  it("the poll sees the processes of a world while `ortho dev` runs, and none once it has stopped", async () => {
    const copy = fresh();
    const dev = await startDev(copy.root, PORTS.control);
    try {
      expect(worldProcesses(copy.root).length, "no wrangler or workerd named the project while dev ran").toBeGreaterThan(0);
    } finally { await stopDev(dev.child); }
    nothingRunning(copy.root);
    expect(worldProcesses(copy.root)).toEqual([]);
  });

  it("a world that lives past a run keeps the fixture's record: the same email is refused the second time (there is a leak to catch)", async () => {
    const copy = fresh();
    const dev = await startDev(copy.root, PORTS.leak);
    try {
      const acmeCli = (...args: ReadonlyArray<string>) => spawnSync(process.execPath, [join(copy.root, "generated/cli/src/main.ts"), ...args], { encoding: "utf8", env: { ...process.env, ACME_URL: dev.url } });
      const signUp = () => acmeCli("person", "sign-up", "--email", "left-behind@example.test", "--password", "a-long-enough-password-1", "--name", "Left Behind", "--json");
      const first = signUp();
      expect(first.status, first.stderr).toBe(0);
      const second = signUp();
      expect([second.status === 0, second.stderr]).toEqual([false, expect.stringMatching(/PersonEmailTaken/)]);
    } finally { await stopDev(dev.child); }
    nothingRunning(copy.root);
  });

  it("the speed rule: green at CI's and the quiet Mac's numbers (6.18 and 6.58 s warm against 13.4 cold; 4.7 against 9.7), red for a second run that is cold (about 100%), and at the edge", () => {
    expect(fastEnough([6.18, 6.58], 13.4)).toBe(true);
    expect(fastEnough([4.7, 4.9], 9.7)).toBe(true);
    expect(fastEnough([13.0, 13.9], 13.4), "a cold second run").toBe(false);
    expect(fastEnough([9.5, 9.8], 13.4), "just over 70%").toBe(false);
    expect(fastEnough([5.71, 6.2], 9.7), "the reviewer's run of the real build, 59%").toBe(true);
    expect(fastEnough([8.0, 9.0], 13.4)).toBe(true);
    expect(fastEnough([20, 21], 13.4), "slower than cold").toBe(false);
  });

  it("the verdict comparison tells a failing step from a passing one, and ignores order", () => {
    const report = cold.report!;
    expect(verdictOf(report)).toBe(verdictOf({ ...report, journeys: [...report.journeys].reverse() }));
    const broken = { ...report, journeys: report.journeys.map((j, i) => (i === 0 ? { ...j, steps: j.steps.map((s, k) => (k === 0 ? { ...s, verdict: "fail" } : s)) } : j)) };
    expect(verdictOf(broken)).not.toBe(verdictOf(report));
    expect(verdictOf({ ...report, passed: false })).not.toBe(verdictOf(report));
    expect(verdictOf({ ...report, journeys: report.journeys.slice(1) })).not.toBe(verdictOf(report));
  });
});

describe("30 ST1.24: a warm world", () => {
  const warm = { root: "", url: "", child: undefined as ChildProcess | undefined, copy: undefined as ReturnType<typeof project> | undefined };
  beforeAll(async () => {
    warm.copy = project();
    warm.root = warm.copy.root;
    const dev = await startDev(warm.root, PORTS.dev);
    warm.url = dev.url;
    warm.child = dev.child;
  }, 300_000);
  afterAll(async () => {
    if (warm.child) await stopDev(warm.child);
    warm.copy?.remove();
  }, 120_000);

  // Three runs in a row against one fresh warm world, made once and read by the next two rows: the second is "a second prove in a row",
  // and the three together are the isolation row. (Each used to make its own runs, five full proves in all.)
  let threeRuns: Promise<ReadonlyArray<Proved>> | undefined;
  const threeWarmRuns = () => (threeRuns ??= (async () => {
    const runs: Array<Proved> = [];
    for (let run = 1; run <= 3; run++) runs.push(await proveWarm(warm.root));
    return runs;
  })());

  it("a second prove in a row against ortho dev starts no world of its own, says it is reusing dev's, and gives the cold run's verdict", async () => {
    const [first, second] = await threeWarmRuns();
    expect(reused(first!, warm.url), `the first prove did not say it was reusing the world\n${why(first!)}`).toBe(true);
    console.log(`30: against ortho dev, the second prove took ${second!.seconds.toFixed(1)} s (a cold one took ${cold.seconds.toFixed(1)} s)`);
    expect(reused(second!, warm.url), `the second prove did not say it was reusing the world\n${why(second!)}`).toBe(true);
    expect([...second!.worlds], `prove started wrangler or workerd processes of its own\n${why(second!)}`).toEqual([]);
    expect(second!.status, why(second!)).toBe(0);
    expect([...second!.called].sort(), `dev's collector (${DEV_FOLDER}) did not hear what a cold run's did`).toEqual([...cold.called].sort());
    expect(verdictOf(second!.report)).toBe(verdictOf(cold.report));
  });

  it("a record one run plants is not in the next run's way: a fixed email signs up in each of three runs in a row", async () => {
    const runs = await threeWarmRuns();
    for (const [i, proved] of runs.entries()) {
      const run = i + 1;
      expect(reused(proved, warm.url), `run ${run} did not reuse the world: the test would prove nothing\n${why(proved)}`).toBe(true);
      expect([...proved.worlds], `run ${run} started a world of its own\n${why(proved)}`).toEqual([]);
      const left = proved.report?.journeys.find((j) => j.name === "a run leaves a record");
      expect([run, left?.verdict, left?.steps.map((s) => s.verdict)], why(proved)).toEqual([run, "pass", ["pass"]]);
      expect(verdictOf(proved.report), `run ${run}`).toBe(verdictOf(cold.report));
    }
  });

  // What a warm world saves is the world's start, so the timed runs prove one journey, cold and warm: the saving is then the whole run and does not shrink as acme gains
  // journeys (M2.02 added four, each taking seconds of its own in a world, which pushed the full-run ratio over 70% with nothing wrong in the warm path). `--only` also judges
  // the evals, which one journey cannot satisfy, so the run exits 1 and each timed run is judged by its journey's verdict.
  it("the fastest of three timed warm prove runs of one journey, after a warm-up, is at most 70% of the cold run of that journey measured on this machine", async () => {
    const only = ["--only", "health is up"] as const;
    const passed = (proved: { readonly report: { readonly journeys: ReadonlyArray<{ readonly name: string; readonly verdict: string }> } | undefined }) =>
      JSON.stringify(proved.report?.journeys.map((j) => [j.name, j.verdict])) === JSON.stringify([["health is up", "pass"]]);
    const coldOne = await prove(fresh().root, ...only);
    expect(passed(coldOne), why(coldOne)).toBe(true);
    const warmUp = await proveWarm(warm.root, ...only);
    expect(reused(warmUp, warm.url), `nothing is warm, so there is nothing to time\n${why(warmUp)}`).toBe(true);
    const times: Array<number> = [];
    for (let i = 0; i < 3; i++) {
      const timed = await proveWarm(warm.root, ...only);
      expect(passed(timed), why(timed)).toBe(true);
      times.push(timed.seconds);
    }
    console.log(`30: warm prove wall-clock of one journey, seconds: ${times.map((x) => x.toFixed(2)).join(", ")}; the cold reference took ${coldOne.seconds.toFixed(1)}; the faster warm run is ${(100 * Math.min(...times) / coldOne.seconds).toFixed(0)}% of it`);
    expect(fastEnough(times, coldOne.seconds), `warm runs took ${times.map((x) => x.toFixed(1)).join(" s, ")} s against a cold ${coldOne.seconds.toFixed(1)} s`).toBe(true);
  });
});

describe.concurrent("30 guards: true today, and the warm path must keep them true", () => {
  it("a handler edited between two warm runs is what the next run judges: its verdict is the cold run's on the same edit, and the edit's removal brings the passing one back", async () => {
    const broken = fresh();
    const warmCopy = fresh();
    const breakSpend = (root: string) => edit(root, SPEND, (t) => t.replace("return { remaining: remaining - amount }", "return { remaining }"));
    breakSpend(broken.root);
    const coldBroken = await prove(broken.root);
    expect(coldBroken.status, "the planted break must fail a cold prove").toBe(1);
    const dev = await startDev(warmCopy.root, PORTS.edited);
    try {
      expect(verdictOf((await prove(warmCopy.root)).report)).toBe(verdictOf(cold.report));
      breakSpend(warmCopy.root);
      const edited = await prove(warmCopy.root);
      expect(edited.status, why(edited)).toBe(1);
      expect(verdictOf(edited.report)).toBe(verdictOf(coldBroken.report));
      writeFileSync(join(warmCopy.root, SPEND), readFileSync(join(acme, SPEND), "utf8"));
      expect(verdictOf((await prove(warmCopy.root)).report)).toBe(verdictOf(cold.report));
    } finally { await stopDev(dev.child); }
    nothingRunning(warmCopy.root);
  });

  it("after ortho dev was killed, leaving its record behind, prove starts a world of its own and says nothing of reusing one", async () => {
    const copy = fresh();
    const dev = await startDev(copy.root, PORTS.killed);
    process.kill(dev.child.pid!, "SIGKILL");
    // Its wrangler and workerd are left running: stop each by pid (they name this project's temporary folder, and nothing else's).
    for (const line of [...worldProcesses(copy.root), ...worldProcessesUnder(dev.child.pid!)]) {
      try { process.kill(Number(line.split(/\s+/)[0]), "SIGTERM"); } catch { /* already gone */ }
    }
    for (let i = 0; i < 40 && worldProcesses(copy.root).length > 0; i++) await new Promise((r) => setTimeout(r, 250));
    for (const line of worldProcesses(copy.root)) { try { process.kill(Number(line.split(/\s+/)[0]), "SIGKILL"); } catch { /* already gone */ } }
    const proved = await prove(copy.root);
    expect(proved.status, why(proved)).toBe(0);
    expect(proved.out).not.toMatch(REUSING);
    expect(proved.worlds.size, "prove should have started a world of its own").toBeGreaterThan(0);
    nothingRunning(copy.root);
  });

  it("after ortho dev has stopped, prove starts a world of its own, says nothing of reusing one, and passes", async () => {
    const copy = fresh();
    const dev = await startDev(copy.root, PORTS.stopped);
    await stopDev(dev.child);
    const proved = await prove(copy.root);
    expect(proved.status, why(proved)).toBe(0);
    expect(proved.out).not.toMatch(REUSING);
    expect(proved.worlds.size, "prove should have started a world of its own").toBeGreaterThan(0);
    nothingRunning(copy.root);
  });
});
