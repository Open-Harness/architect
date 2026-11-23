// Journey step: "a blocked command fails by name" (a-blocked-command-fails-by-name): the first-word rule, and the shims run by a real shell.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nodeDisk } from "../disk/service.ts";
import { Commands } from "./service.ts";

let base = "";
let shims = "";
beforeAll(async () => {
  base = mkdtempSync(join(tmpdir(), "ortho-sbx-commands-"));
  shims = join(base, "shims");
  await Effect.runPromise(Commands.install(nodeDisk, shims, ["sudo", "ssh"]));
});
afterAll(() => rmSync(base, { recursive: true, force: true }));

const sh = (command: string) => spawnSync("/bin/sh", ["-c", command], { env: { PATH: `${shims}:/usr/bin:/bin` }, encoding: "utf8" });
const hits = () => Effect.runPromise(nodeDisk.readOrEmpty(Commands.hitsFile(shims)).pipe(Effect.map(Commands.hitsFrom)));

describe("commands", () => {
  it("judges an argv by its first word only: a program that merely names sudo is not blocked", () => {
    expect(Commands.firstBlocked(["sudo", "ls"], ["sudo"])).toBe("sudo");
    expect(Commands.firstBlocked(["/usr/bin/sudo", "ls"], ["sudo"])).toBe("sudo");
    expect(Commands.firstBlocked(["echo", "sudo"], ["sudo"])).toBeUndefined();
    expect(Commands.firstBlocked([], ["sudo"])).toBeUndefined();
  });

  it("refuses a blocked name that is a path, has an argument or is empty", async () => {
    for (const name of ["/usr/bin/sudo", "sudo -n", "", "a b", "../x"]) {
      const result = await Effect.runPromise(Effect.result(Commands.install(nodeDisk, join(base, "bad"), [name])));
      expect(result, name).toMatchObject({ _tag: "Failure", failure: { _tag: "InvalidBlocked", program: name } });
    }
  });

  it("a real shell that runs a blocked name finds its shim: it prints the name, exits 126 and logs the hit", async () => {
    const ran = sh("sudo ls");
    expect(ran.status).toBe(126);
    expect(ran.stderr).toBe("BlockedCommand: sudo\n");
    expect(await hits()).toEqual(["sudo"]);
  });

  it("a shell string that names sudo as an argument runs, and one that runs it halfway through is caught", async () => {
    expect(sh("echo sudo").status).toBe(0);
    expect(sh("echo sudo").stdout).toBe("sudo\n");
    const middle = sh("echo before; ssh host; echo after");
    expect(middle.stdout).toBe("before\nafter\n");
    expect(middle.stderr).toBe("BlockedCommand: ssh\n");
    expect(await hits()).toEqual(["sudo", "ssh"]);
  });
});
