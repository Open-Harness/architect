// Two kinds of server a check talks to: a probe it writes itself, which records every request and answers what the
// spec says (so a client is judged on what it sent and what it did with the answer), and the adapter's own stand-in,
// started as the process the plugin's package.json names and stopped by its id.
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer, type IncomingMessage } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect } from "vitest";
import type { Json } from "./spec.ts";
import { manifest } from "./plugin.ts";

export interface Seen {
  readonly method: string;
  readonly path: string;
  readonly query: Readonly<Record<string, string>>;
  readonly headers: Readonly<Record<string, string | undefined>>;
  readonly raw: string;
  /** The body as a flat record, whether it was sent as JSON or as a form; `undefined` for none. */
  readonly body: Readonly<Record<string, unknown>> | undefined;
}
export interface Answer { readonly status: number; readonly body: Json | string; readonly type?: string }

const readBody = (req: IncomingMessage) => new Promise<string>((done) => { const chunks: Array<Buffer> = []; req.on("data", (c: Buffer) => chunks.push(c)); req.on("end", () => done(Buffer.concat(chunks).toString("utf8"))); });
const parse = (raw: string, type: string | undefined): Seen["body"] => {
  if (raw === "") return undefined;
  if (type?.includes("application/json")) return JSON.parse(raw) as Record<string, unknown>;
  if (type?.includes("application/x-www-form-urlencoded")) return Object.fromEntries(new URLSearchParams(raw));
  return { "?": raw };
};

export const probe = async (answer: (seen: Seen, count: number) => Answer) => {
  const seen: Array<Seen> = [];
  const server = createServer((req, res) => {
    void readBody(req).then((raw) => {
      const url = new URL(req.url ?? "/", "http://probe");
      const one: Seen = { method: (req.method ?? "").toLowerCase(), path: url.pathname, query: Object.fromEntries(url.searchParams), headers: Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : v])), raw, body: parse(raw, req.headers["content-type"]) };
      seen.push(one);
      const a = answer(one, seen.length);
      res.writeHead(a.status, { "content-type": a.type ?? "application/json" });
      res.end(typeof a.body === "string" ? a.body : JSON.stringify(a.body));
    });
  });
  await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
  const port = (server.address() as { port: number }).port;
  return { url: `http://127.0.0.1:${port}`, seen, close: () => new Promise<void>((done) => { server.closeAllConnections(); server.close(() => done()); }) };
};

/** Every process under `pid` now, children and theirs, by `ps`. */
const descendants = (pid: number): ReadonlyArray<number> => {
  const rows = execFileSync("ps", ["-A", "-o", "pid=,ppid="], { encoding: "utf8" }).trim().split("\n").map((l) => l.trim().split(/\s+/).map(Number) as [number, number]);
  const found: Array<number> = [];
  for (let level = [pid]; level.length > 0; ) {
    level = rows.filter(([, parent]) => level.includes(parent)).map(([id]) => id);
    found.push(...level);
  }
  return found;
};
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };

export interface Running { readonly url: string; readonly pid: number; readonly dir: string; readonly stop: () => Promise<void> }

/** The plugin's stand-in: `node <orthograph.standIn> --port 0 --dir <state>`, its address read from its first line. */
export const startStandIn = async (plugin: string): Promise<Running> => {
  const entry = manifest(plugin)["orthograph"]?.["standIn"];
  expect(typeof entry, `${plugin}/package.json: orthograph.standIn names the stand-in's entry file`).toBe("string");
  const dir = mkdtempSync(join(tmpdir(), "ortho-standin-"));
  const child = spawn(process.execPath, [join(plugin, entry as string), "--port", "0", "--dir", dir], { cwd: plugin, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  child.stderr.on("data", (c: Buffer) => { out += c.toString(); });
  const exited = new Promise<number | null>((done) => child.on("exit", (code) => done(code)));
  const url = await new Promise<string>((found, fail) => {
    const timer = setTimeout(() => { child.kill("SIGKILL"); fail(new Error(`no "stand-in listening on <url>" line in 60 s:\n${out}`)); }, 60_000);
    child.stdout.on("data", (c: Buffer) => { out += c.toString(); const m = /^stand-in listening on (http:\/\/127\.0\.0\.1:\d+)$/m.exec(out); if (m) { clearTimeout(timer); found(m[1]!); } });
    void exited.then((code) => { clearTimeout(timer); fail(new Error(`the stand-in exited ${String(code)} before it listened:\n${out}`)); });
  });
  return {
    url, pid: child.pid!, dir,
    stop: async () => {
      const family = descendants(child.pid!);
      child.kill("SIGTERM");
      const killer = setTimeout(() => child.kill("SIGKILL"), 10_000);
      await exited;
      clearTimeout(killer);
      await new Promise((r) => setTimeout(r, 500));
      const left = family.filter(alive);
      for (const pid of left) process.kill(pid, "SIGKILL");
      rmSync(dir, { recursive: true, force: true });
      expect(left, `the stand-in left processes running after SIGTERM (their ids, now killed)`).toEqual([]);
    },
  };
};
