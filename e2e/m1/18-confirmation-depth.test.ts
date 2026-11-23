// Check 18 (M1.38): confirmation per chain and environment (K7 F2, K12 section 4). The wallet takes `confirmed`'s depth from
// the environment's chain; depth one is for a local chain only; `flow.ts:29`'s hard-coded `depth: 1` goes. A world declaring
// depth three on Anvil sees a send `submitted` until three blocks are mined, then `confirmed`; a local environment that
// declares nothing still confirms at one.
//
// Every block is mined by this file over RPC (Anvil's automine is switched off with `evm_setAutomine`, then one `evm_mine` per
// block), so no clock decides when a block exists. Anvil is a plain process of the test's scope (`Anvil.start`, always
// `--silent`, port chosen by the OS), no Docker; a missing `anvil` fails the check closed, it never skips it.
//
// What the design leaves open, and what this check decides (K7 F2 says "a level per chain, set per environment" and K7's as-built
// note says a real environment sets its level "with its other settings"; EnvironmentSpec has no chain field, and the wallet's
// other settings are the host's `ORTHO_WALLET_*` variables and the world's `chain`):
//  1. **How a chain's depth is declared**: one more setting beside `ORTHO_WALLET_CHAIN` and `ORTHO_WALLET_RPC_URL`. On a device
//     host it is `ORTHO_WALLET_DEPTH`, a whole number of at least 1; in a world (`DeviceWorldOf.chain`) it is `chain.depth`, the
//     same number, which `WorldHost` puts in the `ChainSetting` it builds. `ChainSetting` gains `depth`. An environment that
//     names a real chain supplies the variable with the other two (M6's job); nothing is added to `EnvironmentSpec` here, because
//     the wallet is the only reader and it already reads its settings from the host. This is the smallest shape that fits.
//  2. **Local means chain id 31337** (Foundry's and Hardhat's default, and what `Anvil.start` makes). With no depth declared, a
//     local chain is depth 1 and any other chain has none: `Chain.fromHost` still answers (a wallet without a send makes and signs
//     keys on any chain) with `depth` undefined, and a send on it is a defect naming `ORTHO_WALLET_DEPTH` that comes before
//     anything is signed or submitted. "Depth one only for a local chain" is therefore a refusal, not a silent default.
//  3. **Depth counts blocks, the including block first.** Depth 1 is "the transaction is in a block", which is what a local
//     chain gives today; depth 3 is the including block and the two after it, so "three blocks mined" (the milestone's words)
//     is three blocks from the first mined after the send. The assertions below are: 0 blocks mined (still in the mempool), 1
//     (included), 2: `submitted`; 3: `confirmed`.
//  4. **The surface for "still submitted"**. A send answers only when it is done, so a send in flight has no answer to read, and
//     the send's spans today are the chain's own (`chain.evm.*`, with `chain.evm.receipt` at inclusion), none of which says what
//     the level is. This check requires one span of the wallet's own, `wallet.send.level`, emitted by the send each time the chain
//     moves for it, with two attributes: `level` (`submitted` while fewer than `depth` blocks count, `confirmed` once as many do)
//     and `blocks` (how many blocks count: 0 until the transaction is in a block, then the including block and every one after).
//     It is first emitted when the send has been submitted (`submitted`, 0), and the last one it emits is `confirmed` at `depth`.
//     Read through a `Tracer` this file provides, in the send's own fiber. Until it exists, every depth assertion below is red on
//     it and nothing else.
//  5. **Observation is by the surface, never by time.** After each mined block this file polls the recorded spans (every 25 ms,
//     for at most 8 s: a bound for failing, never a wait that decides a pass) until the span for that block count is there, and
//     only then judges the level and whether the send has answered. The send's poll interval is the wallet's own business.
//  6. **`chain-evm`'s `track` ignores its level without an intent** (`tracker.ts`: `done = intent === undefined && receipt !== undefined`),
//     so merely passing `{ depth }` there will not do: the wallet has to count blocks itself, or `track` has to honour depth for a
//     plain transfer. The check holds either way; it is stated for the builder.
//
// Red today on the missing surface only: no `wallet.send.level` span, `ChainSetting` has no `depth`, and `flow.ts` still says
// `depth: 1`. The controls pass today: a local chain confirms a send at one block, and Anvil comes and goes with its scope.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigProvider, Effect, Exit, Redacted, Tracer } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { repo } from "./support.ts";

