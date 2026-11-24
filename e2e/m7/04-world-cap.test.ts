// Check 04 (M7.05; credential 4 of `design/decisions/M7-release.md`: "at most 20 worlds a day, each destroyed"): the cap the workflow's `cap` step runs, before any world is made.
// `node tools/release/world-cap.mjs` (Goal 15 owns `tools/release/`) counts the WORLDS made today (UTC) by this workflow and refuses when there are more than `WORLD_CAP`. A run made a world when its job got past the step
// named `cap`: that step finished with `success`, or is the one running now (this run counts itself, so a day's 20th run goes and its 21st does not). A run whose job was skipped (a fork's pull request, a draft: the
// job's `if`), whose `cap` step was skipped, refused, cancelled or never started, made none and is not counted; neither is a job of another name. It refuses rather than guess: a count it cannot read, a cap that is
// not a plain positive decimal integer, and an API address that is not GitHub's are each a refusal (exit 2) that makes no request, and the token it asks with is never printed.
// THE SURFACE. Environment: GH_TOKEN (the job's `github.token`, `actions: read`), GITHUB_API_URL (the runner sets it; here it is `https://api.github.com` or an `http://` address on this machine, anything else is refused),
// GITHUB_REPOSITORY (`owner/repo`), WORKFLOW_FILE (a file name, no slash) and WORLD_CAP (`[1-9][0-9]*`: no sign, no leading zero, no exponent, no hex, no space, no `Infinity`). Requests, each with `Authorization: Bearer <token>`: the pages of
// `GET <api>/repos/<repo>/actions/workflows/<file>/runs?created=>=<today, YYYY-MM-DD, UTC>&per_page=100&page=<n>` (`workflow_runs[].id`; paging until a page is short) and, for each run, `GET <api>/repos/<repo>/actions/runs/<id>/jobs?per_page=100`
// (`jobs[]` with `name`, `steps[]` with `name`, `status`, `conclusion`). The job is `prove (test)` and the step `cap` (check 01 pins both names). Exit 0: within the cap, one line says the count and the cap. Exit 1: past it, a
// line starting `::error::` naming both numbers. Exit 2: nothing could be judged. A plain `node` script, nothing imported from outside the repository.
// HOW IT IS JUDGED. A real HTTP server on this machine stands in for GitHub's API and writes down every request; the real script is run against it. The default address is checked with `deny-network.mjs`: it must be `api.github.com`.
// NOT JUDGED HERE: GitHub's own answers (the first real run is the proof). Red today on one reason: the script does not exist.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { freePorts, repo } from "./support.ts";

const script = join(repo, "tools/release/world-cap.mjs");
const PORTS = freePorts("api");
const SENTINEL = "sentinel-6b2f90d1";
const base = `http://127.0.0.1:${PORTS.api}`;
type Step = { name: string; status: string; conclusion: string | null };
type Job = { name: string; status: string; conclusion: string | null; steps: Step[] };
let runs: Array<{ id: number; jobs: Job[] }> = [];
const heard: Array<{ path: string; query: URLSearchParams; authorization: string | undefined }> = [];
let broken: ((path: string, res: ServerResponse) => boolean) | undefined;
let server: Server;
beforeAll(async () => {
  server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", base);
    heard.push({ path: url.pathname, query: url.searchParams, authorization: req.headers.authorization });
    if (broken?.(url.pathname, res)) return;
    const json = (v: unknown) => res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(v));
    const list = /^\/repos\/acme\/orthograph\/actions\/workflows\/test-worlds\.yml\/runs$/.test(url.pathname);
    const jobs = /^\/repos\/acme\/orthograph\/actions\/runs\/(\d+)\/jobs$/.exec(url.pathname);
    if (list) {
      const per = Number(url.searchParams.get("per_page") ?? 30), page = Number(url.searchParams.get("page") ?? 1);
      return json({ total_count: runs.length, workflow_runs: runs.slice((page - 1) * per, page * per).map((r) => ({ id: r.id })) });
    }
    const run = jobs === null ? undefined : runs.find((r) => r.id === Number(jobs[1]));
    return run === undefined ? void res.writeHead(404).end("{}") : json({ total_count: run.jobs.length, jobs: run.jobs });
  });
  await new Promise<void>((ok) => server.listen(PORTS.api, "127.0.0.1", ok));
});
afterAll(() => new Promise<void>((ok) => { server.closeAllConnections(); server.close(() => ok()); }));

