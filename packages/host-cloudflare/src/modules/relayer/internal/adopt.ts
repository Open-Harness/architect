// Taking back what the store kept: the signed transaction of a submission the relayer has no live copy of (after a restart, or a
// first attempt that failed), so the port can reserve its nonce and replace it.
import { ChainRefusal, type Signed } from "@orthograph/chain-evm/device";
import { Effect } from "effect";
import type { Live } from "./live.ts";
import type { Row, Store } from "./store.ts";

const DEFINITE = new Set(["funds", "rejected", "revert", "panic", "signing", "configuration", "unsupported"]);

/**
 * A failure that sending again cannot cure: the call itself is refused (a revert, no funds). Anything else, a transport error, a
 * timeout, or a fault the node did not explain, may have left the transaction on the node or may be gone tomorrow, so the alarm
 * looks again.
 */
export const definite = (error: unknown): boolean =>
  error instanceof ChainRefusal || (typeof error === "object" && error !== null && "kind" in error && typeof error.kind === "string" && DEFINITE.has(error.kind));

/** What a failure says, for a row's note and for nothing else: no value that was given is in it. */
export const reason = (error: unknown): string =>
  error instanceof ChainRefusal ? `refused: ${error.code} ${error.name}`
    : typeof error === "object" && error !== null && "message" in error && typeof error.message === "string" ? error.message : "the send failed";

/**
 * The live signed transaction for a row, taking it back from the store's bytes when there is none. Bytes that can no longer be read
 * end the row (`lost`, answered as `dropped`), and its nonce is held so no new call is given it until the node's count has passed it.
 * Another failure (the nonce is reserved by something else) leaves the row for the next look.
 */
export const adopt = (live: Live, store: Store, row: Row): Effect.Effect<Signed | undefined> => Effect.gen(function* () {
  const held = live.sent.get(row.id);
  if (held !== undefined) return held;
  const signed = yield* live.port.resume(row.serialized, row.fromBlock).pipe(Effect.catch((error) => Effect.gen(function* () {
    if (error.kind === "signing") {
      yield* live.port.hold(live.key.address, row.nonce).pipe(Effect.ignore);
      store.setState(row.id, "lost");
      store.note(row.id, "its signed bytes can no longer be read");
    }
    return undefined;
  })));
  if (signed !== undefined) live.sent.set(row.id, signed);
  return signed;
});
