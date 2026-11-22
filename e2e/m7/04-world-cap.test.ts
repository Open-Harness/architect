// Check 04 (M7.05; credential 4 of `design/decisions/M7-release.md`: "at most 20 worlds a day, each destroyed"): the cap the workflow's `cap` step runs, before any world is made.
// `node tools/release/world-cap.mjs` (Goal 15 owns `tools/release/`) counts the runs of this workflow created today (UTC) and refuses when there are more than `WORLD_CAP`. A pull request's run is already counted when
// the step runs, so a day's 20th run goes and its 21st does not. It refuses rather than half-run: a count it cannot read, a cap that is not a whole number above zero, and an API address that is not GitHub's are each a
// refusal (exit 2) that makes no request, and the token it asks with is never printed.
// THE SURFACE. Environment: GH_TOKEN (the job's `github.token`, `actions: read`), GITHUB_API_URL (the runner sets it; here it is `https://api.github.com` or an `http://` address on this machine, and anything else is refused,
// so a stray variable cannot send the token somewhere else), GITHUB_REPOSITORY (`owner/repo`), WORKFLOW_FILE (a file name, no slash) and WORLD_CAP. Request: `GET <api>/repos/<repo>/actions/workflows/<file>/runs?created=>=<today, YYYY-MM-DD, UTC>`
// with `Authorization: Bearer <token>`; the answer's `total_count` is the count. Exit 0: the count is within the cap, and one line says the count and the cap. Exit 1: past it, a line starting `::error::` naming both numbers.
// Exit 2: nothing could be judged. Nothing is installed or imported from outside the repository (a plain `node` script).
// HOW IT IS JUDGED. A real HTTP server on this machine stands in for GitHub's API and writes down every request; the real script is run against it. The default address is checked with `deny-network.mjs` (a connection
// to any host that is not this machine ends the process, naming it): it must be `api.github.com`. NOT JUDGED HERE: GitHub's own answer for the filter (`created=>=` is GitHub's documented syntax; the first real run is the proof).
// Red today on one reason: the script does not exist.
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
const heard: Array<{ path: string; query: URLSearchParams; authorization: string | undefined }> = [];
let answer: (res: ServerResponse) => void = (res) => res.writeHead(200).end(JSON.stringify({ total_count: 1 }));
let server: Server;
beforeAll(async () => {
  server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", base);
    heard.push({ path: url.pathname, query: url.searchParams, authorization: req.headers.authorization });
    answer(res);
  });
  await new Promise<void>((ok) => server.listen(PORTS.api, "127.0.0.1", ok));
});
afterAll(() => new Promise<void>((ok) => { server.closeAllConnections(); server.close(() => ok()); }));

const counted = (n: unknown) => { answer = (res) => res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ total_count: n })); };
const BASE_ENV = { GH_TOKEN: SENTINEL, GITHUB_API_URL: base, GITHUB_REPOSITORY: "acme/orthograph", WORKFLOW_FILE: "test-worlds.yml", WORLD_CAP: "20" };
/** The script as a child of this process, run asynchronously: the stand-in server is in this process too, so a blocking spawn would never be answered. */
const child = (args: ReadonlyArray<string>, env: Record<string, string>) => new Promise<{ status: number | null; said: string }>((done) => {
  const p = spawn(process.execPath, [...args], { env: { PATH: process.env["PATH"] ?? "", ...env }, stdio: ["ignore", "pipe", "pipe"] });
  let said = "";
  p.stdout.setEncoding("utf8").on("data", (c: string) => { said += c; });
  p.stderr.setEncoding("utf8").on("data", (c: string) => { said += c; });
  const timer = setTimeout(() => p.kill("SIGKILL"), 30_000);
  p.on("close", (status) => { clearTimeout(timer); done({ status, said }); });
});
const run = async (env: Record<string, string | undefined> = {}) => {
  expect(existsSync(script), "tools/release/world-cap.mjs does not exist").toBe(true);
  const before = heard.length;
  const merged = { ...BASE_ENV, ...env };
  const done = await child([script], Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== undefined)) as Record<string, string>);
  return { ...done, asked: heard.slice(before) };
};
const utcDay = () => new Date().toISOString().slice(0, 10);

