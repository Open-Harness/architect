// The process's chain ports, one per chain and endpoint, for the life of the process: a port's nonce manager is the lane every
// send on that chain shares, whichever signer object it came from. Only a port that was made is kept; a failure stores
// nothing, so the next send tries again. Two sends that arrive before any port exists wait on one build.
import { Deferred, Effect, Exit } from "effect";
import type { ChainPort } from "@orthograph/chain-evm/device";
import type { ChainSetting } from "../types.ts";

const lanes = new Map<string, Deferred.Deferred<ChainPort>>();

const keyOf = (setting: ChainSetting) => `${setting.chainId}|${setting.rpcUrl ?? ""}`;

/** The port for a setting: the one built already, the one being built, or `make`, which this call then builds and keeps. */
export const lane = <R>(setting: ChainSetting, make: Effect.Effect<ChainPort, never, R>): Effect.Effect<ChainPort, never, R> =>
  Effect.gen(function* () {
    const key = keyOf(setting);
    const mine = yield* Deferred.make<ChainPort>();
    // One step with no wait inside, so two sends cannot both find the key free.
    const found = yield* Effect.sync(() => {
      const there = lanes.get(key);
      if (there === undefined) lanes.set(key, mine);
      return there;
    });
    if (found !== undefined) return yield* Deferred.await(found);
    return yield* make.pipe(
      Effect.onExit((exit) => (Exit.isSuccess(exit) ? Effect.void : Effect.sync(() => { lanes.delete(key); })).pipe(Effect.andThen(Deferred.done(mine, exit)))),
    );
  });
