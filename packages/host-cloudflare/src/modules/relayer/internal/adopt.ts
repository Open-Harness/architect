// What the relayer's store owns: every open row holds its own nonce reservation, and on a restart each takes it back before any call is served.
import { ChainRefusal, isDefinite } from "@orthograph/chain-evm/device";
import { Effect } from "effect";
import type { Live } from "./live.ts";
import type { Row, Store } from "./store.ts";

/** The hash a row holds while it has no transaction yet (a fill that is waiting to be sent). */
export const NO_HASH = `0x${"0".repeat(64)}` as const;

/** A row with no bytes: its nonce is held for a fill (its call was never signed, or could not be sent). */
export const unsent = (row: Row) => row.serialized === "0x";

/** Whether a failure ends its call for good. The port decides (`isDefinite`): the relayer does not classify errors itself. */
export const definite = isDefinite;

/** What a failure says, for a row's note and for nothing else: no value that was given is in it. */
export const reason = (error: unknown): string =>
  error instanceof ChainRefusal ? `refused: ${error.code} ${error.name}`
    : typeof error === "object" && error !== null && "message" in error && typeof error.message === "string" ? error.message : "the send failed";

/**
 * After a restart, before any call is served: every open row takes back the reservation of its own nonce, lowest first. A row with bytes
 * is resumed from them; a row without bytes (a fill waiting) is held. Bytes that can no longer be read turn the row into a fill, since
 * that nonce may be unused on the chain. Nothing else is swallowed: a nonce another reservation already holds means the relayer's two
 * records disagree, and that is a defect to surface.
 */
export const register = (live: Live, store: Store) => Effect.gen(function* () {
  const { port, key, held } = live;
  for (const row of store.open()) {
    const signed = unsent(row) ? undefined : yield* port.resume(row.serialized, row.fromBlock).pipe(
      Effect.catch((error) => error.kind === "signing" ? Effect.succeed(undefined) : Effect.fail(error)),
    );
    if (signed !== undefined) {
      const reservation = port.reservationOf(signed.prepared);
      if (reservation === undefined) return yield* Effect.die(new Error("a resumed transaction has no reservation"));
      held.set(row.id, { reservation, signed });
      continue;
    }
    if (!unsent(row)) store.toFill(row.id, "its signed bytes can no longer be read");
    held.set(row.id, { reservation: yield* port.hold(key.address, row.nonce) });
  }
}).pipe(Effect.orDie);
