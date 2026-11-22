// What the actor checks (`10-m6-07-relayer.test.ts`, `11-m6-09-follower.test.ts`) share: an Anvil of their own, a small test contract (`Echo`, not the budgets
// contract), and a real `wrangler dev` running a Worker the check writes, in which the Durable Objects under test run in workerd with their storage on disk.
// Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
//
// WHY A WORKER OF THE CHECK'S OWN. A Durable Object is reached through a binding. The check writes a Worker that exports the classes the slice adds from the
// front door of `@orthograph/host-cloudflare` (`Relayer`, `Follower`), binds them, and forwards `POST /<BINDING>/<instance name>/<method>` with a JSON array of
// arguments to that Durable Object's method (Durable Object RPC), answering `{ value }` or `{ error }`. So what the checks call is exactly what a Worker of the
// environment calls: `env.RELAYER.getByName(name).relay(...)`. The Worker also holds `Sink`, the check's own `FollowerSink` (see the follower check).
// A restart is a real one: wrangler is stopped and started again over the same `--persist-to` folder, so only what a Durable Object wrote to its storage survives.
// No cloud, no Docker. Every process started here is stopped by its pid.
import { spawn, type ChildProcess } from "node:child_process";
import { createECDH, randomBytes } from "node:crypto";
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freePorts } from "../ports.ts";
import { repo } from "../layer1/support.ts";
import { keccak256, keccak256Bytes } from "./chain-fixture.ts";

export type Hex = `0x${string}`;
export const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

/** Poll `read` until `done` holds of what it returns, or `ms` passes; the last value comes back either way, so the caller's expectation names what was there. */
export const until = async <A>(read: () => Promise<A>, done: (a: A) => boolean, ms = 30_000): Promise<A> => {
  const end = Date.now() + ms;
  for (;;) {
    const value = await read();
    if (done(value) || Date.now() > end) return value;
    await sleep(100);
  }
};

// ---- Anvil, as a process of this check ----

export interface Anvil { readonly rpcUrl: string; readonly chainId: number; readonly pid: number; readonly stop: () => Promise<void> }

export const rpc = async <A = unknown>(url: string, method: string, params: ReadonlyArray<unknown> = []): Promise<A> => {
  const answer = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const body = (await answer.json()) as { result?: A; error?: { message: string } };
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result as A;
};

const exited = (child: ChildProcess) => child.exitCode !== null || child.signalCode !== null;
const kill = (child: ChildProcess, signal: NodeJS.Signals = "SIGTERM") => new Promise<void>((done) => {
  if (exited(child)) return done();
  const force = setTimeout(() => child.kill("SIGKILL"), 15_000);
  child.once("exit", () => { clearTimeout(force); done(); });
  child.kill(signal);
});

export const startAnvil = async (): Promise<Anvil> => {
  const { anvil: port } = freePorts("anvil");
  const chainId = 20_000 + Math.floor(Math.random() * 1_000_000);
  const child = spawn(process.env["ORTHO_ANVIL_BIN"] ?? "anvil", ["--silent", "--host", "127.0.0.1", "--port", String(port), "--chain-id", String(chainId)], { stdio: "ignore" });
  const rpcUrl = `http://127.0.0.1:${port}`;
  const ready = await until(() => rpc<string>(rpcUrl, "eth_chainId").catch(() => ""), (id) => id !== "", 20_000);
  if (ready === "" || child.pid === undefined) { await kill(child); throw new Error("Anvil did not answer within 20 s"); }
  return { rpcUrl, chainId, pid: child.pid, stop: () => kill(child) };
};

// ---- the test contract: Echo (source in the comment, compiled with solcjs 0.8.30 --optimize) ----
//   contract Echo {
//     event Echoed(uint256 indexed id, address indexed by, bytes32 digest);
//     function echo(uint256 id, bytes32 digest) external { emit Echoed(id, msg.sender, digest); }
//     // passes a simulation made before `deadline`, and fails when mined after it: a call that is mined and reverts
//     function guarded(uint256 deadline) external view { require(block.timestamp < deadline, "late"); }
//   }

