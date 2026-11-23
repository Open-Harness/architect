// The bridge's core on real folders, the real pi-env daemon, real shells and real processes. Each test names the journey step it stands for
// (e2e/superagent/agent-journeys/): the harness surface that loads them is the other builder's, so these prove the behaviour until it lands.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { localDaemon } from "@earendil-works/pi-env";
import { Effect, Fiber } from "effect";
import { TimersLive } from "@orthograph/language-effect/device";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nodeDisk } from "../disk/service.ts";
import { Sandboxes } from "./service.ts";
import type { OpenInput, SandboxesApi } from "./types.ts";

const CANARY = "ortho-canary-bridge-secret";
let dir = "";
let api: SandboxesApi;
let clock = 1_000_000;
let count = 0;

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const result = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.result(effect));
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const open = (tag = "ticket/one", extra: Partial<OpenInput> = {}) =>
  run(api.open({ owner: "coder", tag, variables: [{ name: "REGION", value: "eu-west", from: "settings" }, { name: "GITHUB_NUMBER", value: "12", from: "source" }], blocked: ["sudo"], ...extra }));

beforeAll(async () => {
  process.env["ORTHO_BRIDGE_CANARY"] = CANARY;
  dir = realpathSync(mkdtempSync(join(tmpdir(), "ortho-sbx-core-")));
  mkdirSync(join(dir, "sandboxes/sbx_planted"), { recursive: true });
  api = await Effect.runPromise(Sandboxes.make({
    dir, limit: 3, daemon: localDaemon(), systemPath: process.env["PATH"] ?? "/usr/bin:/bin", disk: nodeDisk,
    ids: { id: () => `sbx_${++count}`, token: () => `tok${count}` }, now: () => clock,
  }).pipe(Effect.provide(TimersLive)));
});
afterAll(async () => {
  delete process.env["ORTHO_BRIDGE_CANARY"];
  await run(api.sweep);
  rmSync(dir, { recursive: true, force: true });
});

