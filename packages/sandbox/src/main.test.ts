// The slice's done check, on the real bridge process: check 42's steps (a write outside refused, a blocked command failed by name, no
// credential among the variables, nothing left after a retire) and check 48's reading (the disk and the process table, never the bridge's
// own report), against `main.ts` started as `ortho dev` starts it. Journey steps these stand for: a-write-outside-the-sandbox-is-refused,
// a-blocked-command-fails-by-name, no-credential-among-the-execution-variables.
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const CANARY = "ortho-canary-github-key";
let dir = "";
const started: Array<ChildProcess> = [];

interface Bridge { readonly child: ChildProcess; readonly url: string; readonly call: (path: string, body?: unknown) => Promise<any>; readonly exited: Promise<number | null> }

const start = (): Promise<Bridge> => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [join(here, "main.ts"), "--port", "0", "--dir", dir], { cwd: dirname(here), env: { ...process.env, GITHUB_KEY_FOR_ADAPTER: CANARY }, stdio: ["ignore", "pipe", "pipe"] });
  started.push(child);
  const exited = new Promise<number | null>((done) => child.once("exit", (code) => done(code)));
  let out = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    out += chunk.toString("utf8");
    const url = /stand-in listening on (http:\/\/127\.0\.0\.1:\d+)/.exec(out)?.[1];
    if (url !== undefined) resolve({ child, url, exited, call: (path, body) => fetch(url + path, { method: "POST", body: JSON.stringify(body ?? {}) }).then((r) => r.json()) });
  });
  child.once("error", reject);
  child.once("exit", (code) => reject(new Error(`the bridge exited ${code} before it listened: ${out}`)));
});

