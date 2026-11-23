// What check 41 (M7.04, `ortho prove --env staging --run <id>`) shares: the address a staging prove must judge, the instruments (a recording proxy in front of a
// world served on this machine, a network guard, a poll for processes a prove starts), and the judge of a run, a pure function so the same code runs on the real run and on
// every planted wrong one. Written by the checks author; a builder never edits it (AGENTS.md, "Journeys and checks come first"). Nothing here touches the cloud.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer, request as httpRequest, type Server } from "node:http";
import { join } from "node:path";
import { cli } from "../layer1/support.ts";
import { prefixOf } from "./staging-plan.ts";
import { callsOf, modelOf, worldProcesses, worldProcessesUnder, type JourneyMap } from "./prove-speed.ts";

/** Plugged In's one-sentence story: the journey the staging workflow runs. */
export const STORY = "a person claims a page and shares it";
export const SUBDOMAIN = "acme-account";

/** Where a staging prove must go: `<prefix>-worker` is check 37's Worker, on the account's `workers.dev` subdomain. Never typed in the project. */
export const hostOf = (app: string, run: string, subdomain: string) => `${prefixOf(app, run)}-worker.${subdomain}.workers.dev`;

const denyNetwork = join(import.meta.dirname, "deny-network.mjs");
export const DENIED = "NETWORK-DENIED";
export interface Ran {
  readonly status: number | null;
  readonly out: string;
  readonly err: string;
  /** Every wrangler, workerd or miniflare process that was not running when prove started, as a poll every 120 ms saw them. */
  readonly worlds: ReadonlySet<string>;
}
/** `ortho prove --env staging <args> --root <root>`, as a user runs it, behind the network guard, with no Cloudflare credential and only the staging variables given. */
export const staged = async (root: string, args: ReadonlyArray<string>, vars: Readonly<Record<string, string>> = {}, command: ReadonlyArray<string> = ["prove", "--env", "staging"]): Promise<Ran> => {
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_OPTIONS: `${process.env["NODE_OPTIONS"] ?? ""} --import ${denyNetwork}`.trim(), ...vars };
  for (const key of Object.keys(env)) if (/^(CLOUDFLARE_|CF_|WRANGLER_)/.test(key) || (key.startsWith("ORTHO_STAGING_") && !(key in vars))) delete env[key];
  const child = spawn(process.execPath, [cli, ...command, ...args, "--root", root], { cwd: root, env });
  let out = "", err = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { err += d; });
  const before = new Set(worldProcesses(root).map((l) => l.split(/\s+/)[0]));
  const worlds = new Set<string>();
  let open = true;
  const closed = new Promise<number | null>((resolve) => child.once("close", (code) => { open = false; resolve(code); }));
  const timer = setTimeout(() => child.kill("SIGKILL"), 240_000);
  while (open) {
    for (const line of [...worldProcesses(root), ...(child.pid === undefined ? [] : worldProcessesUnder(child.pid))]) if (!before.has(line.split(/\s+/)[0])) worlds.add(line);
    await new Promise((r) => setTimeout(r, 120));
  }
  clearTimeout(timer);
  return { status: await closed, out, err, worlds };
};

// ---- the instruments ----

/** A loopback proxy that writes down every request (method and path, no query) and passes it on to `target`, or answers 404 to everything when it has none (what a Worker that was never deployed says). */
export interface Recorder { readonly url: string; readonly heard: () => ReadonlyArray<string>; readonly close: () => Promise<void> }
export const recorder = async (port: number, target?: string): Promise<Recorder> => {
  const heard: string[] = [];
  const server: Server = createServer((req, res) => {
    heard.push(`${req.method} ${(req.url ?? "").split("?")[0]}`);
    if (target === undefined) { res.writeHead(404, { "content-type": "text/plain" }).end("not found"); return; }
    const upstream = httpRequest(new URL(req.url ?? "/", target), { method: req.method, headers: { ...req.headers, host: new URL(target).host } }, (back) => {
      res.writeHead(back.statusCode ?? 502, back.headers);
      back.pipe(res);
    });
    upstream.on("error", () => res.writeHead(502).end());
    req.pipe(upstream);
  });
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  return { url: `http://127.0.0.1:${port}`, heard: () => heard, close: () => new Promise((resolve) => { server.closeAllConnections(); server.close(() => resolve()); }) };
};

