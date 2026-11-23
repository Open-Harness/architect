import { Clock, Effect } from "effect";
import { Records, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/input/verbs/requeue.ts";
import { Input } from "../../blueprint/things/input/thing.ts";

/** The wait before an Input is routed again: 5 seconds, doubled with each refusal, at most 5 minutes. */
export const backoff = (refusals: bigint): bigint => {
  const wait = 5_000n << (refusals > 0n ? refusals - 1n : 0n);
  return wait > 300_000n ? 300_000n : wait;
};

/** Put a refused or failed Input back to waiting (the machine refuses any other state), counting the refusal and saying when it may be routed again. */
const requeue: Handler<typeof declaration, Records> = ({ input }, { subject, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const refusals = ((subject?.["refusals"] as bigint | undefined) ?? 0n) + 1n;
    yield* records.update(Input, input, { refusals, retryAt: BigInt(yield* Clock.currentTimeMillis) + backoff(refusals) });
    yield* move();
    return {};
  });

export default requeue;
