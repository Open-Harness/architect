// The real disk, on a real temporary folder: no mock of any call.
import { mkdtempSync, rmSync, statSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nodeDisk } from "./service.ts";

let dir = "";
beforeAll(() => { dir = mkdtempSync(join(tmpdir(), "ortho-sbx-disk-")); });
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);

describe("disk", () => {
  it("writes a file with its folders, reads it back, and lists the names in order", async () => {
    expect(await run(nodeDisk.write(join(dir, "a/b/c.txt"), "héllo"))).toBe(6);
    expect(await run(nodeDisk.read(join(dir, "a/b/c.txt")))).toBe("héllo");
    await run(nodeDisk.write(join(dir, "a/z.txt"), "z"));
    expect(await run(nodeDisk.names(join(dir, "a")))).toEqual(["b", "z.txt"]);
  });

  it("answers a missing path as a value: no real path, no names, empty text, and removing it is fine", async () => {
    expect(await run(nodeDisk.realpath(join(dir, "nope")))).toBeNull();
    expect(await run(nodeDisk.names(join(dir, "nope")))).toEqual([]);
    expect(await run(nodeDisk.readOrEmpty(join(dir, "nope")))).toBe("");
    await run(nodeDisk.remove(join(dir, "nope")));
    expect(await run(nodeDisk.read(join(dir, "nope")).pipe(Effect.flip))).toMatchObject({ _tag: "DiskFailed", code: "ENOENT" });
  });

  it("follows a symbolic link to the real path, writes with a mode, and removes a folder and what is in it", async () => {
    await run(nodeDisk.makeDir(join(dir, "real")));
    symlinkSync(join(dir, "real"), join(dir, "link"));
    expect(await run(nodeDisk.realpath(join(dir, "link")))).toBe(await run(nodeDisk.realpath(join(dir, "real"))));
    await run(nodeDisk.write(join(dir, "real/run.sh"), "#!/bin/sh\n", 0o755));
    expect(statSync(join(dir, "real/run.sh")).mode & 0o111).not.toBe(0);
    await run(nodeDisk.remove(join(dir, "real")));
    expect(await run(nodeDisk.realpath(join(dir, "real")))).toBeNull();
  });
});