export const ECHO_BYTECODE = "0x6080604052348015600e575f5ffd5b5061014c8061001c5f395ff3fe608060405234801561000f575f5ffd5b5060043610610034575f3560e01c80635e2849751461003857806382a67c811461004d575b5f5ffd5b61004b6100463660046100df565b610060565b005b61004b61005b3660046100f6565b6100a4565b8042106100a15760405162461bcd60e51b8152600401610098906020808252600490820152636c61746560e01b604082015260600190565b60405180910390fd5b50565b604051818152339083907fa252d7b86ab65f41f612470c12c79b722f0d1fda777f6e3340bbd46db0a1dc389060200160405180910390a35050565b5f602082840312156100ef575f5ffd5b5035919050565b5f5f60408385031215610107575f5ffd5b5050803592602090910135915056fea26469706673582212207146c397e345e65488f062be5f6bf89f10a1927485e7cb4684dc8a8044a90d7564736f6c634300081e0033" as const;
export const ECHO_SELECTOR = `0x${keccak256("echo(uint256,bytes32)").slice(0, 8)}` as Hex;
export const GUARDED_SELECTOR = `0x${keccak256("guarded(uint256)").slice(0, 8)}` as Hex;
export const ECHOED_TOPIC = `0x${keccak256("Echoed(uint256,address,bytes32)")}` as Hex;
/** The event as chain-evm takes it (`makeEventSource`), in the JSON form a Durable Object is given. */
export const ECHOED_ABI = {
  type: "event", name: "Echoed",
  inputs: [{ name: "id", type: "uint256", indexed: true }, { name: "by", type: "address", indexed: true }, { name: "digest", type: "bytes32", indexed: false }],
} as const;

const word = (n: bigint) => n.toString(16).padStart(64, "0");
export const digestOf = (text: string) => `0x${keccak256(text)}` as Hex;
export const echoCall = (id: bigint, digest: Hex): Hex => `${ECHO_SELECTOR}${word(id)}${digest.slice(2)}`;
export const guardedCall = (deadline: bigint): Hex => `${GUARDED_SELECTOR}${word(deadline)}`;

export const accounts = (url: string) => rpc<Hex[]>(url, "eth_accounts");
/** Send from an unlocked Anvil account (no key is used or shown) and mine it. */
export const send = async (url: string, from: Hex, to: Hex | undefined, data: Hex): Promise<{ hash: Hex; block: bigint; blockHash: Hex; contract: Hex | undefined; logs: ReadonlyArray<{ logIndex: number; topics: Hex[]; data: Hex }> }> => {
  const hash = await rpc<Hex>(url, "eth_sendTransaction", [{ from, ...(to === undefined ? {} : { to }), data, gas: "0x200000" }]);
  const receipt = await until(() => rpc<{ status: Hex; blockNumber: Hex; blockHash: Hex; contractAddress: Hex | null; logs: Array<{ logIndex: Hex; topics: Hex[]; data: Hex }> } | null>(url, "eth_getTransactionReceipt", [hash]), (r) => r !== null, 10_000);
  if (receipt === null || receipt.status !== "0x1") throw new Error(`the fixture's own transaction ${hash} was not mined, or reverted`);
  return { hash, block: BigInt(receipt.blockNumber), blockHash: receipt.blockHash, contract: receipt.contractAddress ?? undefined, logs: receipt.logs.map((l) => ({ ...l, logIndex: Number(BigInt(l.logIndex)) })) };
};
export const deployEcho = async (url: string): Promise<{ address: Hex; block: bigint }> => {
  const [from] = await accounts(url);
  const done = await send(url, from!, undefined, ECHO_BYTECODE);
  return { address: done.contract!.toLowerCase() as Hex, block: done.block };
};
export const mine = (url: string, blocks: number) => rpc(url, "anvil_mine", [`0x${blocks.toString(16)}`]);
export const head = async (url: string) => BigInt(await rpc<Hex>(url, "eth_blockNumber"));
export const blockAt = (url: string, number: bigint) => rpc<{ hash: Hex; number: Hex; transactions: Array<{ hash: Hex; from: Hex; to: Hex; nonce: Hex; input: Hex; maxFeePerGas?: Hex; gasPrice?: Hex }> }>(url, "eth_getBlockByNumber", [`0x${number.toString(16)}`, true]);
export interface EchoedLog { readonly id: bigint; readonly by: Hex; readonly digest: Hex; readonly blockNumber: bigint; readonly blockHash: Hex; readonly logIndex: number }
export const echoed = async (url: string, address: Hex): Promise<EchoedLog[]> => {
  const logs = await rpc<Array<{ topics: Hex[]; data: Hex; blockNumber: Hex; blockHash: Hex; logIndex: Hex }>>(url, "eth_getLogs", [{ address, topics: [ECHOED_TOPIC], fromBlock: "0x0", toBlock: "latest" }]);
  return logs.map((l) => ({ id: BigInt(l.topics[1]!), by: `0x${l.topics[2]!.slice(26)}` as Hex, digest: l.data, blockNumber: BigInt(l.blockNumber), blockHash: l.blockHash, logIndex: Number(BigInt(l.logIndex)) }));
};

// ---- a key the check makes, and the address it signs as ----

