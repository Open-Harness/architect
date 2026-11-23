// What the relayer builds once it has its configuration and its key: the chain port, the key, and the signed transaction it holds
// for each submission that may still change (the port replaces from these). Built again after a restart from what the store kept.
import { ChainFault, Keys, makeChainPort, type ChainError, type ChainPort, type Key, type Signed } from "@orthograph/chain-evm/device";
import { Effect, Redacted, type Semaphore } from "effect";
import type { RelayerConfig } from "../types.ts";
import type { Store } from "./store.ts";

export interface Live {
  readonly key: Key;
  readonly port: ChainPort;
  /** Submission id to the transaction that is current for it. Every open submission is here, so its nonce stays reserved. */
  readonly sent: Map<string, Signed>;
}

/** What each piece of the relayer's work is given: the live parts, the store, the lock `reconcile` takes, and the way to ask for the next alarm. */
export interface Parts {
  readonly live: Live;
  readonly store: Store;
  readonly lock: Semaphore.Semaphore;
  readonly arm: Effect.Effect<void>;
}

/** Fail with the message a caller may see: what went wrong, never a value that was given. */
export const describe = (error: unknown): string => {
  if (error instanceof ChainFault) return `${error.kind}: ${error.message}`;
  if (typeof error === "object" && error !== null && "_tag" in error && error._tag === "ChainRefusal") {
    const refusal = error as Extract<ChainError, { _tag: "ChainRefusal" }>;
    return `refused: ${refusal.code} ${refusal.name}`;
  }
  return error instanceof Error ? error.message : "the relayer failed";
};

export const startLive = (config: RelayerConfig, secret: string | undefined, store: Store) =>
  Effect.gen(function* () {
    if (secret === undefined || secret === "") return yield* new ChainFault({ kind: "configuration", message: "the relayer has no key: bind RELAYER_KEY" });
    const key = yield* Keys.fromSecret(Redacted.make(secret));
    const port = yield* makeChainPort({ chainId: config.chainId, rpcUrl: config.rpcUrl, rpcTimeoutMs: 30_000 });
    const sent = new Map<string, Signed>();
    // Lowest nonce first: each one takes its own nonce back, so a new call can never be handed a nonce that a held one is using.
    for (const row of store.open()) {
      const signed = yield* port.resume(row.serialized, row.fromBlock).pipe(Effect.catch(() => Effect.succeed(undefined)));
      if (signed !== undefined) sent.set(row.id, signed);
    }
    return { key, port, sent } satisfies Live;
  });