const step = (conclusion: string | null, status = conclusion === null ? "in_progress" : "completed"): Step => ({ name: "cap", status, conclusion });
const job = (steps: Step[], name = "prove (test)", conclusion: string | null = "success"): Job => ({ name, status: "completed", conclusion, steps });
const made = (id: number): { id: number; jobs: Job[] } => ({ id, jobs: [job([step("success")])] });
const skipped = (id: number) => ({ id, jobs: [job([], "prove (test)", "skipped")] });
const set = (...rs: Array<{ id: number; jobs: Job[] }>) => { runs = rs; broken = undefined; };
const range = (from: number, n: number, make: (id: number) => { id: number; jobs: Job[] }) => Array.from({ length: n }, (_, i) => make(from + i));

const BASE_ENV = { GH_TOKEN: SENTINEL, GITHUB_API_URL: base, GITHUB_REPOSITORY: "acme/orthograph", WORKFLOW_FILE: "test-worlds.yml", WORLD_CAP: "20" };
/** The script as a child of this process, run asynchronously: the stand-in server is in this process too, so a blocking spawn would never be answered. */
const child = (args: ReadonlyArray<string>, env: Record<string, string>) => new Promise<{ status: number | null; said: string }>((done) => {
  const p = spawn(process.execPath, [...args], { env: { PATH: process.env["PATH"] ?? "", ...env }, stdio: ["ignore", "pipe", "pipe"] });
  let said = "";
  p.stdout.setEncoding("utf8").on("data", (c: string) => { said += c; });
  p.stderr.setEncoding("utf8").on("data", (c: string) => { said += c; });
  const timer = setTimeout(() => p.kill("SIGKILL"), 60_000);
  p.on("close", (status) => { clearTimeout(timer); done({ status, said }); });
});
const run = async (env: Record<string, string | undefined> = {}) => {
  expect(existsSync(script), "tools/release/world-cap.mjs does not exist").toBe(true);
  const before = heard.length;
  const done = await child([script], Object.fromEntries(Object.entries({ ...BASE_ENV, ...env }).filter(([, v]) => v !== undefined)) as Record<string, string>);
  return { ...done, asked: heard.slice(before) };
};
const utcDay = () => new Date().toISOString().slice(0, 10);