/** A fresh secret key (32 random bytes, valid on secp256k1 with overwhelming probability) and the address it makes. The key is only ever given to the Worker's environment. */
export const makeKey = (secret: string = randomBytes(32).toString("hex")): { readonly secret: string; readonly address: Hex } => {
  const ecdh = createECDH("secp256k1");
  ecdh.setPrivateKey(Buffer.from(secret, "hex"));
  const address = `0x${keccak256Bytes(ecdh.getPublicKey().subarray(1)).slice(24)}` as Hex;
  return { secret, address };
};

// ---- the Worker, under wrangler dev ----

export interface WorkerSpec {
  /** The classes the slice adds, exported from the front door of `@orthograph/host-cloudflare` and bound under `RELAYER` and `FOLLOWER`. */
  readonly classes: ReadonlyArray<"Relayer" | "Follower">;
  /** Secret bindings, handed to wrangler through its process environment: never a file, an argument or a log. */
  readonly secrets?: Readonly<Record<string, string>>;
}
export interface Worker {
  readonly call: (binding: string, name: string, method: string, ...args: ReadonlyArray<unknown>) => Promise<unknown>;
  /** Every response body this Worker has given, for what must never be in one. */
  readonly transcript: () => string;
  readonly log: () => string;
  /** Where the Durable Objects keep their storage. */
  readonly state: string;
  readonly restart: () => Promise<void>;
  readonly stop: () => Promise<void>;
}

const BINDINGS = { Relayer: "RELAYER", Follower: "FOLLOWER" } as const;
const workerSource = (spec: WorkerSpec) => `// The check's Worker. Written by e2e/on-chain/actor-fixture.ts.
import { DurableObject } from "cloudflare:workers";
export { ${spec.classes.join(", ")} } from "@orthograph/host-cloudflare";

// The check's own FollowerSink (Goal 11's Inbox is not on goal/stage-1): one instance per follower, named like it. Same id again answers "seen".
export class Sink extends DurableObject {
  async accept(entry) {
    // A correction takes longer to record, so a follower that hands two changes on at once, and not one after the other, is seen to.
    const fail = (await this.ctx.storage.get("fail")) ?? 0;
    if (fail > 0) { await this.ctx.storage.put("fail", fail - 1); throw new Error("the sink is unavailable"); }
    if (entry.event.endsWith("Corrected")) await new Promise((done) => setTimeout(done, 150));
    const calls = (await this.ctx.storage.get("calls")) ?? [];
    const result = calls.some((c) => c.entry.id === entry.id) ? "seen" : "accepted";
    calls.push({ entry, result });
    await this.ctx.storage.put("calls", calls);
    return result;
  }
  // The check's way to make the sink answer an error: the next n accepts fail, and record nothing.
  async failNext(n) { await this.ctx.storage.put("fail", n); }
  async received() { return (await this.ctx.storage.get("calls")) ?? []; }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") return new Response("ok");
    const [, binding, name, method] = url.pathname.split("/").map(decodeURIComponent);
    const space = env[binding];
    if (!space) return Response.json({ error: "this Worker has no binding " + binding }, { status: 404 });
    try {
      const value = await space.getByName(name)[method](...(await request.json()));
      return Response.json({ value: value ?? null });
    } catch (e) {
      return Response.json({ error: String((e && e.message) || e) }, { status: 500 });
    }
  },
};
`;
const wranglerConfig = (spec: WorkerSpec) => JSON.stringify({
  name: "chain-actors-fixture", main: "worker.ts", compatibility_date: "2026-08-01", compatibility_flags: ["nodejs_compat"],
  durable_objects: { bindings: [...spec.classes.map((c) => ({ name: BINDINGS[c], class_name: c })), { name: "FOLLOWER_SINK", class_name: "Sink" }] },
  migrations: [{ tag: "v1", new_sqlite_classes: [...spec.classes, "Sink"] }],
}, null, 2);

const wranglerBin = () => join(createRequire(join(repo, "packages/host-cloudflare/package.json")).resolve("wrangler/package.json"), "../bin/wrangler.js");
/** What wrangler needs from the shell and nothing else: no key of the user's reaches the Worker. */
const KEPT = /^(PATH|HOME|USER|LOGNAME|SHELL|TMPDIR|TERM|TZ|LANG|LC_[A-Z]+|XDG_[A-Z_]+|SSL_CERT_FILE|SSL_CERT_DIR|NODE_EXTRA_CA_CERTS)$/;

