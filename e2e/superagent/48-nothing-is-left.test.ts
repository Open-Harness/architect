// Slice 9's done-when, "0 sandbox folders and 0 processes left", as a check of its own (GOAL17-check-harness, call 4): it runs after every check before it
// (vitest runs these files one at a time, in order) and reads the machine, not the bridge's own report: the process table and the disk. A leftover is a
// process of ours (a descendant of this run, or one orphaned to init) whose command line names a folder of these checks, a `pi-env serve` or a bridge;
// or a `sandboxes` folder with anything in it under one of these checks' folders. The Mac is shared: another run's live processes are not ours.
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PREFIX = "ortho-gate1-";
/** A folder these checks copy the app to: `<tmp>/ortho-gate1-<random>/superagent` (`copyOf` keeps the example's name). */
const MINE = /ortho-gate1-[^/\s]+\/superagent(\/|\s|$)/;
interface Proc { readonly pid: number; readonly ppid: number; readonly command: string }

const table = (): ReadonlyArray<Proc> => execFileSync("ps", ["-A", "-o", "pid=,ppid=,command="], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\n")
  .flatMap((l) => { const m = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(l); return m ? [{ pid: Number(m[1]), ppid: Number(m[2]), command: m[3]! }] : []; });

/** This process and everything under it, now. */
const mine = (all: ReadonlyArray<Proc>): ReadonlySet<number> => {
  const found = new Set<number>([process.pid]);
  for (let grew = true; grew; ) { grew = false; for (const p of all) if (!found.has(p.pid) && found.has(p.ppid)) { found.add(p.pid); grew = true; } }
  return found;
};

export const leftovers = (root: string = tmpdir()) => {
  const all = table();
  const ours = mine(all);
  const folders = (dir: string): ReadonlyArray<string> => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (!e.isDirectory() || e.name === "node_modules") return [];
    const p = join(dir, e.name);
    return e.name === "sandboxes" ? readdirSync(p).map((s) => join(p, s)) : folders(p);
  });
  return {
    folders: readdirSync(root).filter((e) => e.startsWith(PREFIX)).flatMap((e) => { try { return folders(join(root, e, "superagent")); } catch { return []; } }),
    processes: all.filter((p) => p.pid !== process.pid && (ours.has(p.pid) || p.ppid === 1) && (MINE.test(p.command) || /\bpi-env serve\b/.test(p.command) || /sandbox[^ ]*\/stand-in\/(src\/)?main\.ts/.test(p.command)))
      .map((p) => `${p.pid} ${p.command}`),
  };
};

describe("48: nothing is left", () => {
  it("control: a planted sandbox folder and a planted process under a folder of these checks are both found", async () => {
    const parent = mkdtempSync(join(tmpdir(), PREFIX));
    mkdirSync(join(parent, "superagent/.ortho/state/sandboxes/sbx_planted"), { recursive: true });
    const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 30000)", join(parent, "superagent/bridge")], { stdio: "ignore" });
    try {
      await new Promise((r) => setTimeout(r, 300));
      const found = leftovers();
      expect(found.folders).toContain(join(parent, "superagent/.ortho/state/sandboxes/sbx_planted"));
      expect(found.processes.some((p) => p.startsWith(`${child.pid} `))).toBe(true);
    } finally { child.kill("SIGKILL"); rmSync(parent, { recursive: true, force: true }); }
  });

  it("no sandbox folder and no process is left by the checks before this one", () => {
    expect(leftovers()).toEqual({ folders: [], processes: [] });
  });
});
