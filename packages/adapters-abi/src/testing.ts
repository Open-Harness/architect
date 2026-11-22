// A world's chain for tests: a real Anvil as a process of the caller's scope (M1.31), three funded keys the world made, and a
// `ChainPort` over it. Not part of the package's build (tsconfig.build.json leaves `testing.ts` out). Written by the checks author.
import { Clock, Duration, Effect, Option, Stream, type Scope } from "effect";
import {
  Anvil, ChainFault, makeChainPort, Keys,
  type Address, type AnvilFailed, type ChainError, type ChainPort, type Hex, type Key, type RefusalLockEntry,
} from "@orthograph/chain-evm";
import { Timers } from "@orthograph/language-effect";

/** Real time for the fixture's own waits: Anvil runs in its own OS process. */
export const liveTimers = Timers.of({
  at: () => Effect.die("only Timers.sleep is used by the Anvil fixture"),
  sleep: (_owner, span) => Effect.flatMap(Clock.Clock, (clock) => clock.sleep(Duration.fromInputUnsafe(span))),
  due: () => Effect.succeed(undefined),
  fire: () => Effect.succeed([]),
  pending: Effect.succeed([]),
});

export interface TestWorld {
  readonly rpcUrl: string;
  readonly chainId: number;
  /** Three funded accounts: the first deploys the stand-in and so holds a stand-in token's supply. */
  readonly keys: ReadonlyArray<Key>;
  /** A port over the chain, its refusal lock the caller's. */
  readonly port: (refusals?: ReadonlyArray<RefusalLockEntry>) => Effect.Effect<ChainPort, ChainFault>;
  /** `eth_getTransactionCount` at the pending tag, by plain JSON-RPC: what a test reads to see that nothing was sent. */
  readonly nonceOf: (key: Key) => Effect.Effect<number>;
  readonly blockNumber: Effect.Effect<bigint>;
}

const rpc = (rpcUrl: string, method: string, params: ReadonlyArray<unknown>) =>
  Effect.promise(() =>
    fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }).then((response) => response.json() as Promise<{ readonly result: string }>)).pipe(Effect.map((body) => body.result));

/**
 * Deploy creation bytecode with the chain's own port, by hand: the checks of the other modules start from a deployed
 * contract without going through `StandInContract.deploy`, which is the module `stand-in`'s to prove.
 */
export const deployByHand = (port: ChainPort, key: Key, bytecode: Hex): Effect.Effect<Address, ChainError> =>
  Effect.gen(function* () {
    const unsigned = yield* port.prepare({ from: key.address, data: bytecode });
    yield* port.simulate(unsigned);
    const signed = yield* port.sign(unsigned, key.signer);
    const submission = yield* port.submit(signed);
    const included = yield* port.track(submission, { depth: 1 }).pipe(Stream.runHead);
    const state = Option.getOrUndefined(included);
    const address = state?._tag === "Included" ? state.receipt.contractAddress : undefined;
    return address ?? (yield* new ChainFault({ kind: "revert", message: "the fixture deployment was not included with a contract address" }));
  });

export const startWorld: Effect.Effect<TestWorld, AnvilFailed | ChainFault, Scope.Scope> = Effect.gen(function* () {
  const anvil = yield* Anvil.start({ accounts: 3 }).pipe(Effect.provideService(Timers, liveTimers));
  const keys = yield* Effect.all(anvil.accounts.map((account) => Keys.fromSecret(account.privateKey)));
  return {
    rpcUrl: anvil.rpcUrl,
    chainId: anvil.chainId,
    keys,
    port: (refusals = []) =>
      makeChainPort({ chainId: anvil.chainId, rpcUrl: anvil.rpcUrl, pollIntervalMs: 25, receiptTimeoutMs: 10_000, refusals })
        .pipe(Effect.provideService(Timers, liveTimers)),
    nonceOf: (key) => rpc(anvil.rpcUrl, "eth_getTransactionCount", [key.address, "pending"]).pipe(Effect.map((hex) => Number(BigInt(hex)))),
    blockNumber: rpc(anvil.rpcUrl, "eth_blockNumber", []).pipe(Effect.map((hex) => BigInt(hex))),
  };
});
