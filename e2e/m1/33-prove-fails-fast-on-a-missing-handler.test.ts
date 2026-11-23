// Check 33 (found by the reviews of #214): `ortho prove` fails fast, and says why, when a handler file is missing. A developer's typo or
// delete must not leave prove sitting for minutes: with `src/allowance/revoke.ts` removed, wrangler cannot resolve the import, the world
// never comes up, and prove (warm or cold) waited more than 120 to 170 s with nothing said. Written by the checks author; a builder never
// edits this file (AGENTS.md, "Journeys and checks come first").
//
// WHAT IS REQUIRED. In a copy of acme with a handler removed, `ortho prove` (the whole run, and `--only` one journey, which needs the
// same world) exits non-zero within 60 s and says why: wrangler's resolve failure naming the missing file (`Could not resolve` and
// `src/allowance/revoke` in one line), or a "could not start" message that carries the build error and the path. An unrelated failure
// (a taken port, out of memory, a type error in another file, a journey failing in the handler) does not count.
//
// THE BOUND, 60 s. A healthy `ortho prove --only` takes 5 to 12 s on the shared Mac and a whole healthy prove of acme 10 to 45 s under
// load (checks 29 and 30 measured both); a world that cannot start should fail after the time a world takes to start, not after a
// whole run. 60 s is above the slowest healthy start seen, so a loaded machine does not make this red, and a third of the shortest
// hang seen (more than 170 s), so a hang does. Nothing waits for it to end: prove runs in a process group of its own, and the check
// stops that whole group and every descendant of prove found at that moment (not a name-filtered list), then asserts, in the red case
// as in the green, that nothing of this copy is left running.
//
// Red today on one reason: prove does not exit within the bound ("still running after 60 s"). Controls, true today: the same prove with the
// handler present exits well inside the bound, with the journey's verdict; and a copy that is not broken is not called broken.
// No Docker. Prove's own world uses port 0.
import { spawn, spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cli, copyOf, acme, nothingRunning } from "../layer1/support.ts";
import { worldProcesses } from "./prove-speed.ts";

const BOUND_SECONDS = 60;
const HANDLER = "src/allowance/revoke.ts";

const copies: Array<ReturnType<typeof copyOf>> = [];
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });
const fresh = () => { const copy = copyOf(acme); copies.push(copy); return copy.root; };

/** Every process below this pid, whatever its name, as of now. */
const descendants = (top: number): ReadonlyArray<number> => {
  const table = spawnSync("ps", ["-axo", "pid=,ppid="], { encoding: "utf8" }).stdout.split("\n")
    .flatMap((line) => { const m = line.trim().match(/^(\d+)\s+(\d+)$/); return m ? [{ pid: Number(m[1]), ppid: Number(m[2]) }] : []; });
  const below = new Set([top]);
  for (let grew = true; grew;) { grew = false; for (const p of table) if (below.has(p.ppid) && !below.has(p.pid)) { below.add(p.pid); grew = true; } }
  return [...below];
};
const signal = (pids: ReadonlyArray<number>, name: NodeJS.Signals) => { for (const pid of pids) { try { process.kill(pid, name); } catch { /* gone */ } } };

interface Ended { readonly status: number | null; readonly out: string; readonly seconds: number; readonly hung: boolean }
/** `ortho prove <args>` as a user runs it, in a process group of its own; stopped at the bound, with all it started, if it is still there. */
const proveWithin = async (root: string, ...args: ReadonlyArray<string>): Promise<Ended> => {
  const child = spawn(process.execPath, [cli, "prove", ...args, "--root", root], { cwd: root, detached: true });
  let out = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { out += d; });
  const started = Date.now();
  let timer: NodeJS.Timeout | undefined;
  const status = await new Promise<number | null | "hung">((resolve) => {
    child.once("close", (code) => resolve(code));
    timer = setTimeout(() => resolve("hung"), BOUND_SECONDS * 1000);
  });
  clearTimeout(timer);
  const seconds = (Date.now() - started) / 1000;
  if (status === "hung") {
    const tree = descendants(child.pid!);
    try { process.kill(-child.pid!, "SIGTERM"); } catch { /* gone */ }
    signal(tree, "SIGTERM");
    await new Promise((r) => setTimeout(r, 3000));
    try { process.kill(-child.pid!, "SIGKILL"); } catch { /* gone */ }
    signal(tree, "SIGKILL");
    return { status: null, out, seconds, hung: true };
  }
  return { status, out, seconds, hung: false };
};
/** Nothing of this copy is left running: waited for a few seconds, since a world takes a moment to go. */
const leftRunning = async (root: string) => {
  for (let i = 0; i < 20; i++) { if (worldProcesses(root).length === 0 && spawnSync("pgrep", ["-f", root], { encoding: "utf8" }).stdout.trim() === "") return []; await new Promise((r) => setTimeout(r, 250)); }
  return [...worldProcesses(root), spawnSync("pgrep", ["-fl", root], { encoding: "utf8" }).stdout.trim()];
};

