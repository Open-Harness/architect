// What a sweep may kill: a recorded process group only while a process in it is still the program that was recorded, since ids are reused.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { localDaemon } from "@earendil-works/pi-env";
import { Effect } from "effect";
import { TimersLive } from "@orthograph/language-effect/device";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nodeDisk } from "../disk/service.ts";
import { Sandboxes } from "./service.ts";

let dir = "";
beforeAll(() => { dir = realpathSync(mkdtempSync(join(tmpdir(), "ortho-sbx-pgids-"))); });
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const make = () => Effect.runPromise(Sandboxes.make({ dir, limit: 1, daemon: localDaemon(), systemPath: process.env["PATH"] ?? "/usr/bin:/bin", disk: nodeDisk, ids: { id: () => "sbx_new", token: () => "t" }, now: () => 0 }).pipe(Effect.provide(TimersLive)));

describe("the sweep's kill list", () => {
  it("kills a recorded group that is still the recorded program, leaves one whose number now belongs to something else, and removes the folders either way", async () => {
    // Two detached processes in groups of their own, as a bridge's exec leaves them.
    const ours = spawn("sleep", ["28"], { detached: true, stdio: "ignore" });
    const reused = spawn("sleep", ["27"], { detached: true, stdio: "ignore" });
    try {
      mkdirSync(join(dir, "shims/sbx_old"), { recursive: true });
      mkdirSync(join(dir, "sandboxes/sbx_old"), { recursive: true });
      // The first line is still `sleep`; the second was recorded as `pnpm`: that number has since been reused by a `sleep`.
      writeFileSync(join(dir, "shims/sbx_old/.pgids"), `${ours.pid} sleep\n${reused.pid} pnpm\n`);
      await make();
      for (let i = 0; i < 50 && alive(ours.pid!); i++) await new Promise((r) => setTimeout(r, 50));
      expect(alive(ours.pid!)).toBe(false);
      expect(alive(reused.pid!)).toBe(true);
      expect([existsDir(join(dir, "sandboxes")), existsDir(join(dir, "shims"))]).toEqual([[], []]);
    } finally {
      for (const p of [ours, reused]) if (p.pid !== undefined) try { process.kill(-p.pid, "SIGKILL"); } catch { /* already gone */ }
    }
  });
});

const existsDir = (path: string): ReadonlyArray<string> => (existsSync(path) ? readdirSync(path) : []);