// The wallet's own modules, loaded by path (the plugin's internals are not exports, and an e2e check may not import a project
// by a relative path). Typed only as far as this file uses them.
const load = async <A>(path: string): Promise<A> => (await import(/* @vite-ignore */ join(repo, path))) as A;
type Run<A = unknown> = Effect.Effect<A, any, never>;
interface Funded { readonly address: string; readonly privateKey: Redacted.Redacted<string> }
interface RunningChain { readonly rpcUrl: string; readonly chainId: number; readonly pid: number; readonly accounts: ReadonlyArray<Funded> }
/** What a world gives the wallet's host entries (`DeviceWorldOf`): `depth` is the one field M1.38 adds to `chain`. */
interface WorldChain { readonly rpcUrl: string; readonly chainId: number; readonly keys: Readonly<Record<string, Redacted.Redacted<string>>>; readonly depth?: number }
interface World { readonly chain: WorldChain; readonly directory: string; readonly remember: <A>(key: string, make: () => A) => A }
interface Wallet {
  readonly send: (payload: { signer: string; label: string; to: string; value: bigint }) => Run<{ level: string; nonce: bigint; transaction: string }>;
  readonly import: (payload: { signer: string; label: string; source: string }) => Run;
}
const { Anvil } = await load<{ Anvil: { start: (options: { chainId: number; accounts: number }) => Run<RunningChain> } }>("packages/chain-evm/src/main.ts");
const { DeviceWorld, TimersLive } = await load<{ DeviceWorld: any; TimersLive: any }>("packages/language-effect/src/device.ts");
const { Account } = await load<{ Account: { format: (account: { chainId: number; address: string }) => string } }>("packages/wallets/src/modules/account/service.ts");
const { Chain } = await load<{ Chain: { fromHost: Run } }>("packages/wallets/src/modules/chain/service.ts");
const { Operations } = await load<{ Operations: { on: (signer: unknown) => Wallet } }>("packages/wallets/src/modules/operations/service.ts");
const { WorldHost } = await load<{ WorldHost: { signer: unknown } }>("packages/wallets/src/modules/world/service.ts");

const folders: Array<string> = [];
const pids: Array<number> = [];
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
  for (const pid of pids.splice(0)) expect(alive(pid), `anvil ${pid} is still running after its scope closed`).toBe(false);
});
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };

const anvilIsThere = () => {
  const ran = spawnSync("anvil", ["--version"], { encoding: "utf8", timeout: 30_000 });
  expect(ran.status, "anvil (Foundry) is not on the path: this check starts it as a process and fails closed without it").toBe(0);
};

/** One JSON-RPC call to the world's chain. */
const rpc = async (url: string, method: string, params: ReadonlyArray<unknown> = []) => {
  const answer = (await (await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) })).json()) as { result?: unknown; error?: { message: string } };
  if (answer.error !== undefined) throw new Error(`${method}: ${answer.error.message}`);
  return answer.result;
};
const sleep = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });
/** Look every 25 ms until `found` gives something, or give up after `ms` and give back nothing. */
const until = async <A>(found: () => A | undefined, ms = 8_000) => {
  const end = Date.now() + ms;
  let seen = found();
  while (seen === undefined && Date.now() < end) { await sleep(25); seen = found(); }
  return seen;
};

type Declared = { readonly depth?: number };
interface Level { readonly level: string; readonly blocks: number }

/**
 * A world with Anvil in it (chain id as given, automine off unless asked), the world signer holding its funded key, and a send
 * of 1000 wei to the payee started and left running. `declared` is the depth the world declares, if any. Spans are recorded
 * by a tracer of this file's. Nothing in it names a key.
 */
