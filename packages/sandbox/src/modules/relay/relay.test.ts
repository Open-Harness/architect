// Journey steps: "the bridge refused exactly the one write, by name" (a-write-outside-the-sandbox-is-refused) and "the ordinary commands ran
// and exited 0 ... the blocked one exited 126" (a-blocked-command-fails-by-name), through Pi's own path: the real pi-env daemon, a real
// socket and real frames. Nothing is mocked; the daemon is the one `@earendil-works/pi-env` ships.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { connect, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { localDaemon } from "@earendil-works/pi-env";
import { Effect, Exit, Scope } from "effect";
import { TimersLive } from "@orthograph/language-effect/device";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Commands } from "../commands/service.ts";
import { nodeDisk } from "../disk/service.ts";
import { Fence } from "../fence/service.ts";
import { Relay } from "./service.ts";
import { split } from "./internal/frames.ts";
import type { Refusal } from "./types.ts";

interface Frame { readonly type: number; readonly id: number; readonly json: Record<string, unknown>; readonly payload: Buffer }
const parse = (raw: Buffer): Frame => {
  const n = raw.readUInt32BE(9);
  return { type: raw.readUInt8(4), id: raw.readUInt32BE(5), json: JSON.parse(raw.subarray(13, 13 + n).toString("utf8")), payload: raw.subarray(13 + n) };
};
const build = (id: number, json: object, payload: Buffer<ArrayBufferLike> = Buffer.alloc(0)): Buffer => {
  const body = Buffer.from(JSON.stringify(json));
  const out = Buffer.alloc(13 + body.length + payload.length);
  out.writeUInt32BE(9 + body.length + payload.length, 0); out.writeUInt8(1, 4); out.writeUInt32BE(id, 5); out.writeUInt32BE(body.length, 9);
  body.copy(out, 13); payload.copy(out, 13 + body.length);
  return out;
};

/** A client that has read the sync line: `ask` sends a request and answers its frames up to the result or error. */
const attach = (address: string) => new Promise<{ socket: Socket; token: string; ask: (id: number, json: object, payload?: Buffer) => Promise<ReadonlyArray<Frame>> }>((resolve) => {
  const url = new URL(address);
  const socket = connect(Number(url.port), "127.0.0.1", () => socket.write(`${url.hash.slice(1)}\n`));
  let bytes: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  let synced = false;
  const seen: Array<Frame> = [];
  const waiting = new Map<number, (frames: ReadonlyArray<Frame>) => void>();
  socket.on("data", (chunk) => {
    bytes = Buffer.concat([bytes, chunk]);
    if (!synced) {
      const end = bytes.indexOf(0x0a);
      if (end < 0) return;
      synced = true;
      const line = bytes.subarray(0, end).toString("utf8");
      bytes = bytes.subarray(end + 1);
      resolve({ socket, token: line.replace("PI-ENV ", ""), ask: (id, json, payload) => new Promise((done) => { waiting.set(id, done); socket.write(build(id, json, payload)); }) });
    }
    const { frames, rest } = split(Buffer.alloc(0), bytes);
    bytes = rest;
    for (const raw of frames) {
      const frame = parse(raw);
      seen.push(frame);
      if (frame.type === 2 || frame.type === 3) waiting.get(frame.id)?.(seen.filter((f) => f.id === frame.id));
    }
  });
});

let base = ""; let root = ""; let scope: Scope.Closeable; let address = ""; let pid = 0;
const refused: Array<Refusal> = [];
const started: Array<ReadonlyArray<string>> = [];
const exits: Array<[number, number | null]> = [];