describe("04: the day's cap on test worlds (M7.05)", () => {
  it("passes up to the cap, and says the count and the cap", async () => {
    for (const n of [0, 1, 19, 20]) {
      counted(n);
      const r = await run();
      expect([n, r.status], r.said).toEqual([n, 0]);
      expect(r.said).toContain(String(n));
      expect(r.said).toContain("20");
    }
  });

  it("refuses past the cap with an ::error:: naming both numbers", async () => {
    for (const n of [21, 22, 500]) {
      counted(n);
      const r = await run();
      expect([n, r.status], r.said).toEqual([n, 1]);
      expect(r.said).toMatch(/::error::/);
      expect(r.said).toContain(String(n));
      expect(r.said).toContain("20");
    }
  });

  it("takes the cap from WORLD_CAP, not from a number of its own", async () => {
    counted(3);
    expect((await run({ WORLD_CAP: "3" })).status).toBe(0);
    expect((await run({ WORLD_CAP: "2" })).status).toBe(1);
    counted(21);
    expect((await run({ WORLD_CAP: "25" })).status).toBe(0);
  });

  it("asks GitHub's API for this workflow's runs created today (UTC), with the job's token, once", async () => {
    counted(1);
    const days = [utcDay()];
    const r = await run();
    days.push(utcDay());
    expect(r.asked).toHaveLength(1);
    const [req] = r.asked;
    expect(req!.path).toBe("/repos/acme/orthograph/actions/workflows/test-worlds.yml/runs");
    expect(days.map((d) => `>=${d}`)).toContain(req!.query.get("created"));
    expect(req!.authorization).toBe(`Bearer ${SENTINEL}`);
  });

  it("asks for the repository and the workflow it is given", async () => {
    counted(1);
    const r = await run({ GITHUB_REPOSITORY: "other/place", WORKFLOW_FILE: "another.yml" });
    expect(r.asked.map((a) => a.path)).toEqual(["/repos/other/place/actions/workflows/another.yml/runs"]);
  });

  it("never prints the token, whichever way it goes", async () => {
    for (const [n, status] of [[1, 0], [99, 1]] as const) {
      counted(n);
      const r = await run();
      expect(r.status).toBe(status);
      expect(r.said).not.toContain(SENTINEL);
    }
    answer = (res) => res.writeHead(500).end(`boom ${SENTINEL}`);
    expect((await run()).said).not.toContain(SENTINEL);
  });

  describe("refuses, with exit 2, when it cannot judge: a count it cannot read is not a count of zero", () => {
    const unreadable: ReadonlyArray<readonly [string, (res: ServerResponse) => void]> = [
      ["a 500", (res) => res.writeHead(500).end("{}")],
      ["a 403 (no `actions: read`)", (res) => res.writeHead(403).end(JSON.stringify({ message: "Resource not accessible by integration" }))],
      ["a 404", (res) => res.writeHead(404).end("{}")],
      ["a body that is not JSON", (res) => res.writeHead(200).end("<html>")],
      ["a body with no total_count", (res) => res.writeHead(200).end(JSON.stringify({ workflow_runs: [] }))],
      ["total_count as a string", (res) => res.writeHead(200).end(JSON.stringify({ total_count: "3" }))],
      ["total_count null", (res) => res.writeHead(200).end(JSON.stringify({ total_count: null }))],
      ["a negative total_count", (res) => res.writeHead(200).end(JSON.stringify({ total_count: -1 }))],
      ["a fractional total_count", (res) => res.writeHead(200).end(JSON.stringify({ total_count: 1.5 }))],
      ["a list for the body", (res) => res.writeHead(200).end("[]")],
      ["no answer at all", (res) => res.destroy()],
    ];
    it.each(unreadable)("%s", async (_name, make) => {
      answer = make;
      const r = await run();
      expect(r.status, r.said).toBe(2);
      expect(r.said).not.toContain(SENTINEL);
    });
    it("nothing listening", async () => {
      expect((await run({ GITHUB_API_URL: `http://127.0.0.1:${freePorts("dead").dead}` })).status).toBe(2);
    });
  });

  describe("refuses, with exit 2 and no request, what it was not given right", () => {
    const bad: ReadonlyArray<readonly [string, Record<string, string | undefined>, RegExp]> = [
      ["no token", { GH_TOKEN: undefined }, /GH_TOKEN/],
      ["an empty token", { GH_TOKEN: "" }, /GH_TOKEN/],
      ["no cap", { WORLD_CAP: undefined }, /WORLD_CAP/],
      ["a cap of zero", { WORLD_CAP: "0" }, /WORLD_CAP/],
      ["a negative cap", { WORLD_CAP: "-1" }, /WORLD_CAP/],
      ["a fractional cap", { WORLD_CAP: "20.5" }, /WORLD_CAP/],
      ["a cap that is not a number", { WORLD_CAP: "twenty" }, /WORLD_CAP/],
      ["a cap with trailing text", { WORLD_CAP: "20 runs" }, /WORLD_CAP/],
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
    it.each(bad)("%s", async (_name, env, names) => {
      counted(1);
      const r = await run(env);
      expect(r.status, r.said).toBe(2);
      expect(r.said).toMatch(names);
      expect(r.asked).toEqual([]);
      expect(r.said).not.toContain(SENTINEL);
    });
  });

  it("goes to api.github.com when no address is given, and nowhere else", async () => {
    const guard = join(repo, "e2e/m1/deny-network.mjs");
    expect(existsSync(script), "tools/release/world-cap.mjs does not exist").toBe(true);
    const done = await child(["--import", guard, script], { GH_TOKEN: SENTINEL, GITHUB_REPOSITORY: "acme/orthograph", WORKFLOW_FILE: "test-worlds.yml", WORLD_CAP: "20" });
    expect([done.status, done.said.trim().split("\n").at(-1)]).toEqual([97, "NETWORK-DENIED api.github.com"]);
    expect(done.said).not.toContain(SENTINEL);
  });
});