const scenario = (options: { readonly declared?: number; readonly chainId?: number; readonly automine?: boolean }) =>
  Effect.gen(function* () {
    anvilIsThere();
    const chainId = options.chainId ?? 31_337;
    const chain = yield* Anvil.start({ chainId, accounts: 2 });
    pids.push(chain.pid);
    if (options.automine !== true) yield* Effect.promise(() => rpc(chain.rpcUrl, "evm_setAutomine", [false]));
    const directory = mkdtempSync(join(tmpdir(), "ortho-depth-"));
    folders.push(directory);
    const kept = new Map<string, unknown>();
    const given: WorldChain = {
      rpcUrl: chain.rpcUrl, chainId: chain.chainId,
      keys: { world: chain.accounts[0]!.privateKey },
      ...(options.declared === undefined ? {} : { depth: options.declared }),
    };
    const world: World = {
      chain: given, directory,
      remember: <A>(key: string, make: () => A) => { if (!kept.has(key)) kept.set(key, make()); return kept.get(key) as A; },
    };
    const spans: Array<Tracer.Span> = [];
    const tracer = Tracer.make({ span(spanOptions) { const span = new Tracer.NativeSpan(spanOptions); spans.push(span); return span; } });
    const controller = new AbortController();
    yield* Effect.addFinalizer(() => Effect.sync(() => controller.abort()));
    const ops = Operations.on(WorldHost.signer);
    const inWorld = <A, E>(effect: Effect.Effect<A, E, any>) =>
      effect.pipe(Effect.provideService(DeviceWorld, world), Effect.provide(TimersLive), Effect.provideService(Tracer.Tracer, tracer)) as Effect.Effect<A, E, never>;
    yield* inWorld(ops.import({ signer: "world", label: "funded", source: Redacted.value(chain.accounts[0]!.privateKey) }));
    const payee = Account.format({ chainId: chain.chainId, address: chain.accounts[1]!.address });

    const outcome: { state: "pending" | "answered" | "failed"; value?: unknown } = { state: "pending" };
    const started = () =>
      Effect.runPromiseExit(inWorld(ops.send({ signer: "world", label: "funded", to: payee, value: 1_000n })), { signal: controller.signal }).then((exit) => {
        outcome.state = Exit.isSuccess(exit) ? "answered" : "failed";
        outcome.value = exit;
      });
    void started();

    const levels = (): ReadonlyArray<Level> =>
      spans.filter((s) => s.name === "wallet.send.level").map((s) => ({ level: String(s.attributes.get("level")), blocks: Number(s.attributes.get("blocks")) }));
    let pooled = false;
    return {
      rpcUrl: chain.rpcUrl, payee, outcome, levels, inWorld, ops, spanNames: () => [...new Set(spans.map((s) => s.name))],
      /** Mine one block; the first waits for the send's transaction to be in the mempool, so that the first block is the one that includes it. */
      mine: () => Effect.promise(async () => {
        if (!pooled) {
          const end = Date.now() + 15_000;
          while (!pooled && Date.now() < end) {
            const status = (await rpc(chain.rpcUrl, "txpool_status")) as { pending: string; queued: string };
            pooled = BigInt(status.pending) + BigInt(status.queued) > 0n;
            if (!pooled) await sleep(25);
          }
          if (!pooled) throw new Error("the send's transaction never reached the mempool, so there is nothing for a block to include");
        }
        return rpc(chain.rpcUrl, "evm_mine");
      }),
      head: () => Effect.promise(async () => BigInt(String(await rpc(chain.rpcUrl, "eth_blockNumber")))),
      /** The level the send reported once `blocks` blocks counted, waiting for the surface and not for a clock. */
      reported: (blocks: number) => Effect.promise(() => until(() => levels().find((l) => l.blocks === blocks))),
      answered: () => Effect.promise(() => until(() => (outcome.state === "pending" ? undefined : outcome.state))),
    };
  });

/** Run a scenario in a scope of its own: Anvil is gone when it ends. */
const inScope = <A, E>(effect: Effect.Effect<A, E, any>) => Effect.runPromise(Effect.scoped(effect).pipe(Effect.provide(TimersLive)) as Effect.Effect<A, E, never>);