beforeAll(async () => {
  base = realpathSync(mkdtempSync(join(tmpdir(), "ortho-sbx-relay-")));
  root = join(base, "sandboxes/sbx_one");
  mkdirSync(root, { recursive: true });
  const shims = join(base, "shims/sbx_one");
  await Effect.runPromise(Commands.install(nodeDisk, shims, ["sudo"]));
  scope = await Effect.runPromise(Scope.make());
  const relay = await Effect.runPromise(Effect.gen(function* () {
    const fence = yield* Fence.of(nodeDisk, root);
    return yield* Relay.start({
      binary: localDaemon(), cwd: root, token: "cafe0123", blocked: ["sudo"], fence,
      env: { PATH: `${shims}:/usr/bin:/bin`, HOME: root, SUPERAGENT_DIR: root },
      observe: {
        refused: (r) => Effect.sync(() => void refused.push(r)),
        started: (words) => Effect.sync(() => started.push(words) - 1),
        exited: (handle, exit) => Effect.sync(() => void exits.push([handle, exit])),
      },
    });
  }).pipe(Scope.provide(scope), Effect.provide(TimersLive)));
  address = relay.address; pid = relay.pid;
});
afterAll(async () => {
  await Effect.runPromise(Scope.close(scope, Exit.void));
  rmSync(base, { recursive: true, force: true });
});

const alive = (p: number) => { try { process.kill(p, 0); return true; } catch { return false; } };

