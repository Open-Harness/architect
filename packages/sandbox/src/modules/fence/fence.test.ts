// Journey step: "a write outside the sandbox is refused" (a-write-outside-the-sandbox-is-refused), the rule itself, on a real disk.
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nodeDisk } from "../disk/service.ts";
import { Fence } from "./service.ts";

let base = "";
let root = "";
beforeAll(() => {
  base = realpathSync(mkdtempSync(join(tmpdir(), "ortho-sbx-fence-")));
  root = join(base, "sandboxes/sbx_one");
  mkdirSync(root, { recursive: true });
  mkdirSync(join(base, "elsewhere"));
  symlinkSync(join(base, "elsewhere"), join(root, "out"));
});
afterAll(() => rmSync(base, { recursive: true, force: true }));

const check = (target: string) => Effect.runPromise(Effect.gen(function* () { return yield* (yield* Fence.of(nodeDisk, root)).check(target); }).pipe(Effect.result));

describe("fence", () => {
  it("lets a path inside through, existing or not, and resolves a relative one against the root", async () => {
    expect(await check("notes.txt")).toMatchObject({ _tag: "Success", success: join(root, "notes.txt") });
    expect(await check("deep/er/file.txt")).toMatchObject({ _tag: "Success" });
    expect(await check(join(root, "a/../b"))).toMatchObject({ _tag: "Success", success: join(root, "b") });
    expect(await check(".")).toMatchObject({ _tag: "Success", success: root });
  });

  it("refuses .., an absolute path elsewhere, and a sibling folder whose name starts like the root's, by name", async () => {
    for (const target of ["../../outside.txt", join(base, "elsewhere/x"), `${root}-sibling/x`, "/etc/passwd"]) {
      const result = await check(target);
      expect(result, target).toMatchObject({ _tag: "Failure", failure: { _tag: "OutsideSandbox", path: target, root } });
    }
  });

  it("refuses a symbolic link out, even to a file that does not exist yet", async () => {
    expect(await check("out/new.txt")).toMatchObject({ _tag: "Failure", failure: { _tag: "OutsideSandbox", resolved: join(base, "elsewhere/new.txt") } });
  });

  it("compares case-folded, so a differently cased spelling of the root is still inside and of a stranger still outside", async () => {
    expect(await check(join(root.toUpperCase(), "x"))).toMatchObject({ _tag: "Success" });
    expect(await check(join(base, "ELSEWHERE", "x"))).toMatchObject({ _tag: "Failure" });
  });

  it("says what a Pi tool's error result starts with", () => {
    expect(Fence.refusalText({ path: "../../outside.txt", root: "/r", resolved: "/o" } as never)).toBe("OutsideSandbox: ../../outside.txt is outside /r");
  });
});