describe("04: the day's cap on test worlds (M7.05)", () => {
  it("counts worlds made, and says the count and the cap: up to the cap passes, past it refuses with an ::error:: naming both numbers", async () => {
    for (const n of [0, 1, 19, 20]) { set(...range(1, n, made)); const r = await run(); expect([n, r.status], r.said).toEqual([n, 0]); expect(r.said).toContain(String(n)); expect(r.said).toContain("20"); }
    for (const n of [21, 22]) { set(...range(1, n, made)); const r = await run(); expect([n, r.status], r.said).toEqual([n, 1]); expect(r.said).toMatch(/::error::/); expect(r.said).toContain(String(n)); }
  });

  it("does not count runs whose job was skipped: a day of fork and draft runs leaves the cap to the worlds", async () => {
    set(...range(1, 20, made), ...range(100, 150, skipped));
    expect((await run()).status).toBe(0);
    set(...range(1, 21, made), ...range(100, 5, skipped));
    expect((await run()).status).toBe(1);
  });

  describe("counts only a job that got past the cap step", () => {
    const only = (id: number, jobs: Job[]) => ({ id, jobs });
    const notCounted: ReadonlyArray<readonly [string, Job[]]> = [
      ["a skipped job (a fork, a draft)", [job([], "prove (test)", "skipped")]],
      ["a job with no steps yet (queued)", [{ name: "prove (test)", status: "queued", conclusion: null, steps: [] }]],
      ["a cap step that was skipped", [job([step("skipped")])]],
      ["a cap step that refused (past the cap: no world)", [job([step("failure")], "prove (test)", "failure")]],
      ["a cap step that was cancelled", [job([step("cancelled")], "prove (test)", "cancelled")]],
      ["a cap step still queued", [job([{ name: "cap", status: "queued", conclusion: null }])]],
      ["a job of another name that has a cap step", [job([step("success")], "lint")]],
      ["a job whose only success is another step", [job([{ name: "credentials", status: "completed", conclusion: "success" }])]],
    ];
    it.each(notCounted)("%s is not a world", async (_name, jobs) => {
      set(...range(1, 20, made), only(500, jobs));
      expect((await run()).status, _name).toBe(0);
    });
    const counted: ReadonlyArray<readonly [string, Job[]]> = [
      ["a cap step that succeeded", [job([step("success")])]],
      ["the cap step running now (this run counts itself)", [job([step(null)], "prove (test)", null)]],
      ["a job that went on to fail after the cap", [job([step("success"), { name: "up", status: "completed", conclusion: "failure" }], "prove (test)", "failure")]],
      ["a job still in progress past the cap", [{ name: "prove (test)", status: "in_progress", conclusion: null, steps: [step("success")] }]],
    ];
    it.each(counted)("%s is a world", async (_name, jobs) => {
      set(...range(1, 20, made), only(500, jobs));
      expect((await run()).status, _name).toBe(1);
    });
  });

  it("asks GitHub's API, with the job's token, for this workflow's runs created today (UTC) and for each run's jobs, and reads every page", async () => {
    set(...range(1, 130, made));
    const days = [utcDay()];
    const r = await run({ WORLD_CAP: "130" });
    days.push(utcDay());
    expect([r.status, r.said]).toEqual([0, expect.stringContaining("130")]);
    const lists = r.asked.filter((a) => a.path.endsWith("/runs"));
    expect(lists.map((a) => a.query.get("page"))).toEqual(["1", "2"]);
    expect(days.map((d) => `>=${d}`)).toContain(lists[0]!.query.get("created"));
    expect(r.asked.filter((a) => a.path.endsWith("/jobs"))).toHaveLength(130);
    expect(r.asked.every((a) => a.authorization === `Bearer ${SENTINEL}`)).toBe(true);
    expect((await run({ WORLD_CAP: "129" })).status).toBe(1);
  });

  it("asks for the repository and the workflow it is given, and takes the cap from WORLD_CAP", async () => {
    set(...range(1, 3, made));
    expect((await run({ WORLD_CAP: "3" })).status).toBe(0);
    expect((await run({ WORLD_CAP: "2" })).status).toBe(1);
    const r = await run({ GITHUB_REPOSITORY: "other/place", WORKFLOW_FILE: "another.yml" });
    expect(r.asked.map((a) => a.path)).toEqual(["/repos/other/place/actions/workflows/another.yml/runs"]);
  });

  it("never prints the token, whichever way it goes", async () => {
    for (const n of [1, 30]) { set(...range(1, n, made)); expect((await run()).said).not.toContain(SENTINEL); }
    broken = (_p, res) => { res.writeHead(500).end(`boom ${SENTINEL}`); return true; };
    expect((await run()).said).not.toContain(SENTINEL);
  });

  describe("refuses, with exit 2, when it cannot judge: a count it cannot read is not a count of zero", () => {
    const bad: ReadonlyArray<readonly [string, (path: string, res: ServerResponse) => boolean]> = [
      ["a 500 for the runs", (p, res) => p.endsWith("/runs") && (res.writeHead(500).end("{}"), true)],
      ["a 403 for the runs (no `actions: read`)", (p, res) => p.endsWith("/runs") && (res.writeHead(403).end(JSON.stringify({ message: "Resource not accessible by integration" })), true)],
      ["runs that are not JSON", (p, res) => p.endsWith("/runs") && (res.writeHead(200).end("<html>"), true)],
      ["runs with no list", (p, res) => p.endsWith("/runs") && (res.writeHead(200).end(JSON.stringify({ total_count: 2 })), true)],
      ["a run with no id", (p, res) => p.endsWith("/runs") && (res.writeHead(200).end(JSON.stringify({ workflow_runs: [{}] })), true)],
      ["a 500 for a run's jobs", (p, res) => p.endsWith("/jobs") && (res.writeHead(500).end("{}"), true)],
      ["a 404 for a run's jobs", (p, res) => p.endsWith("/jobs") && (res.writeHead(404).end("{}"), true)],
      ["jobs that are not JSON", (p, res) => p.endsWith("/jobs") && (res.writeHead(200).end("<html>"), true)],
      ["jobs with no list", (p, res) => p.endsWith("/jobs") && (res.writeHead(200).end(JSON.stringify({ total_count: 1 })), true)],
      ["a job whose steps are not a list", (p, res) => p.endsWith("/jobs") && (res.writeHead(200).end(JSON.stringify({ jobs: [{ name: "prove (test)", status: "completed", conclusion: "success", steps: "x" }] })), true)],
      ["no answer at all", (_p, res) => { res.destroy(); return true; }],
    ];
    it.each(bad)("%s", async (_name, make) => {
      set(...range(1, 2, made));
      broken = make;
      const r = await run();
      expect(r.status, r.said).toBe(2);
      expect(r.said).not.toContain(SENTINEL);
    });
    it("nothing listening", async () => {
      expect((await run({ GITHUB_API_URL: `http://127.0.0.1:${freePorts("dead").dead}` })).status).toBe(2);
    });
  });

  describe("refuses, with exit 2 and no request, what it was not given right", () => {
    const cases: ReadonlyArray<readonly [string, Record<string, string | undefined>, RegExp]> = [
      ["no token", { GH_TOKEN: undefined }, /GH_TOKEN/],
      ["an empty token", { GH_TOKEN: "" }, /GH_TOKEN/],
      ["no cap", { WORLD_CAP: undefined }, /WORLD_CAP/],
      ...["0", "-1", "20.5", "twenty", "20 runs", "Infinity", "1e2", "0x14", " 20", "20 ", "020", "+20", "٢٠", ""].map((v) => [`a cap of ${JSON.stringify(v)}`, { WORLD_CAP: v }, /WORLD_CAP/] as const),
      ["no repository", { GITHUB_REPOSITORY: undefined }, /GITHUB_REPOSITORY/],
      ["a repository that is not owner/repo", { GITHUB_REPOSITORY: "acme" }, /GITHUB_REPOSITORY/],
      ["a repository that climbs", { GITHUB_REPOSITORY: "acme/../../x" }, /GITHUB_REPOSITORY/],
      ["no workflow file", { WORKFLOW_FILE: undefined }, /WORKFLOW_FILE/],
      ["a workflow file with a slash", { WORKFLOW_FILE: "a/b.yml" }, /WORKFLOW_FILE/],
      ["a workflow file that climbs", { WORKFLOW_FILE: "../x.yml" }, /WORKFLOW_FILE/],
      ["an API address on another host over http", { GITHUB_API_URL: "http://api.github.com" }, /GITHUB_API_URL/],
      ["an API address that is another https host", { GITHUB_API_URL: "https://evil.example" }, /GITHUB_API_URL/],
      ["an API address that only starts like this machine", { GITHUB_API_URL: `http://127.0.0.1.evil.example:${PORTS.api}` }, /GITHUB_API_URL/],
    ];
    it.each(cases)("%s", async (_name, env, names) => {
      set(...range(1, 1, made));
      const r = await run(env);
      expect(r.status, r.said).toBe(2);
      expect(r.said).toMatch(names);
      expect(r.asked).toEqual([]);
      expect(r.said).not.toContain(SENTINEL);
    });
    it("accepts a plain positive decimal integer, and only that", async () => {
      set(...range(1, 1, made));
      for (const ok of ["1", "20", "100", "9"]) expect((await run({ WORLD_CAP: ok })).status, ok).toBe(0);
    });
  });

  it("goes to api.github.com when no address is given, and nowhere else", async () => {
    expect(existsSync(script), "tools/release/world-cap.mjs does not exist").toBe(true);
    const done = await child(["--import", join(repo, "e2e/m1/deny-network.mjs"), script], { GH_TOKEN: SENTINEL, GITHUB_REPOSITORY: "acme/orthograph", WORKFLOW_FILE: "test-worlds.yml", WORLD_CAP: "20" });
    expect([done.status, done.said.trim().split("\n").at(-1)]).toEqual([97, "NETWORK-DENIED api.github.com"]);
    expect(done.said).not.toContain(SENTINEL);
  });
});