const sendLevel = (what: ReadonlyArray<string>) => `no "wallet.send.level" span from the send (the surface check 18 requires); the send's spans were: ${what.join(", ") || "none"}`;

describe("18 depth three: a send is submitted until the third block, then confirmed", () => {
  it("0 blocks mined: submitted, still in the mempool; 1 (included) and 2: submitted, the send has not answered; 3: confirmed, and it answers", { timeout: 120_000 }, () =>
    inScope(Effect.gen(function* () {
      const w = yield* scenario({ declared: 3 });
      const at = (blocks: number, level: string, then: string) => Effect.gen(function* () {
        const seen = yield* w.reported(blocks);
        expect(seen, `${then}: ${sendLevel(w.spanNames())}`).toBeDefined();
        expect(seen?.level, `${then}: the level with ${blocks} of 3 blocks counted`).toBe(level);
      });
      yield* at(0, "submitted", "submitted and in no block yet");
      expect(w.outcome.state, "the send answered before any block was mined").toBe("pending");
      for (const n of [1, 2]) {
        yield* w.mine();
        yield* at(n, "submitted", `after ${n} block${n === 1 ? "" : "s"} mined`);
        expect(w.outcome.state, `the send answered after ${n} of 3 blocks: confirmed too early`).toBe("pending");
      }
      yield* w.mine();
      yield* at(3, "confirmed", "after 3 blocks mined");
      expect(yield* w.answered(), "the send never answered after the third block").toBe("answered");
      const exit = w.outcome.value as Exit.Exit<{ level: string; nonce: bigint }>;
      expect(Exit.isSuccess(exit) && [exit.value.level, exit.value.nonce]).toEqual(["confirmed", 0n]);
      expect(yield* w.head(), "exactly the three blocks this check mined, nothing else mined for it").toBe(3n);
    })));

  it("every level the send reports agrees with its block count: confirmed from the third block and never before, submitted below it", { timeout: 120_000 }, () =>
    inScope(Effect.gen(function* () {
      const w = yield* scenario({ declared: 3 });
      expect(yield* w.reported(0), sendLevel(w.spanNames())).toBeDefined();
      for (let n = 1; n <= 3; n++) { yield* w.mine(); yield* w.reported(n); }
      yield* w.answered();
      const seen = w.levels();
      expect(seen.length, sendLevel(w.spanNames())).toBeGreaterThan(0);
      expect(seen.filter((l) => l.level === "confirmed").map((l) => l.blocks), "confirmed is reported from the third block and no earlier").toSatisfy((blocks: ReadonlyArray<number>) => blocks.length > 0 && blocks.every((b) => b >= 3));
      expect(seen.filter((l) => l.level === "submitted").every((l) => l.blocks < 3), "a block count of three or more is never `submitted`, and one below three is never `confirmed`").toBe(true);
    })));
});

describe("18 a local environment: depth one, as today", () => {
  it("control (passes today): a local chain that declares nothing confirms the send when the first block is mined", { timeout: 120_000 }, () =>
    inScope(Effect.gen(function* () {
      const w = yield* scenario({});
      yield* w.mine();
      expect(yield* w.answered(), "the send did not answer after one block").toBe("answered");
      const exit = w.outcome.value as Exit.Exit<{ level: string; nonce: bigint; transaction: string }>;
      expect(Exit.isSuccess(exit) && [exit.value.level, exit.value.nonce]).toEqual(["confirmed", 0n]);
      expect(yield* w.head(), "one block was mined").toBe(1n);
    })));

  it("it says so: the one block counts, and its level is `confirmed` at 1, with no `submitted` after it", { timeout: 120_000 }, () =>
    inScope(Effect.gen(function* () {
      const w = yield* scenario({});
      yield* w.mine();
      const seen = yield* w.reported(1);
      expect(seen, sendLevel(w.spanNames())).toBeDefined();
      expect(seen?.level).toBe("confirmed");
      expect(yield* w.answered()).toBe("answered");
      expect(w.levels().filter((l) => l.blocks >= 1).every((l) => l.level === "confirmed")).toBe(true);
    })));

  it("a world that declares depth one on the local chain does the same", { timeout: 120_000 }, () =>
    inScope(Effect.gen(function* () {
      const w = yield* scenario({ declared: 1 });
      yield* w.mine();
      const seen = yield* w.reported(1);
      expect(seen, sendLevel(w.spanNames())).toBeDefined();
      expect(seen?.level).toBe("confirmed");
      expect(yield* w.answered()).toBe("answered");
    })));
});