const table = () => execFileSync("ps", ["-A", "-o", "pid=,ppid=,command="], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\n")
  .flatMap((l) => { const m = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(l); return m ? [{ pid: Number(m[1]), ppid: Number(m[2]), command: m[3]! }] : []; });
/** Every process whose command line names this test's folder, or that is a pi-env daemon serving in it: what check 48 calls a leftover. */
const leftovers = () => table().filter((p) => p.command.includes(dir) && !p.command.includes("vitest"));
const sandboxFolders = () => (existsSync(join(dir, "sandboxes")) ? readdirSync(join(dir, "sandboxes")) : []);
const gone = async (pid: number) => { for (let i = 0; i < 100; i++) { if (!table().some((p) => p.pid === pid)) return true; await new Promise((r) => setTimeout(r, 50)); } return false; };

beforeAll(() => { dir = realpathSync(mkdtempSync(join(tmpdir(), "ortho-sbx-main-"))); });
afterEach(() => { for (const child of started.splice(0)) if (child.exitCode === null && child.pid !== undefined) child.kill("SIGKILL"); });
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("the bridge process", () => {
  it("refuses, fails by name, keeps the bridge's environment out, and leaves nothing on the disk or in the process table after a retire", { timeout: 60_000 }, async () => {
    const bridge = await start();
    const open = await bridge.call("/call/open", { owner: "coder", tag: "ticket/one", variables: [{ name: "GITHUB_REPOSITORY", value: "acme/widgets", from: "source" }, { name: "REGION", value: "eu-west", from: "settings" }], blocked: ["sudo"] });
    const { sandbox, root, address } = open.answer;
    expect(root).toBe(join(dir, "sandboxes", sandbox));
    expect(address).toMatch(/^tcp:\/\/127\.0\.0\.1:\d+#[0-9a-f]{32}$/);

    expect(await bridge.call("/call/write", { sandbox, path: "notes.txt", content: "ok" })).toMatchObject({ ok: true });
    expect(await bridge.call("/call/write", { sandbox, path: "../../outside.txt", content: "x" })).toMatchObject({ ok: false, error: { name: "OutsideSandbox", path: "../../outside.txt", root } });
    expect(await bridge.call("/call/exec", { sandbox, command: ["echo", "sudo"] })).toMatchObject({ ok: true, answer: { exit: 0 } });
    expect(await bridge.call("/call/exec", { sandbox, command: ["sudo", "ls"] })).toMatchObject({ ok: false, error: { name: "BlockedCommand", command: "sudo" } });
    expect(await bridge.call("/call/exec", { sandbox, command: ["env"] })).toMatchObject({ ok: true, answer: { stdout: expect.not.stringContaining(CANARY) } });

    const seen = (await bridge.call("/_stand/seen", { sandbox })).answer.sandboxes[0];
    expect(seen.refusals.map((r: { name: string }) => r.name)).toEqual(["OutsideSandbox", "BlockedCommand"]);
    expect(seen.env.map((v: { name: string }) => v.name).sort()).toEqual(["GITHUB_REPOSITORY", "REGION", "SUPERAGENT_BLOCKED_COMMANDS", "SUPERAGENT_DIR", "SUPERAGENT_NAME", "SUPERAGENT_TICKET"]);
    expect(JSON.stringify(seen)).not.toContain(CANARY);

    // While it is open: one folder, and the bridge's child daemon in the process table.
    expect(sandboxFolders()).toEqual([sandbox]);
    expect(table().filter((p) => p.ppid === bridge.child.pid && p.command.includes("serve --token"))).toHaveLength(1);
    expect(table().filter((p) => p.command.includes("serve --token") && p.ppid === bridge.child.pid)[0]!.command).not.toContain(CANARY);

    // The retire sweep, then check 48's reading: the disk, the process table, then again once the bridge itself has stopped.
    expect(await bridge.call("/call/close", { sandbox })).toMatchObject({ ok: true, answer: { closed: true } });
    expect([sandboxFolders(), leftovers().filter((p) => p.ppid === bridge.child.pid)]).toEqual([[], []]);
    expect((await bridge.call("/_stand/left")).answer).toEqual({ folders: [], processes: [] });
    bridge.child.kill("SIGTERM");
    expect(await bridge.exited).toBe(0);
    expect([sandboxFolders(), leftovers()]).toEqual([[], []]);
  });

  it("closes every open sandbox when the bridge is told to stop, so a stopped bridge leaves nothing", { timeout: 60_000 }, async () => {
    const bridge = await start();
    for (const tag of ["a", "b"]) await bridge.call("/call/open", { owner: "coder", tag, variables: [], blocked: [] });
    const running = bridge.call("/call/exec", { sandbox: (await bridge.call("/call/list", {})).answer.sandboxes[0].sandbox, command: ["sleep", "30"] }).catch(() => undefined);
    const sleeping = () => table().filter((p) => p.ppid === bridge.child.pid && p.command.endsWith("sleep 30"));
    for (let i = 0; i < 100 && sleeping().length === 0; i++) await new Promise((r) => setTimeout(r, 50));
    expect(sandboxFolders()).toHaveLength(2);
    const mine = table().filter((p) => p.ppid === bridge.child.pid);
    expect(mine.filter((p) => p.command.endsWith("sleep 30"))).toHaveLength(1);
    expect(mine.filter((p) => p.command.includes("serve --token"))).toHaveLength(2);
    bridge.child.kill("SIGTERM");
    expect(await bridge.exited).toBe(0);
    await running;
    for (const p of mine) expect(table().some((q) => q.pid === p.pid), `${p.pid} ${p.command}`).toBe(false);
    expect([sandboxFolders(), leftovers()]).toEqual([[], []]);
  });

  it("when the bridge is killed hard its daemons still die (their stdin ends), and the next bridge on that folder sweeps what it left", { timeout: 60_000 }, async () => {
    const bridge = await start();
    await bridge.call("/call/open", { owner: "coder", tag: "x", variables: [], blocked: [] });
    const daemon = table().find((p) => p.ppid === bridge.child.pid && p.command.includes("serve --token"))!;
    bridge.child.kill("SIGKILL");
    await bridge.exited;
    expect(await gone(daemon.pid)).toBe(true);
    expect(sandboxFolders()).toHaveLength(1);
    const next = await start();
    expect([sandboxFolders(), (await next.call("/_stand/left")).answer]).toEqual([[], { folders: [], processes: [] }]);
    next.child.kill("SIGTERM");
    expect(await next.exited).toBe(0);
  });
});
