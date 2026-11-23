// A port free when chosen can be taken before wrangler binds it: the launch starts again on a fresh port, and says so on disk.
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { WorldFailed, type Launched } from "#modules/world/types.js";
import { launchOnFreePort } from "./internal/process.ts";

const dir = mkdtempSync(join(tmpdir(), "ortho-launch-port-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const taken = new WorldFailed({ message: "the world exited (1)", taken: true });
const up = (port: number): Launched => ({ pid: 2, url: `http://127.0.0.1:${port}`, log: "log" });
/** A launch that is refused as taken for the first `refusals` ports it is given, and remembers every port it saw. */
const launcher = (refusals: number, seen: Array<number>) => (port: number) => {
  seen.push(port);
  return seen.length <= refusals ? Effect.fail(taken) : Effect.succeed(up(port));
};

describe("launching on a port that gets taken", () => {
  it("starts again on a fresh port and remembers the one it got", async () => {
    const seen: Array<number> = [];
    const launched = await Effect.runPromise(launchOnFreePort(launcher(2, seen), dir, 41111, false));
    expect(seen).toHaveLength(3);
    expect(new Set(seen).size, "each try on a port of its own").toBe(3);
    expect(launched.url).toBe(`http://127.0.0.1:${seen[2]}`);
    expect(Number(readFileSync(join(dir, "port"), "utf8"))).toBe(seen[2]);
  });

  it("gives up after its tries, and never moves a port the caller named", async () => {
    const forever = await Effect.runPromise(Effect.flip(launchOnFreePort(launcher(99, []), dir, 41111, false)));
    expect(forever.taken).toBe(true);
    const seen: Array<number> = [];
    await Effect.runPromise(Effect.flip(launchOnFreePort(launcher(99, seen), dir, 41111, true)));
    expect(seen).toEqual([41111]);
  });

  it("does not start again for a failure that is not a taken address", async () => {
    const seen: Array<number> = [];
    const other = (port: number) => { seen.push(port); return Effect.fail(new WorldFailed({ message: "no" })); };
    await Effect.runPromise(Effect.flip(launchOnFreePort(other, dir, 41111, false)));
    expect(seen).toEqual([41111]);
  });
});
