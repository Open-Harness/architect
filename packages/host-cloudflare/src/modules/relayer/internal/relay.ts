import type { Hex, Signed } from "@orthograph/chain-evm/device";
import { Effect } from "effect";
import type { Relayed } from "../types.ts";
import { definite, NO_HASH, reason } from "./adopt.ts";
import type { Parts } from "./live.ts";

/** What a replacement may pay at most, per gas: ten times what the first transaction paid. */
export const capOf = (signed: Signed) => {
  const { transaction } = signed.prepared;
  return (transaction.type === "legacy" ? transaction.gasPrice : transaction.maxFeePerGas) * 10n;
};

/**
 * The relayer's store owns its nonces. The moment `prepare` reserves one, a row is written for it (its nonce, no bytes yet), before
 * anything that can fail. A failure after that (a simulation, a signature, a send the node refuses for good) turns the row into a fill
 * row that keeps the same reservation: the alarm sends a zero-value transfer from the relayer to itself at that nonce, so the calls queued
 * behind it are not stuck. The caller still gets the error. The nonce is released only once the node's count is past it.
 *
 * The call is read on the node first, so one that would revert never takes a nonce. Its signed bytes are stored before the send, so a
 * crash cannot orphan a transaction the node may hold, and the alarm sends it if the node does not. While this call works on its row the
 * alarm leaves the row alone. A call is at-least-once: a caller that got no answer should ask `status` before it relays again.
 */
export const relay = (parts: Parts, call: { readonly to: Hex; readonly data: Hex }) => Effect.gen(function* () {
  const { live, store } = parts;
  const { port, key } = live;
  yield* port.read({ from: key.address, to: call.to, data: call.data });
  const prepared = yield* port.prepare({ from: key.address, to: call.to, data: call.data });
  const reservation = port.reservationOf(prepared);
  if (reservation === undefined) return yield* Effect.die(new Error("a prepared transaction has no reservation"));
  const nonce = prepared.transaction.nonce;
  const id = yield* Effect.sync(() => crypto.randomUUID());
  store.add({ id, nonce, state: "submitting", hash: NO_HASH, serialized: "0x", replaces: [], fromBlock: 0n, cap: 0n, fill: false, note: "" });
  live.held.set(id, { reservation });
  live.inflight.add(id);
  const giveUp = (error: unknown) => Effect.gen(function* () {
    store.toFill(id, reason(error));
    live.held.set(id, { reservation });
    return yield* Effect.fail(error);
  });
  const work = Effect.gen(function* () {
    const signed = yield* port.simulate(prepared).pipe(Effect.andThen(port.sign(prepared, key.signer)), Effect.catch(giveUp));
    store.bytes(id, signed.hash, signed.serialized, capOf(signed));
    live.held.set(id, { reservation, signed });
    const failed = yield* port.submit(signed).pipe(
      Effect.map((submission) => { store.sent(id, submission.fromBlock); return undefined; }),
      Effect.catch((error) => Effect.succeed(error)),
    );
    if (failed !== undefined && definite(failed)) return yield* giveUp(failed);
    return { id, hash: signed.hash, nonce, from: key.address } satisfies Relayed;
  });
  return yield* work.pipe(
    Effect.ensuring(Effect.sync(() => { live.inflight.delete(id); }).pipe(Effect.andThen(parts.arm))),
  );
});
