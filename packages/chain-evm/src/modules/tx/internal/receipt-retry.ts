// Adapted from @prb/effect-evm@5.0.3 src/tx/internal/receipt-retry.ts. See LICENSE-prb-effect-evm.
import type { Timers } from "@orthograph/language-effect";
import { Clock, Effect } from "effect";
import { RpcDeadline } from "./rpc.ts";
import { isTransient } from "../../faults/internal/viem-mapper.ts";

/** Three transient RPC retries, with exponential backoff parked on the world's clock. */
export const retryRead = <A>(timers: typeof Timers.Service, read: Effect.Effect<A, unknown>, attempt = 0): Effect.Effect<A, unknown> =>
  Effect.catch(read, (error) => Effect.gen(function* () {
    if (attempt >= 3 || !isTransient(error)) return yield* Effect.fail(error);
    const now = yield* Clock.currentTimeMillis;
    const delay = 1_000 * 2 ** attempt;
    if (now + delay >= (yield* RpcDeadline)) return yield* Effect.fail(error);
    yield* timers.sleep("chain.evm", delay);
    return yield* retryRead(timers, read, attempt + 1);
  }));