describe("relay", () => {
  it("starts a real pi-env daemon, in the sandbox's folder, and gives its address and the sync token", async () => {
    expect(address).toMatch(/^tcp:\/\/127\.0\.0\.1:\d+#cafe0123$/);
    expect(execFileSync("ps", ["-o", "args=", "-p", String(pid)], { encoding: "utf8" })).toContain("serve --token cafe0123");
    const client = await attach(address);
    expect(client.token).toBe("cafe0123");
    const [hello] = await client.ask(1, { op: "hello", protocol: 1 });
    expect(hello).toMatchObject({ type: 2, json: { protocol: 1 } });
    client.socket.destroy();
  });

  it("writes a file inside the folder, and refuses a write outside it by name, before the daemon sees it", async () => {
    const client = await attach(address);
    const inside = await client.ask(2, { op: "write", path: join(root, "notes.txt"), append: false }, Buffer.from("ok"));
    expect(inside.at(-1)).toMatchObject({ type: 2 });
    expect(readFileSync(join(root, "notes.txt"), "utf8")).toBe("ok");
    const outside = join(base, "outside.txt");
    const answer = await client.ask(3, { op: "write", path: outside, append: false }, Buffer.from("x"));
    expect(answer.at(-1)).toMatchObject({ type: 3, json: { code: "OutsideSandbox", message: `OutsideSandbox: ${outside} is outside ${root}` } });
    expect(existsSync(outside)).toBe(false);
    expect(refused).toEqual([{ name: "OutsideSandbox", detail: `OutsideSandbox: ${outside} is outside ${root}` }]);
    client.socket.destroy();
  });

  it("refuses a read, a folder listing and a working directory outside, and a symbolic-link-free .. in a path", async () => {
    const client = await attach(address);
    for (const [id, request] of [[4, { op: "realpath", path: join(root, "../..") }], [5, { op: "exec", command: "pwd", cwd: base, env: {}, inheritEnv: true }], [6, { op: "rename", path: join(root, "notes.txt"), to: join(base, "moved.txt") }]] as const) {
      const answer = await client.ask(id, request);
      expect(answer.at(-1), JSON.stringify(request)).toMatchObject({ type: 3, json: { code: "OutsideSandbox" } });
    }
    expect(existsSync(join(base, "moved.txt"))).toBe(false);
    client.socket.destroy();
  });

  it("runs an ordinary command and one that merely names sudo, and the shim refuses the blocked one with 126", async () => {
    const client = await attach(address);
    const run = (id: number, command: string) => client.ask(id, { op: "exec", command, cwd: root, env: {}, inheritEnv: true });
    expect((await run(10, "echo fine")).at(-1)).toMatchObject({ type: 2, json: { exitCode: 0 } });
    expect((await run(11, "echo sudo")).at(-1)).toMatchObject({ type: 2, json: { exitCode: 0 } });
    const blocked = await run(12, "sudo ls");
    expect(blocked.at(-1)).toMatchObject({ type: 2, json: { exitCode: 126 } });
    expect(Buffer.concat(blocked.filter((f) => f.type === 4).map((f) => f.payload)).toString("utf8")).toContain("BlockedCommand: sudo");
    expect(started.slice(-3)).toEqual([["echo", "fine"], ["echo", "sudo"], ["sudo", "ls"]]);
    expect(exits.slice(-3).map(([, exit]) => exit)).toEqual([0, 0, 126]);
    expect(Commands.hitsFrom(readFileSync(Commands.hitsFile(join(base, "shims/sbx_one")), "utf8"))).toEqual([]);
    client.socket.destroy();
  });

  it("answers a blocked first word itself, even by path or in a shell, and a shim catches a blocked name run inside a shell", async () => {
    const client = await attach(address);
    const run = (id: number, json: object) => client.ask(id, { op: "exec", cwd: root, env: {}, inheritEnv: true, ...json });
    const before = refused.length;
    expect((await run(30, { argv: ["/usr/bin/sudo", "ls"] })).at(-1)).toMatchObject({ type: 2, json: { exitCode: 126 } });
    expect(refused.slice(before).map((r) => r.name)).toEqual(["BlockedCommand"]);
    expect((await run(31, { command: "sudo -n true" })).at(-1)).toMatchObject({ type: 2, json: { exitCode: 126 } });
    expect(refused.slice(before).map((r) => r.detail)).toEqual(["BlockedCommand: sudo", "BlockedCommand: sudo"]);
    const inShell = await run(32, { argv: ["sh", "-c", "sudo ls"] });
    expect(inShell.at(-1)).toMatchObject({ type: 2, json: { exitCode: 126 } });
    expect(Commands.hitsFrom(readFileSync(Commands.hitsFile(join(base, "shims/sbx_one")), "utf8"))).toEqual(["sudo"]);
    client.socket.destroy();
  });

  it("serves one client at a time, and a socket that has not proved the token never takes the slot", async () => {
    const url = new URL(address);
    const silent = connect(Number(url.port), "127.0.0.1");
    const wrong = connect(Number(url.port), "127.0.0.1", () => wrong.write("not-the-token\n"));
    const heard: Array<Buffer> = [];
    silent.on("data", (c) => heard.push(c));
    wrong.on("data", (c) => heard.push(c));
    expect(await new Promise<boolean>((done) => { wrong.on("close", () => done(true)); wrong.on("error", () => done(true)); })).toBe(true);
    const first = await attach(address);
    expect((await first.ask(20, { op: "hello", protocol: 1 })).at(-1)).toMatchObject({ type: 2 });
    const second = connect(Number(url.port), "127.0.0.1", () => second.write(`${url.hash.slice(1)}\n`));
    expect(await new Promise<boolean>((done) => { second.on("close", () => done(true)); second.on("error", () => done(true)); })).toBe(true);
    expect((await first.ask(21, { op: "hello", protocol: 1 })).at(-1)).toMatchObject({ type: 2 });
    silent.destroy();
    expect(Buffer.concat(heard).toString("utf8")).toBe("");
    first.socket.destroy();
  });

  it("a client that sends frames without the token gets nothing and runs nothing", { timeout: 15_000 }, async () => {
    const url = new URL(address);
    const raw = connect(Number(url.port), "127.0.0.1", () => raw.write(build(1, { op: "write", path: join(root, "unauthenticated.txt"), append: false }, Buffer.from("x"))));
    const heard: Array<Buffer> = [];
    raw.on("data", (c) => heard.push(c));
    await new Promise<void>((done) => { raw.on("close", () => done()); raw.on("error", () => done()); raw.setTimeout(8_000, () => raw.destroy()); });
    expect(Buffer.concat(heard).length).toBe(0);
    expect(existsSync(join(root, "unauthenticated.txt"))).toBe(false);
  });

  it("a partial frame left by one client is not glued onto the next client's first frame", async () => {
    const url = new URL(address);
    const half = connect(Number(url.port), "127.0.0.1", () => half.write(`${url.hash.slice(1)}\n`));
    await new Promise<void>((done) => half.once("data", () => done()));
    half.write(build(40, { op: "hello", protocol: 1 }).subarray(0, 7));
    await new Promise((r) => setTimeout(r, 100));
    half.destroy();
    await new Promise((r) => setTimeout(r, 100));
    const next = await attach(address);
    expect((await next.ask(41, { op: "hello", protocol: 1 })).at(-1)).toMatchObject({ type: 2, json: { protocol: 1 } });
    next.socket.destroy();
  });

  it("sends on what the fence checked: a path through a symbolic link and .. lands where the fence said, never outside", async () => {
    const { symlinkSync } = await import("node:fs");
    const outside = join(base, "outside-sub");
    mkdirSync(outside, { recursive: true });
    symlinkSync(outside, join(root, "linkdir"));
    const client = await attach(address);
    const answer = await client.ask(50, { op: "write", path: `${root}/linkdir/../escaped.txt`, append: false }, Buffer.from("x"));
    expect(answer.at(-1)).toMatchObject({ type: 2 });
    expect(existsSync(join(base, "escaped.txt"))).toBe(false);
    expect(existsSync(join(outside, "../escaped.txt"))).toBe(false);
    expect(readFileSync(join(root, "escaped.txt"), "utf8")).toBe("x");
    // A dangling link is refused outright, the way the bridge's own file calls refuse it.
    symlinkSync(join(base, "never-made"), join(root, "dangling"));
    const refusedLink = await client.ask(51, { op: "write", path: join(root, "dangling"), append: false }, Buffer.from("x"));
    expect(refusedLink.at(-1)).toMatchObject({ type: 3, json: { code: "OutsideSandbox" } });
    expect(existsSync(join(base, "never-made"))).toBe(false);
    client.socket.destroy();
  });

  it("is gone when the scope closes: the daemon exited, the port closed", async () => {
    const mine = await Effect.runPromise(Scope.make());
    const shims = join(base, "shims/sbx_two");
    const where = join(base, "sandboxes/sbx_two");
    mkdirSync(where, { recursive: true });
    const relay = await Effect.runPromise(Effect.gen(function* () {
      const fence = yield* Fence.of(nodeDisk, where);
      return yield* Relay.start({ binary: localDaemon(), cwd: where, token: "beef", blocked: [], fence, env: { PATH: `${shims}:/usr/bin:/bin` }, observe: { refused: () => Effect.void, started: () => Effect.succeed(0), exited: () => Effect.void } });
    }).pipe(Scope.provide(mine), Effect.provide(TimersLive)));
    expect(alive(relay.pid)).toBe(true);
    await Effect.runPromise(Scope.close(mine, Exit.void));
    expect(alive(relay.pid)).toBe(false);
    expect(relay.alive()).toBe(false);
    const port = Number(new URL(relay.address).port);
    expect(await new Promise<string>((done) => { const s = connect(port, "127.0.0.1"); s.on("error", (e: NodeJS.ErrnoException) => done(e.code ?? "")); s.on("connect", () => { s.destroy(); done("connected"); }); })).toBe("ECONNREFUSED");
  });

  it("a missing binary is a typed failure, not a hang or a throw", async () => {
    const mine = await Effect.runPromise(Scope.make());
    const where = join(base, "sandboxes/sbx_three");
    mkdirSync(where, { recursive: true });
    const result = await Effect.runPromise(Effect.gen(function* () {
      const fence = yield* Fence.of(nodeDisk, where);
      return yield* Relay.start({ binary: join(base, "no-such-daemon"), cwd: where, token: "x", blocked: [], fence, env: {}, observe: { refused: () => Effect.void, started: () => Effect.succeed(0), exited: () => Effect.void } });
    }).pipe(Scope.provide(mine), Effect.provide(TimersLive), Effect.result));
    expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "DaemonFailed", reason: expect.stringContaining("not found") } });
    await Effect.runPromise(Scope.close(mine, Exit.void));
  });
});