/**
 * What the message must do: wrangler's resolve failure naming the missing file, in one line; or a "could not start" message that carries
 * the build error and the path. Anything else that mentions the file or the failure to start does not count.
 */
const explains = (out: string) =>
  /Could not resolve[^\n]*src\/allowance\/revoke/.test(out) ||
  (/could not start/i.test(out) && /src\/allowance\/revoke/.test(out) && /Could not resolve|Build failed|esbuild/i.test(out));

describe("33 controls: with its handler present, prove ends inside the bound with the journey's verdict", () => {
  it("the message test knows a good message from a bad one", () => {
    expect(explains("prove couldn't run: the world could not start: wrangler: Could not resolve \"../../src/allowance/revoke.ts\"")).toBe(true);
    expect(explains("prove couldn't run: the world could not start (wrangler build failed for src/allowance/revoke.ts)")).toBe(true);
    expect(explains("prove couldn't run: the world could not start (wrangler build failed: ERROR Could not resolve ./x.ts)"), "it names another file").toBe(false);
    expect(explains("prove couldn't run: the world could not start: ✘ [ERROR] Could not resolve \"./src/allowance/revoke.ts\"")).toBe(true);
    expect(explains("")).toBe(false);
    expect(explains("prove couldn't run")).toBe(false);
    expect(explains("the world could not start")).toBe(false);
    expect(explains("Could not resolve something")).toBe(false);
    // Four failures that are not this one, which the first version of the matcher took for it.
    expect(explains("the world could not start: wrangler exited (EADDRINUSE)")).toBe(false);
    expect(explains("the world failed to start: ERROR out of memory")).toBe(false);
    expect(explains("TypeError at src/allowance/revoke.test: x")).toBe(false);
    expect(explains("journey an outsider cannot revoke ✘ (src/allowance/revoke.ts handler threw)")).toBe(false);
    expect(explains("src/allowance/revoke.ts is missing")).toBe(false);
  });

  it("acme with revoke.ts present proves `health is up`: exit within the bound, the journey passes, and nothing is left running", async () => {
    const root = fresh();
    const ended = await proveWithin(root, "--only", "health is up");
    expect(ended.hung, ended.out.slice(-300)).toBe(false);
    expect(ended.out).toMatch(/^journey health is up ✔ 1\/1 steps$/m);
    expect(ended.seconds).toBeLessThan(BOUND_SECONDS);
    nothingRunning(root);
  });

  it("acme with revoke.ts present proves `an outsider cannot revoke` (the journey that reaches the file's operation), inside the bound", async () => {
    const root = fresh();
    const ended = await proveWithin(root, "--only", "an outsider cannot revoke");
    expect(ended.hung, ended.out.slice(-300)).toBe(false);
    expect(ended.out).toMatch(/^journey an outsider cannot revoke ✔ 1\/1 steps$/m);
    nothingRunning(root);
  });
});

describe("33: a missing handler fails fast and says why", () => {
  it("a whole prove with src/allowance/revoke.ts removed exits non-zero within 60 s and names the file or says the world could not start, with wrangler's error", async () => {
    const root = fresh();
    rmSync(join(root, HANDLER));
    const ended = await proveWithin(root);
    expect(await leftRunning(root), "prove left processes of this copy running").toEqual([]);
    expect(ended.hung, `prove was still running after ${BOUND_SECONDS} s with nothing said: ${JSON.stringify(ended.out.slice(-200))}`).toBe(false);
    expect(ended.status, ended.out.slice(-300)).not.toBe(0);
    expect(explains(ended.out), `the message does not say why:\n${ended.out.slice(-600)}`).toBe(true);
  });

  it("the same with `--only 'health is up'`, a journey that never touches the missing file's operation: the world cannot start either", async () => {
    const root = fresh();
    rmSync(join(root, HANDLER));
    const ended = await proveWithin(root, "--only", "health is up");
    expect(await leftRunning(root), "prove left processes of this copy running").toEqual([]);
    expect(ended.hung, `prove was still running after ${BOUND_SECONDS} s with nothing said: ${JSON.stringify(ended.out.slice(-200))}`).toBe(false);
    expect(ended.status, ended.out.slice(-300)).not.toBe(0);
    expect(explains(ended.out), `the message does not say why:\n${ended.out.slice(-600)}`).toBe(true);
  });
});
