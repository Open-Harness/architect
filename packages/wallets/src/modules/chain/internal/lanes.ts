// The only state a process shares between sends: one lock per account on a chain and endpoint. No port, nonce or reservation
// is kept here: each send makes its own port, which reads the pending nonce from the chain, so nothing can drift from it.
import { Effect, Semaphore } from "effect";
import type { Address } from "@orthograph/chain-evm/device";
import type { ChainSetting } from "../types.ts";

const locks = new Map<string, Semaphore.Semaphore>();

/** The lock for `from` on the setting's chain and endpoint, made on the first ask; looked up or made in one step. */
export const lock = (setting: ChainSetting, from: Address): Effect.Effect<Semaphore.Semaphore> =>
  Effect.sync(() => {
    const key = `${setting.chainId}|${setting.rpcUrl ?? ""}|${from.toLowerCase()}`;
    const found = locks.get(key);
    if (found !== undefined) return found;
    const made = Semaphore.makeUnsafe(1);
    locks.set(key, made);
    return made;
  });