/** `ortho dev`, started as a user does, ready once the world answers; stopped by its pid. */
export const startDev = async (root: string, port: number): Promise<{ readonly child: ChildProcess; readonly url: string }> => {
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
export const stopDev = async (child: ChildProcess) => {
  if (child.exitCode !== null) return;
  const exited = new Promise<void>((r) => child.once("exit", () => r()));
  child.kill("SIGTERM");
  await Promise.race([exited, new Promise((r) => setTimeout(r, 30_000))]);
  if (child.exitCode === null) child.kill("SIGKILL");
};

/** The same guard on a bare Node script: a connection to `host` ends it with `NETWORK-DENIED host`; a loopback one does not. */
export const guarded = (host: string) => spawnSync(process.execPath, ["--import", denyNetwork, "-e", `fetch("http://${host}/").then(() => process.exit(0), () => process.exit(3))`], { encoding: "utf8", timeout: 20_000 });

// ---- the judge of a good run ----

export const routeOf = (operation: string) => `/${operation.replace(".", "/")}`;
/** What the story is, from the model: its steps by title, the routes it must reach, and the routes of every other journey's operations it must not. */
export const storyOf = (root: string) => {
  const map: JourneyMap = modelOf(root);
  const journey = Object.values(map.journeys).find((j) => j.name === STORY)!;
  const own = new Set(callsOf(map, STORY));
  return {
    steps: journey.steps.map((s) => s.title),
    reach: [...own].map(routeOf),
    others: Object.keys(map.operations).filter((o) => !own.has(o)).map(routeOf),
    names: Object.values(map.journeys).map((j) => j.name),
  };
};
export interface Story { readonly steps: ReadonlyArray<string>; readonly reach: ReadonlyArray<string>; readonly others: ReadonlyArray<string> }
const record = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const parse = (text: string): unknown => { try { return JSON.parse(text); } catch { return undefined; } };
/** A report as a run decides it: everything but the seconds and milliseconds a run happens to take. */
const timeless = (x: unknown): unknown => Array.isArray(x) ? x.map(timeless) : record(x) ? Object.fromEntries(Object.entries(x).filter(([k]) => k !== "seconds" && k !== "ms").map(([k, v]) => [k, timeless(v)])) : x;
const shape = (r: unknown) => JSON.stringify(timeless(r));
const escaped = (route: string) => route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Everything wrong with a staging prove of the story against a good world: an empty list is a pass. `reportFile` is what `--report` wrote, `heard` what the proxy in front of the world was asked. */
export const problems = (ran: Ran, story: Story, reportFile: string | undefined, heard: ReadonlyArray<string>): ReadonlyArray<string> => {
  const out: string[] = [];
  if (ran.status !== 0) out.push(`exit ${ran.status}, expected 0: ${(ran.err.trim() || ran.out.trim()).slice(0, 160)}`);
  if (/network-denied/i.test(ran.err)) out.push(`it reached for a host that is not this machine: ${ran.err.trim().slice(0, 100)}`);
  if (ran.worlds.size > 0) out.push(`it started a world of its own: ${[...ran.worlds][0]}`);
  const json = parse(ran.out);
  if (!record(json)) out.push(`stdout is not one JSON document: ${ran.out.trim().slice(0, 100)}`);
  else {
    if (json["schemaVersion"] !== 1) out.push(`schemaVersion is ${JSON.stringify(json["schemaVersion"])}, expected 1`);
    if (json["passed"] !== true) out.push(`passed is ${JSON.stringify(json["passed"])}, expected true`);
    const journeys = json["journeys"];
    if (!Array.isArray(journeys)) out.push(`journeys is ${JSON.stringify(journeys)?.slice(0, 60)}, expected a list`);
    else {
      if (journeys.length !== 1) out.push(`${journeys.length} journeys judged, expected exactly the story`);
      const j = journeys[0] as Record<string, unknown> | undefined;
      if (!record(j) || j["name"] !== STORY) out.push(`the journey judged is ${JSON.stringify(record(j) ? j["name"] : j)}, expected ${JSON.stringify(STORY)}`);
      else {
        if (j["stopped"] !== undefined) out.push(`the story stopped: ${JSON.stringify(j["stopped"])}`);
        if (!Array.isArray(j["skipped"]) || j["skipped"].length > 0) out.push(`the story skipped ${JSON.stringify(j["skipped"])}, expected a list with nothing in it`);
        if (j["verdict"] !== "pass") out.push(`the story's verdict is ${JSON.stringify(j["verdict"])}`);
        const steps = Array.isArray(j["steps"]) ? (j["steps"] as ReadonlyArray<unknown>) : undefined;
        if (steps === undefined) out.push(`the story has steps ${JSON.stringify(j["steps"])?.slice(0, 60)}, expected a list`);
        else {
          const names = steps.map((s) => (record(s) ? s["name"] : s));
          if (JSON.stringify(names) !== JSON.stringify(story.steps)) out.push(`the steps judged are ${JSON.stringify(names)}, expected ${JSON.stringify(story.steps)}`);
          for (const s of steps) if (!record(s) || s["verdict"] !== "pass" || !Array.isArray(s["failures"]) || s["failures"].length > 0) out.push(`step ${JSON.stringify(record(s) ? s["name"] : s)} did not pass: ${JSON.stringify(s)?.slice(0, 120)}`);
        }
      }
    }
    const totals = json["totals"];
    if (!record(totals) || totals["journeys"] !== 1 || totals["journeysPassed"] !== 1 || totals["failing"] !== 0 || totals["steps"] !== story.steps.length || totals["stepsPassed"] !== story.steps.length || totals["evalsFailed"] !== 0) out.push(`totals are ${JSON.stringify(totals)}, expected 1 journey passed, ${story.steps.length} steps all passed, no evals judged, nothing failing`);
    if (reportFile === undefined) out.push("--report wrote no file");
    else if (shape(parse(reportFile)) !== shape(json)) out.push("the --report file is not the --json document");
  }
  const posts = heard.filter((h) => h.startsWith("POST ")).map((h) => h.slice(5));
  for (const route of story.reach) if (!posts.includes(route)) out.push(`the world was never asked ${route}: the story was not judged against it`);
  for (const route of story.others) if (heard.some((h) => new RegExp(`${escaped(route)}(/|$)`).test(h))) out.push(`the world was asked ${route}, which the story never calls: --only was ignored`);
  return out;
};
export const readIf = (file: string) => (existsSync(file) ? readFileSync(file, "utf8") : undefined);