export const startWorker = async (spec: WorkerSpec): Promise<Worker> => {
  const dir = mkdtempSync(join(tmpdir(), "ortho-chain-actors-"));
  const state = join(dir, "state");
  const logFile = join(dir, "wrangler.log");
  mkdirSync(join(dir, "node_modules/@orthograph"), { recursive: true });
  symlinkSync(join(repo, "packages/host-cloudflare"), join(dir, "node_modules/@orthograph/host-cloudflare"));
  writeFileSync(join(dir, "worker.ts"), workerSource(spec));
  writeFileSync(join(dir, "wrangler.jsonc"), wranglerConfig(spec));
  const { worker: port } = freePorts("worker");
  const base = `http://127.0.0.1:${port}`;
  const bodies: string[] = [];
  let child: ChildProcess | undefined;
  const log = () => (existsSync(logFile) ? readFileSync(logFile, "utf8") : "");

  const start = async () => {
    const out = openSync(logFile, "a");
    const kept = Object.fromEntries(Object.entries(process.env).filter(([k]) => KEPT.test(k)));
    child = spawn(process.execPath, [wranglerBin(), "dev", "--config", join(dir, "wrangler.jsonc"), "--port", String(port), "--ip", "127.0.0.1", "--persist-to", state, "--inspector-port", "0"], {
      cwd: dir, stdio: ["ignore", out, out],
      env: { ...kept, CI: "1", WRANGLER_SEND_METRICS: "false", ...spec.secrets, ...(spec.secrets ? { CLOUDFLARE_INCLUDE_PROCESS_ENV: "true" } : {}) },
    });
    closeSync(out);
    const from = log().length;
    const proc = child;
    const answered = await until(
      async () => (await fetch(`${base}/health`, { signal: AbortSignal.timeout(1_000) }).then((r) => r.ok, () => false)) ? "up" : exited(proc) ? "exited" : log().slice(from).includes("✘ [ERROR]") ? "unbuildable" : "waiting",
      (s) => s !== "waiting", 120_000,
    );
    if (answered !== "up") {
      const said = log().slice(from).replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g"), "").split("\n").filter((l) => l.includes("ERROR") || l.includes("no such Durable Object class") || /^\s+\S+:\d+:\d+:/.test(l)).slice(0, 6).join("\n");
      await kill(proc);
      rmSync(dir, { recursive: true, force: true });
      throw new Error(`the Worker holding ${spec.classes.join(" and ")} did not start (${answered}): @orthograph/host-cloudflare must export ${spec.classes.join(" and ")} from its front door, and they must load in workerd.\n${said}`);
    }
  };
  const stop = async () => { if (child) await kill(child); child = undefined; };
  await start();
  return {
    call: async (binding, name, method, ...args) => {
      const answer = await fetch(`${base}/${encodeURIComponent(binding)}/${encodeURIComponent(name)}/${method}`, { method: "POST", body: JSON.stringify(args) });
      const text = await answer.text();
      bodies.push(text);
      const body = JSON.parse(text) as { value?: unknown; error?: string };
      if (body.error !== undefined) throw new Error(`${binding}/${name}.${method} failed: ${body.error}`);
      return body.value;
    },
    transcript: () => bodies.join("\n"),
    log, state,
    restart: async () => { await stop(); await start(); },
    stop: async () => { await stop(); rmSync(dir, { recursive: true, force: true }); },
  };
};

/** Whether `text` (a log, a response) holds the secret, bare or with its `0x`. Case is ignored. */
export const holdsSecret = (text: string, secret: string) => text.toLowerCase().includes(secret.toLowerCase());
/** Every file under `dir` whose bytes hold the secret as text (hex, bare or `0x`) or as raw bytes. A Durable Object's storage is files, and a key kept in it is a key at rest. */
export const filesHolding = (dir: string, secret: string): string[] => {
  const raw = Buffer.from(secret, "hex");
  const found: string[] = [];
  const walk = (path: string) => {
    for (const entry of readdirSync(path)) {
      const full = join(path, entry);
      if (statSync(full).isDirectory()) walk(full);
      else {
        const bytes = readFileSync(full);
        if (bytes.includes(raw) || bytes.toString("latin1").toLowerCase().includes(secret.toLowerCase())) found.push(full);
      }
    }
  };
  if (existsSync(dir)) walk(dir);
  return found;
};

/** The nonces of what a relayer sent, judged against 'exactly `count` of them, from `first`, each once': what is wrong, in words; empty when right. */
export const nonceProblems = (nonces: ReadonlyArray<number>, first: number, count: number): string[] => {
  const problems: string[] = [];
  if (nonces.length !== count) problems.push(`expected ${count} nonces, got ${nonces.length}`);
  const seen = new Map<number, number>();
  for (const n of nonces) seen.set(n, (seen.get(n) ?? 0) + 1);
  for (const [n, times] of seen) if (times > 1) problems.push(`nonce ${n} was given ${times} times`);
  for (let n = first; n < first + count; n++) if (!seen.has(n)) problems.push(`nonce ${n} was never used`);
  for (const n of seen.keys()) if (n < first || n >= first + count) problems.push(`nonce ${n} is outside ${first} to ${first + count - 1}`);
  return problems;
};