describe("18 depth one is for a local chain only", () => {
  it("a chain that is not local and declares no depth refuses the send as a defect naming ORTHO_WALLET_DEPTH, before anything is signed or submitted", { timeout: 120_000 }, () =>
    inScope(Effect.gen(function* () {
      const w = yield* scenario({ chainId: 1, automine: true });
      expect(yield* w.answered(), "the send on chain 1 with no declared depth neither answered nor failed").not.toBeUndefined();
      expect(w.outcome.state, "a send on a chain with no declared depth must not be answered as confirmed at depth one").toBe("failed");
      const exit = w.outcome.value as Exit.Exit<unknown, unknown>;
      expect(Exit.isFailure(exit) && String(exit.cause)).toContain("ORTHO_WALLET_DEPTH");
      expect(yield* w.head(), "nothing was submitted, so no block was mined").toBe(0n);
    })));

  it("the same chain with a declared depth sends: the declaration is what lets it", { timeout: 120_000 }, () =>
    inScope(Effect.gen(function* () {
      const w = yield* scenario({ chainId: 1, declared: 2 });
      yield* w.mine();
      expect((yield* w.reported(1))?.level, sendLevel(w.spanNames())).toBe("submitted");
      yield* w.mine();
      expect((yield* w.reported(2))?.level).toBe("confirmed");
      expect(yield* w.answered()).toBe("answered");
    })));
});

describe("18 where the depth is read from", () => {
  const read = (env: Record<string, string>) => Chain.fromHost.pipe(Effect.provide(ConfigProvider.layer(ConfigProvider.fromEnvRecord(env))), Effect.runPromise) as Promise<Declared>;
  const fails = (env: Record<string, string>) => Chain.fromHost.pipe(Effect.provide(ConfigProvider.layer(ConfigProvider.fromEnvRecord(env))), Effect.runPromiseExit);

  it("a device host declares it with ORTHO_WALLET_DEPTH", async () => {
    expect((await read({ ORTHO_WALLET_CHAIN: "eip155:11155111", ORTHO_WALLET_RPC_URL: "https://rpc.example", ORTHO_WALLET_DEPTH: "3" })).depth).toBe(3);
  });

  it("the local chain, declaring nothing, is depth 1; another chain, declaring nothing, has none (its keys still work, its send is the defect above)", async () => {
    expect((await read({ ORTHO_WALLET_CHAIN: "eip155:31337", ORTHO_WALLET_RPC_URL: "http://127.0.0.1:8545" }))).toMatchObject({ chainId: 31337, depth: 1 });
    const other = await read({ ORTHO_WALLET_CHAIN: "eip155:1" });
    expect(other).toMatchObject({ chainId: 1 });
    expect(other.depth, "a chain that is not local has no default depth").toBeUndefined();
  });

  it.each(["0", "-1", "1.5", "three"])("a depth of %j is a defect naming ORTHO_WALLET_DEPTH", async (value) => {
    const exit = await fails({ ORTHO_WALLET_CHAIN: "eip155:31337", ORTHO_WALLET_DEPTH: value });
    expect(Exit.isFailure(exit) && String(exit.cause)).toContain("ORTHO_WALLET_DEPTH");
  });

  it("`flow.ts` no longer hard-codes a depth of one", () => {
    const source = readFileSync(join(repo, "packages/wallets/src/modules/submit/internal/flow.ts"), "utf8");
    expect(source, "flow.ts still passes `depth: 1` to track").not.toMatch(/depth:\s*1\b/);
  });
});
