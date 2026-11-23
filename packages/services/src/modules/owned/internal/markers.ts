// The run folder: one `<kind>-<pid>.json` per process started. The same layout `@orthograph/prove` writes for the Collector.
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Marker } from "../types.ts";

/** `ORTHO_RUN_DIR`, else `<cache>/run`, the cache being `ORTHO_CACHE_DIR`, else `$XDG_CACHE_HOME/orthograph`, else `~/.cache/orthograph`. */
export const runDir = () =>
  process.env["ORTHO_RUN_DIR"] ?? join(process.env["ORTHO_CACHE_DIR"] ?? join(process.env["XDG_CACHE_HOME"] ?? join(homedir(), ".cache"), "orthograph"), "run");

const fileOf = (dir: string, kind: string, pid: number) => join(dir, `${kind}-${pid}.json`);

export const record = (marker: Marker) => {
  mkdirSync(runDir(), { recursive: true });
  writeFileSync(fileOf(runDir(), marker.kind, marker.pid), JSON.stringify(marker));
};

export const forget = (marker: Marker, dir = runDir()) => rmSync(fileOf(dir, marker.kind, marker.pid), { force: true });

/** Whether a process is there. Not being allowed to signal it means it is: someone else's, and alive. */
export const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
};

/** Whether the PID still runs the command it was marked with. */
export const stillTheSame = (marker: Marker) => {
  const ps = spawnSync("ps", ["-ww", "-p", String(marker.pid), "-o", "command="], { encoding: "utf8" });
  const shown = ps.stdout.trim();
  return ps.status === 0 && (shown.startsWith(marker.command) || (marker.title !== undefined && shown === marker.title));
};

export const all = (dir: string): ReadonlyArray<Marker> => {
  const names = (() => { try { return readdirSync(dir); } catch { return []; } })();
  return names.filter((n) => n.endsWith(".json")).flatMap((n) => {
    try { return [JSON.parse(readFileSync(join(dir, n), "utf8")) as Marker]; } catch { return []; }
  });
};
