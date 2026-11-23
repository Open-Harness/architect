// The slice's done check, on the real bridge process: check 42's steps (a write outside refused, a blocked command failed by name, no
// credential among the variables, nothing left after a retire) and check 48's reading (the disk and the process table, never the bridge's
// own report), against `main.ts` started as `ortho dev` starts it. Journey steps these stand for: a-write-outside-the-sandbox-is-refused,
// a-blocked-command-fails-by-name, no-credential-among-the-execution-variables.
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const CANARY = "ortho-canary-github-key";
let dir = "";
const started: Array<ChildProcess> = [];

interface Bridge { readonly child: ChildProcess; readonly url: string; readonly secret: string; readonly call: (path: string, body?: unknown) => Promise<any>; readonly exited: Promise<number | null> }

const start = (): Promise<Bridge> => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [join(here, "main.ts"), "--port", "0", "--dir", dir], { cwd: dirname(here), env: { ...process.env, GITHUB_KEY_FOR_ADAPTER: CANARY }, stdio: ["ignore", "pipe", "pipe"] });
  started.push(child);
  const exited = new Promise<number | null>((done) => child.once("exit", (code) => done(code)));
  let out = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    out += chunk.toString("utf8");
    // The launcher's contract: `stand-in secret <hex>` comes first, then `stand-in listening on <url>`.
    const secret = /^stand-in secret ([0-9a-f]{64})$/m.exec(out)?.[1];
    const url = /^stand-in listening on (http:\/\/127\.0\.0\.1:\d+)$/m.exec(out)?.[1];
    if (url !== undefined && secret !== undefined) resolve({ child, url, secret, exited, call: (path, body) => fetch(url + path, { method: "POST", headers: { "x-bridge-secret": secret }, body: JSON.stringify(body ?? {}) }).then((r) => r.json()) });
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
    const { sandbox } = (await bridge.call("/call/open", { owner: "coder", tag: "x", variables: [], blocked: [] })).answer;
    const running = bridge.call("/call/exec", { sandbox, command: ["sleep", "31"] }).catch(() => undefined);
    const sleeper = async () => { for (let i = 0; i < 100; i++) { const p = table().find((q) => q.ppid === bridge.child.pid && q.command.endsWith("sleep 31")); if (p) return p; await new Promise((r) => setTimeout(r, 50)); } return undefined; };
    const sleeping = (await sleeper())!;
    const daemon = table().find((p) => p.ppid === bridge.child.pid && p.command.includes("serve --token"))!;
    bridge.child.kill("SIGKILL");
    await bridge.exited;
    await running;
    expect(await gone(daemon.pid)).toBe(true);
    // The daemon dies with its stdin, but a command the bridge started is detached: it, and the folders, wait for the next bridge.
    expect(table().some((p) => p.pid === sleeping.pid)).toBe(true);
    expect(sandboxFolders()).toHaveLength(1);
    const next = await start();
    expect(await gone(sleeping.pid)).toBe(true);
    expect([sandboxFolders(), (await next.call("/_stand/left")).answer]).toEqual([[], { folders: [], processes: [] }]);
    next.child.kill("SIGTERM");
    expect(await next.exited).toBe(0);
  });

  it("closes every sandbox on SIGHUP as on SIGTERM, and removes its secret file", { timeout: 60_000 }, async () => {
    const bridge = await start();
    await bridge.call("/call/open", { owner: "coder", tag: "hup", variables: [], blocked: [] });
    expect(sandboxFolders()).toHaveLength(1);
    bridge.child.kill("SIGHUP");
    expect(await bridge.exited).toBe(0);
    expect([sandboxFolders(), leftovers()]).toEqual([[], []]);
  });

  it("serves nothing without its secret, which is on the launcher's stdout and nowhere a sandbox can read: not on disk, not in a process's arguments or environment", { timeout: 60_000 }, async () => {
    const bridge = await start();
    const { secret } = bridge;
    const sandbox = (await bridge.call("/call/open", { owner: "coder", tag: "locked", variables: [], blocked: [] })).answer.sandbox;
    for (const [method, path] of [["POST", "/call/exec"], ["POST", "/call/list"], ["POST", "/_stand/seen"], ["POST", "/_stand/left"], ["POST", "/_stand/reset"], ["GET", "/_stand/health"]] as const) {
      for (const headers of [{}, { "x-bridge-secret": "nope" }, { "x-bridge-secret": secret.slice(1) }]) {
        const answer = await fetch(bridge.url + path, { method, headers, ...(method === "POST" ? { body: JSON.stringify({ sandbox, command: ["echo", "x"] }) } : {}) });
        expect([path, answer.status]).toEqual([path, 401]);
      }
    }
    expect(sandboxFolders()).toEqual([sandbox]);

    // The probe, from inside the sandbox: every process's arguments, the sandbox's own environment, the state folder's listing and a read of
    // the file the secret used to be in. None shows it, and no bridge.secret exists.
    const probe = await bridge.call("/call/exec", { sandbox, command: ["sh", "-c", 'ps -A -o args=; echo ---; env; echo ---; ls -la "$SUPERAGENT_DIR/../.." 2>&1; cat "$SUPERAGENT_DIR/../../bridge.secret" 2>&1; ls -la "$SUPERAGENT_DIR/../../shims/" 2>&1'] });
    expect(probe.answer.stdout).not.toContain(secret);
    expect(probe.answer.stdout).toContain("No such file");
    expect(probe.answer.stdout).not.toContain("bridge.secret\n");
    // And from outside, the way a reviewer would look: the whole state folder's files, and the bridge's own arguments and environment.
    const filesWithIt = (path: string): ReadonlyArray<string> => readdirSync(path, { withFileTypes: true }).flatMap((e) => {
      const full = join(path, e.name);
      return e.isDirectory() ? filesWithIt(full) : e.isFile() && readFileSync(full, "utf8").includes(secret) ? [full] : [];
    });
    expect(filesWithIt(dir)).toEqual([]);
    expect(existsSync(join(dir, "bridge.secret"))).toBe(false);
    expect(execFileSync("ps", ["eww", "-o", "command=", "-p", String(bridge.child.pid)], { encoding: "utf8" })).not.toContain(secret);
    expect(table().filter((p) => p.command.includes(secret))).toEqual([]);
    bridge.child.kill("SIGTERM");
    expect(await bridge.exited).toBe(0);
  });

  it("the daemon's --token, which any process can read in ps, opens nothing: a client must present the sandbox's own token, which is nowhere in ps", { timeout: 60_000 }, async () => {
    const bridge = await start();
    const open = (tag: string) => bridge.call("/call/open", { owner: "coder", tag, variables: [], blocked: [] }).then((r) => r.answer);
    const [a, b] = [await open("a"), await open("b")];
    const clientTokenOf = (address: string) => new URL(address).hash.slice(1);
    const portOf = (address: string) => Number(new URL(address).port);

    const seen = (await bridge.call("/call/exec", { sandbox: a.sandbox, command: ["ps", "-A", "-o", "args="] })).answer.stdout as string;
    const daemonTokens = [...seen.matchAll(/serve --token (\S+)/g)].map((m) => m[1]!);
    expect(daemonTokens.length).toBeGreaterThanOrEqual(2); // others, from tests running beside this one, may be in the table too
    for (const address of [a.address, b.address]) expect(seen).not.toContain(clientTokenOf(address));
    expect(daemonTokens).not.toContain(clientTokenOf(b.address));

    // A client holding a daemon's --token (even B's own daemon's) is closed without a word and runs nothing in B.
    const present = (port: number, token: string) => new Promise<{ heard: string; closed: boolean }>((done) => {
      const socket = connect(port, "127.0.0.1", () => socket.write(`${token}\n`));
      let heard = "";
      socket.on("data", (c) => { heard += c.toString("utf8"); });
      socket.on("error", () => undefined);
      socket.once("close", () => done({ heard, closed: true }));
      socket.setTimeout(1_500, () => { socket.destroy(); });
    });
    for (const token of daemonTokens) expect(await present(portOf(b.address), token)).toEqual({ heard: "", closed: true });
    // The real token is welcomed with its own sync line, which is not the daemon's token.
    const welcomed = await new Promise<string>((done) => {
      const socket = connect(portOf(b.address), "127.0.0.1", () => socket.write(`${clientTokenOf(b.address)}\n`));
      socket.once("data", (c) => { socket.destroy(); done(c.toString("utf8")); });
    });
    expect(welcomed).toBe(`PI-ENV ${clientTokenOf(b.address)}\n`);
    expect(daemonTokens.some((t) => welcomed.includes(t))).toBe(false);
    bridge.child.kill("SIGTERM");
    expect(await bridge.exited).toBe(0);
  });
});
