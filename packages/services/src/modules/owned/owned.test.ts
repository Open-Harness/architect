import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Scope, Exit } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Owned } from "./service.ts";

const folder = mkdtempSync(join(tmpdir(), "ortho-owned-"));
const before = process.env["ORTHO_RUN_DIR"];
beforeAll(() => { process.env["ORTHO_RUN_DIR"] = join(folder, "run"); });
afterAll(() => {
  if (before === undefined) delete process.env["ORTHO_RUN_DIR"]; else process.env["ORTHO_RUN_DIR"] = before;
  rmSync(folder, { recursive: true, force: true });
});

const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const sentinel = { binary: process.execPath, args: ["-e", "setInterval(() => {}, 1000)"], log: join(folder, "sentinel.log"), ready: Effect.void, kind: "sentinel" };

describe("a process owned by PID", () => {
  it("runs while its scope is open, leaves a marker, and is gone with its marker when the scope closes", async () => {
    const scope = Effect.runSync(Scope.make());
    const owning = await Effect.runPromise(Owned.start(sentinel).pipe(Scope.provide(scope)));
    expect(alive(owning.pid)).toBe(true);
    expect(readdirSync(join(folder, "run"))).toContain(`sentinel-${owning.pid}.json`);
    expect(Owned.leaks().map((m) => m.pid)).toEqual([owning.pid]);
    await Effect.runPromise(Scope.close(scope, Exit.void));
    expect(alive(owning.pid)).toBe(false);
    expect(existsSync(join(folder, "run", `sentinel-${owning.pid}.json`))).toBe(false);
    expect(Owned.leaks()).toEqual([]);
  });

  it("sweeps a process whose owner never closed its scope, and leaves one that is not what the marker says alone", async () => {
    const scope = Effect.runSync(Scope.make());
    const leaked = await Effect.runPromise(Owned.start(sentinel).pipe(Scope.provide(scope)));
    const stranger = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
    try {
      // A marker for the stranger's PID that names a command it isn't running: a recycled PID.
      const { record } = await import("./internal/markers.ts");
      record({ kind: "sentinel", pid: stranger.pid!, owner: 0, command: "/nowhere/else --serve" });
      const swept = await Effect.runPromise(Owned.sweep());
      expect(swept.map((m) => m.pid)).toEqual([leaked.pid]);
      expect(alive(leaked.pid)).toBe(false);
      expect(alive(stranger.pid!)).toBe(true);
    } finally { stranger.kill(); }
  });

  it("says why a process that exits before it answers never started, and leaves nothing running", async () => {
    const failure = await Effect.runPromise(Effect.scoped(Owned.start({
      ...sentinel, args: ["-e", "console.error('no good'); process.exit(3)"], ready: Effect.fail("not yet"),
    })).pipe(Effect.flip));
    expect(failure).toMatchObject({ _tag: "ProcessFailed" });
    expect(failure.message).toContain("exited before it answered");
    expect(failure.message).toContain("no good");
    expect(Owned.leaks()).toEqual([]);
  });
});
