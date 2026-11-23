import type { Timers } from "@orthograph/language-effect";
import { Clock, Context, Effect, Option } from "effect";
import { createPublicClient, http, type PublicClient } from "viem";
import { ChainFault } from "../../faults/types.ts";

export type Rpc = <A>(read: (client: PublicClient) => Promise<A>) => Effect.Effect<A, unknown>;

export const RpcDeadline = Context.Reference("@orthograph/chain-evm/RpcDeadline", { defaultValue: () => Infinity });
const rpcTimeout = () => new ChainFault({ kind: "timeout", message: "The EVM RPC request exceeded its deadline" });

export const withinRpcDeadline = <A, E>(
  timers: typeof Timers.Service, timeout: number, owner: string, request: Effect.Effect<A, E>,
): Effect.Effect<A, E | ChainFault> => Effect.gen(function* () {
  const now = yield* Clock.currentTimeMillis;
  const deadline = yield* RpcDeadline;
  const remaining = Math.min(timeout, deadline - now);
  if (remaining <= 0) return yield* rpcTimeout();
  if (timers.within !== undefined) {
    const result = yield* timers.within(owner, remaining, request);
    return yield* Option.match(result, { onSome: Effect.succeed, onNone: () => Effect.fail(rpcTimeout()) });
  }
  return yield* Effect.raceFirst(request, timers.sleep(owner, remaining).pipe(Effect.andThen(Effect.fail(rpcTimeout()))));
});

export const makeRpc = (url: string, timers: typeof Timers.Service, timeout: number): Rpc => (read) =>
  withinRpcDeadline(timers, timeout, "chain.evm.rpc", Effect.tryPromise({
    try: (signal) => read(createPublicClient({
      transport: http(url, { retryCount: 0, timeout: 0, fetchOptions: { signal } }),
      cacheTime: 0,
    })),
    catch: (error) => error,
  }));
