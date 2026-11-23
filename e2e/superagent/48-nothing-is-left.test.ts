// Slice 9's done-when, "0 sandbox folders and 0 processes left", as a check of its own (GOAL17-check-harness, call 4): it runs after every check before it
// (vitest runs these files one at a time, in order) and reads the machine, not the bridge's own report: the process table and the disk. A leftover is a
// process of ours (a descendant of this run, or one orphaned to init) whose command line names a folder of these checks, a `pi-env serve` or a bridge;
// or a `sandboxes` folder with anything in it under one of these checks' folders. The Mac is shared: another run's live processes are not ours.
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { registerRoot, registeredRoots } from "./agents-support.ts";

interface Proc { readonly pid: number; readonly ppid: number; readonly command: string }

const table = (): ReadonlyArray<Proc> => execFileSync("ps", ["-A", "-o", "pid=,ppid=,command="], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\n")
  .flatMap((l) => { const m = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(l); return m ? [{ pid: Number(m[1]), ppid: Number(m[2]), command: m[3]! }] : []; });

/** This process and everything under it, now. */
const mine = (all: ReadonlyArray<Proc>): ReadonlySet<number> => {
  const found = new Set<number>([process.pid]);
  for (let grew = true; grew; ) { grew = false; for (const p of all) if (!found.has(p.pid) && found.has(p.ppid)) { found.add(p.pid); grew = true; } }
  return found;
};

/** What `roots` (the folders this run copied the app to) still hold or run: a sandbox folder with anything in it, a process that names one of them, or a `pi-env serve` or bridge under one. */
export const leftovers = (roots: ReadonlyArray<string>) => {
  const all = table();
  const ours = mine(all);
  const folders = (dir: string): ReadonlyArray<string> => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (!e.isDirectory() || e.name === "node_modules") return [];
    const p = join(dir, e.name);
    return e.name === "sandboxes" ? readdirSync(p).map((s) => join(p, s)) : folders(p);
  });
  const named = (c: string) => roots.some((r) => c.includes(r));
  return {
    folders: roots.flatMap((r) => { try { return folders(r); } catch { return []; } }),
    processes: all.filter((p) => p.pid !== process.pid && (ours.has(p.pid) || p.ppid === 1) && (named(p.command) || (/\bpi-env serve\b|sandbox[^ ]*\/stand-in\/(src\/)?main\.ts/.test(p.command) && named(p.command))))
      .map((p) => `${p.pid} ${p.command}`),
  };
};

describe("48: nothing is left", () => {
  it("control: a planted sandbox folder and a planted process under a folder of this run are both found, and another run's are not", async () => {
    const parent = mkdtempSync(join(tmpdir(), "ortho-gate1-"));
    const stranger = mkdtempSync(join(tmpdir(), "ortho-gate1-"));
    mkdirSync(join(parent, "superagent/.ortho/state/sandboxes/sbx_planted"), { recursive: true });
    mkdirSync(join(stranger, "superagent/.ortho/state/sandboxes/sbx_other"), { recursive: true });
    const file = join(tmpdir(), `ortho-s8-roots-control-${process.pid}.txt`);
    registerRoot(join(parent, "superagent"), file);
    const mate = spawn(process.execPath, ["-e", "setTimeout(() => {}, 30000)", join(parent, "superagent/bridge")], { stdio: "ignore" });
    const other = spawn(process.execPath, ["-e", "setTimeout(() => {}, 30000)", join(stranger, "superagent/bridge")], { stdio: "ignore" });
    try {
      await new Promise((r) => setTimeout(r, 300));
      const found = leftovers(registeredRoots(file));
      expect(found.folders).toEqual([join(parent, "superagent/.ortho/state/sandboxes/sbx_planted")]);
      expect(found.processes.some((p) => p.startsWith(`${mate.pid} `))).toBe(true);
      expect(found.processes.some((p) => p.startsWith(`${other.pid} `))).toBe(false);
    } finally { mate.kill("SIGKILL"); other.kill("SIGKILL"); for (const d of [parent, stranger, file]) rmSync(d, { recursive: true, force: true }); }
  });

  it("no sandbox folder and no process of this run is left by the checks before this one", () => {
    expect(leftovers(registeredRoots())).toEqual({ folders: [], processes: [] });
  });
});