describe("open", () => {
  it("sweeps a crashed bridge's folder at start, then makes the sandbox's folder under <dir>/sandboxes and nothing else there", async () => {
    expect(existsSync(join(dir, "sandboxes/sbx_planted"))).toBe(false);
    const one = await open();
    expect(one.root).toBe(join(dir, "sandboxes", one.sandbox));
    expect(readdirSync(join(dir, "sandboxes"))).toEqual([one.sandbox]);
    expect(one.address).toMatch(/^tcp:\/\/127\.0\.0\.1:\d+#tok\d+$/);
  });

  it("is by (owner, tag): a retry finds the same sandbox, another tag makes another, and the limit is SandboxLimit", async () => {
    const [a, b] = [await open(), await open()];
    expect(b).toEqual(a);
    const two = await open("ticket/two");
    expect(two.sandbox).not.toBe(a.sandbox);
    await open("ticket/three");
    expect(await result(api.open({ owner: "coder", tag: "ticket/four", variables: [], blocked: [] }))).toMatchObject({ _tag: "Failure", failure: { _tag: "SandboxLimit", open: 3 } });
    for (const l of await run(api.list({}))) await run(api.close(l.sandbox));
    expect(await run(api.list({}))).toEqual([]);
  });

  it("refuses a credential-like variable, a bad blocked name and a bad variable name, and leaves no folder behind", async () => {
    const before = readdirSync(join(dir, "sandboxes")).length;
    const tries: ReadonlyArray<readonly [Partial<OpenInput>, string]> = [
      [{ variables: [{ name: "GH_TOKEN", value: "x" }] }, "CredentialLikeVariable"],
      [{ variables: [{ name: "lower", value: "x" }] }, "BadVariableName"],
      [{ blocked: ["/usr/bin/sudo"] }, "InvalidBlocked"],
    ];
    for (const [input, tag] of tries) expect(await result(api.open({ owner: "coder", tag: "x", variables: [], blocked: [], ...input })), tag).toMatchObject({ _tag: "Failure", failure: { _tag: tag } });
    expect(readdirSync(join(dir, "sandboxes")).length).toBe(before);
    expect(existsSync(join(dir, "shims")) ? readdirSync(join(dir, "shims")).length : 0).toBe(0);
  });
});

describe("a write outside the sandbox is refused", () => {
  it("writes inside, refuses ../../outside.txt as OutsideSandbox with the path and the root, and writes nothing there", async () => {
    const { sandbox, root } = await open("ticket/write");
    expect(await run(api.write({ sandbox, path: "notes.txt", content: "ok" }))).toEqual({ bytes: 2 });
    expect(readFileSync(join(root, "notes.txt"), "utf8")).toBe("ok");
    expect(await run(api.read({ sandbox, path: "notes.txt" }))).toEqual({ content: "ok" });
    const refused = await result(api.write({ sandbox, path: "../../outside.txt", content: "x" }));
    expect(refused).toMatchObject({ _tag: "Failure", failure: { _tag: "OutsideSandbox", path: "../../outside.txt", root } });
    expect(existsSync(join(dir, "outside.txt"))).toBe(false);
    expect(await result(api.read({ sandbox, path: "/etc/passwd" }))).toMatchObject({ failure: { _tag: "OutsideSandbox" } });
    expect(await result(api.exec({ sandbox, command: ["pwd"], cwd: ".." }))).toMatchObject({ failure: { _tag: "OutsideSandbox" } });
    const [seen] = await run(api.seen({ sandbox }));
    expect(seen?.refusals.map((r) => r.name)).toEqual(["OutsideSandbox", "OutsideSandbox", "OutsideSandbox"]);
    expect(seen?.refusals[0]?.detail).toBe(`OutsideSandbox: ../../outside.txt is outside ${root}`);
    await run(api.close(sandbox));
  });
});

describe("a blocked command fails by name", () => {
  it("runs echo, runs a command that merely names sudo, and fails sudo as BlockedCommand with exit 126 in the record", async () => {
    const { sandbox } = await open("ticket/blocked");
    expect(await run(api.exec({ sandbox, command: ["echo", "fine"] }))).toEqual({ exit: 0, stdout: "fine\n", stderr: "" });
    expect(await run(api.exec({ sandbox, command: ["echo", "sudo"] }))).toMatchObject({ exit: 0, stdout: "sudo\n" });
    expect(await result(api.exec({ sandbox, command: ["sudo", "ls"] }))).toMatchObject({ _tag: "Failure", failure: { _tag: "BlockedCommand", command: "sudo" } });
    const [seen] = await run(api.seen({ sandbox }));
    expect(seen?.execs.map((e) => [e.command[0], e.command[1], e.exit])).toEqual([["echo", "fine", 0], ["echo", "sudo", 0], ["sudo", "ls", 126]]);
    expect(seen?.refusals).toEqual([{ name: "BlockedCommand", detail: "BlockedCommand: sudo" }]);
    await run(api.close(sandbox));
  });

  it("catches a blocked name run by a shell: failed when the shim ends the command, recorded when the command went on", async () => {
    const { sandbox } = await open("ticket/shell");
    expect(await result(api.exec({ sandbox, command: ["sh", "-c", "sudo ls"] }))).toMatchObject({ failure: { _tag: "BlockedCommand", command: "sudo" } });
    const went = await run(api.exec({ sandbox, command: ["sh", "-c", "sudo ls; echo after"] }));
    expect(went).toMatchObject({ exit: 0, stdout: "after\n", stderr: "BlockedCommand: sudo\n" });
    const [seen] = await run(api.seen({ sandbox }));
    expect(seen?.refusals.map((r) => r.detail)).toEqual(["BlockedCommand: sudo", "BlockedCommand: sudo"]);
    await run(api.close(sandbox));
  });

  it("answers a program that is not there as exit 127, as a shell does", async () => {
    const { sandbox } = await open("ticket/missing");
    expect(await run(api.exec({ sandbox, command: ["no-such-program-here"] }))).toMatchObject({ exit: 127, stderr: expect.stringContaining("command not found") });
    await run(api.close(sandbox));
  });
});

describe("no credential among the execution variables", () => {
  it("runs a process with exactly the variables the sandbox has, and none of the bridge's own", async () => {
    const { sandbox, root } = await open("ticket/env");
    const ran = await run(api.exec({ sandbox, command: ["env"] }));
    const names = ran.stdout.split("\n").filter((l) => l !== "").map((l) => l.split("=")[0]).sort();
    expect(names).toEqual(["GITHUB_NUMBER", "HOME", "LANG", "PATH", "PWD", "REGION", "SUPERAGENT_BLOCKED_COMMANDS", "SUPERAGENT_DIR", "SUPERAGENT_NAME", "SUPERAGENT_TICKET", "TMPDIR", "_"].filter((n) => names.includes(n)));
    expect(ran.stdout).not.toContain(CANARY);
    expect(ran.stdout).toContain("SUPERAGENT_DIR=" + root);
    const [seen] = await run(api.seen({ sandbox }));
    expect(seen?.env.map((v) => [v.name, v.from]).sort()).toEqual([
      ["GITHUB_NUMBER", "source"], ["REGION", "settings"], ["SUPERAGENT_BLOCKED_COMMANDS", "built-in"], ["SUPERAGENT_DIR", "built-in"], ["SUPERAGENT_NAME", "built-in"], ["SUPERAGENT_TICKET", "built-in"],
    ]);
    expect(JSON.stringify(seen)).not.toContain(CANARY);
    await run(api.close(sandbox));
  });

  it("reaches the daemon's own commands the same way: the pi-env daemon's environment is the sandbox's too", async () => {
    const { sandbox } = await open("ticket/env2");
    const [seen] = await run(api.seen({ sandbox }));
    const pid = (await run(api.left)).processes.find((p) => p.sandbox === sandbox && p.command === "pi-env serve")!.pid;
    const environ = execFileSync("ps", ["eww", "-o", "command=", "-p", String(pid)], { encoding: "utf8" });
    expect(environ).not.toContain(CANARY);
    expect(environ).toContain(`SUPERAGENT_DIR=${seen!.root}`);
    await run(api.close(sandbox));
  });
});

describe("lend: a credential for one call", () => {
  const loan = (value = "ghs_canary_loan") => ({ name: "GH_TOKEN", value, scope: "acme/widgets contents:write", expiresAt: clock + 3_600_000 });

  it("is in that one process's environment, redacted from its output and the record, and gone for the next call", async () => {
    const { sandbox } = await open("ticket/lend");
    const ran = await run(api.exec({ sandbox, command: ["sh", "-c", 'echo "token=$GH_TOKEN"; echo "x" >&2'], lend: [loan()] }));
    expect(ran).toEqual({ exit: 0, stdout: "token=[redacted:GH_TOKEN]\n", stderr: "x\n" });
    const after = await run(api.exec({ sandbox, command: ["sh", "-c", 'echo "[$GH_TOKEN]"'] }));
    expect(after.stdout).toBe("[]\n");
    const [seen] = await run(api.seen({ sandbox }));
    expect(seen?.execs.map((e) => e.lent)).toEqual([["GH_TOKEN"], []]);
    expect(seen?.loans).toEqual([{ name: "GH_TOKEN", scope: "acme/widgets contents:write", expiresAt: clock + 3_600_000 }]);
    expect(JSON.stringify(seen)).not.toContain("ghs_canary_loan");
    expect(seen?.env.map((v) => v.name)).not.toContain("GH_TOKEN");
    await run(api.close(sandbox));
  });

  it("redacts a value an argument carried, and refuses an expired loan before anything runs", async () => {
    const { sandbox } = await open("ticket/lend2");
    await run(api.exec({ sandbox, command: ["echo", "ghs_canary_loan"], lend: [loan()] }));
    expect(await result(api.exec({ sandbox, command: ["echo", "never"], lend: [{ ...loan(), expiresAt: clock }] }))).toMatchObject({ failure: { _tag: "LoanExpired", variable: "GH_TOKEN" } });
    const [seen] = await run(api.seen({ sandbox }));
    expect(seen?.execs[0]?.command).toEqual(["echo", "[redacted:GH_TOKEN]"]);
    expect(JSON.stringify(seen)).not.toContain("ghs_canary_loan");
    await run(api.close(sandbox));
  });
});

describe("a link made from inside does not lead out", () => {
  it("a dangling symbolic link made by exec cannot be written through, and the file it points at is never made", async () => {
    const { sandbox, root } = await open("ticket/link");
    const outside = join(dir, "outside-new");
    await run(api.exec({ sandbox, command: ["ln", "-s", outside, "link"] }));
    expect(await result(api.write({ sandbox, path: "link", content: "x" }))).toMatchObject({ failure: { _tag: "OutsideSandbox", path: "link", root } });
    expect(await result(api.read({ sandbox, path: "link" }))).toMatchObject({ failure: { _tag: "OutsideSandbox" } });
    expect(await result(api.exec({ sandbox, command: ["pwd"], cwd: "link" }))).toMatchObject({ failure: { _tag: "OutsideSandbox" } });
    expect(existsSync(outside)).toBe(false);
    await run(api.exec({ sandbox, command: ["ln", "-s", "loop-b", "loop-a"] }));
    await run(api.exec({ sandbox, command: ["ln", "-s", "loop-a", "loop-b"] }));
    expect(await result(api.write({ sandbox, path: "loop-a", content: "x" }))).toMatchObject({ failure: { _tag: "OutsideSandbox" } });
    await run(api.close(sandbox));
  });
});

describe("an exec cannot start after its sandbox is closed", () => {
  it("closing while execs are being started leaves none running and none started later", { timeout: 30_000 }, async () => {
    for (let round = 0; round < 5; round++) {
      const { sandbox } = await open(`ticket/race-${round}`);
      const execs = Array.from({ length: 6 }, () => result(api.exec({ sandbox, command: ["sleep", "29"], timeoutSeconds: 40 })));
      const closed = run(api.close(sandbox));
      await Promise.all(execs);
      await closed;
      expect((await run(api.left)).processes.filter((p) => p.sandbox === sandbox)).toEqual([]);
      expect(execFileSync("ps", ["-A", "-o", "command="], { encoding: "utf8" }).split("\n").filter((c) => c.endsWith("sleep 29"))).toEqual([]);
    }
    expect(await result(api.exec({ sandbox: "sbx_never", command: ["sleep", "29"] }))).toMatchObject({ failure: { _tag: "SandboxGone" } });
  });
});

describe("nothing is left after a retire", () => {
  it("kills a running command by group when its sandbox closes, stops the daemon, and removes both folders", async () => {
    const { sandbox, root } = await open("ticket/close");
    const left = await run(api.left);
    const daemon = left.processes.find((p) => p.sandbox === sandbox)!.pid;
    expect(alive(daemon)).toBe(true);
    const fiber = Effect.runFork(api.exec({ sandbox, command: ["sh", "-c", "sleep 30 & sleep 30"], timeoutSeconds: 60 }).pipe(Effect.result));
    for (let i = 0; i < 100 && (await run(api.left)).processes.length < 2; i++) await new Promise((r) => setTimeout(r, 20));
    const during = (await run(api.left)).processes.filter((p) => p.sandbox === sandbox);
    expect(during.map((p) => p.command).sort()).toEqual(["exec", "pi-env serve"]);
    const closed = await run(api.close(sandbox));
    expect(closed).toEqual({ closed: true, killed: 2 });
    expect(await Effect.runPromise(Fiber.await(fiber))).toBeDefined();
    expect(alive(daemon)).toBe(false);
    for (const p of during) expect(alive(p.pid), `${p.command} ${p.pid}`).toBe(false);
    expect(existsSync(root)).toBe(false);
    expect(existsSync(join(dir, "shims", sandbox))).toBe(false);
    expect(await run(api.left)).toEqual({ folders: [], processes: [] });
    expect(await run(api.close(sandbox))).toEqual({ closed: false, killed: 0 });
    expect(await result(api.exec({ sandbox, command: ["pwd"] }))).toMatchObject({ failure: { _tag: "SandboxGone", sandbox } });
    expect(await result(api.write({ sandbox, path: "x", content: "" }))).toMatchObject({ failure: { _tag: "SandboxGone" } });
    expect((await run(api.seen({ sandbox })))[0]?.state).toBe("closed");
  });

  it("ends a command that outlives its timeout with exit 124, and leaves nothing of it running", async () => {
    const { sandbox } = await open("ticket/timeout");
    const ran = await run(api.exec({ sandbox, command: ["sleep", "30"], timeoutSeconds: 1 }));
    expect(ran).toMatchObject({ exit: 124, stderr: expect.stringContaining("timed out") });
    expect((await run(api.left)).processes.map((p) => p.command)).toEqual(["pi-env serve"]);
    await run(api.close(sandbox));
    expect(await run(api.left)).toEqual({ folders: [], processes: [] });
  });

  it("sweep closes every open sandbox", async () => {
    await open("ticket/s1"); await open("ticket/s2");
    expect((await run(api.left)).folders.length).toBe(2);
    await run(api.sweep);
    expect(await run(api.left)).toEqual({ folders: [], processes: [] });
    expect(await run(api.list({}))).toEqual([]);
  });
});
