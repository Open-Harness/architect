// Owned processes, by PID (K10 section 8, M1.33). A process Orthograph starts leaves a marker `<kind>-<pid>.json` in the run
// folder: who owns it (a process that must outlive it, an environment's, has owner 0) and the command it was started with.
// A marker is a claim, never proof: the process is only ever signalled when `ps` still shows that command for the PID, so a
// recycled PID is left alone. `ORTHO_RUN_DIR` moves the folder: a gate points it at a folder of its own, and what is still
// running there when it ends is a leak.
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cacheRoot } from "./binary.ts";

export interface Marker {
  readonly kind: string;
  readonly pid: number;
  /** The process that owns it and must stop it; 0 when something else (an environment's `down`) does. */
  readonly owner: number;
  readonly command: string;
}

export const runDir = () => process.env["ORTHO_RUN_DIR"] ?? join(cacheRoot(), "run");

const fileOf = (kind: string, pid: number) => join(runDir(), `${kind}-${pid}.json`);

export const record = (marker: Marker) => {
  mkdirSync(runDir(), { recursive: true });
  writeFileSync(fileOf(marker.kind, marker.pid), JSON.stringify(marker));
};

export const forget = (kind: string, pid: number) => rmSync(fileOf(kind, pid), { force: true });

/** The full command line `ps` shows for a PID, or undefined when there is no such process. */
export const commandOf = (pid: number): string | undefined => {
  const ps = spawnSync("ps", ["-ww", "-p", String(pid), "-o", "command="], { encoding: "utf8" });
  return ps.status === 0 && ps.stdout.trim() !== "" ? ps.stdout.trim() : undefined;
};

/** Whether the PID still runs the command it was marked with. */
export const stillTheSame = (marker: Marker) => commandOf(marker.pid)?.startsWith(marker.command) === true;

/** Whether a process is there. Not being allowed to signal it means it is: someone else's, and alive. */
export const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
};

export const markers = (kind: string): ReadonlyArray<Marker> =>
  (() => { try { return readdirSync(runDir()); } catch { return []; } })()
    .filter((name) => name.startsWith(`${kind}-`) && name.endsWith(".json"))
    .flatMap((name) => {
      try { return [JSON.parse(readFileSync(join(runDir(), name), "utf8")) as Marker]; } catch { return []; }
    });
