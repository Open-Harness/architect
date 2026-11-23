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
 * One rule for every failure once a nonce is reserved (a simulation, a signature, a send the node refuses for good): the nonce is kept,
 * not given back, and a row at that nonce waits for the alarm to fill it with a zero-value transfer from the relayer to itself, so
 * the calls queued behind it are not stuck. The caller still gets the error.
 */
const keepNonce = (parts: Parts, nonce: number, error: unknown, existing: string | undefined) => Effect.gen(function* () {
  const { store, live } = parts;
  if (existing !== undefined) store.toFill(existing, reason(error));
  else {
    const id = yield* Effect.sync(() => crypto.randomUUID());
    store.add({ id, nonce, state: "submitting", hash: NO_HASH, serialized: "0x", replaces: [], fromBlock: 0n, cap: 0n, fill: true, note: reason(error) });
  }
  // A refusal the allocator took back leaves the nonce free for the next call: take it again, so the fill is the one to use it.
  yield* live.port.hold(live.key.address, nonce).pipe(Effect.ignore);
  yield* parts.arm;
  return yield* Effect.fail(error);
});

/**
 * Check the call before anything is reserved (a call that would revert never holds a nonce), then prepare (the nonce allocator hands
 * out the next one), simulate, sign, write it down, send it. The row is stored with the signed bytes before the send, so a crash cannot
 * orphan a transaction the node may hold, and the alarm sends it if the node does not. The node has accepted it when this answers,
 * unless the send failed in a way that leaves that open: then the alarm looks, and sends it again if it is gone.
 *
 * A call is at-least-once: a caller that got no answer should ask `status` before it relays again.
 */
export const relay = (parts: Parts, call: { readonly to: Hex; readonly data: Hex }) => Effect.gen(function* () {
  const { live, store } = parts;
  const { port, key } = live;
  yield* port.read({ from: key.address, to: call.to, data: call.data });
  const prepared = yield* port.prepare({ from: key.address, to: call.to, data: call.data });
  const nonce = prepared.transaction.nonce;
  const signed = yield* port.simulate(prepared).pipe(
    Effect.andThen(port.sign(prepared, key.signer)),
    Effect.catch((error) => keepNonce(parts, nonce, error, undefined)),
  );
  const id = yield* Effect.sync(() => crypto.randomUUID());
  store.add({ id, nonce, state: "submitting", hash: signed.hash, serialized: signed.serialized, replaces: [], fromBlock: 0n, cap: capOf(signed), fill: false, note: "" });
  live.sent.set(id, signed);
  const failed = yield* port.submit(signed).pipe(
    Effect.map((submission) => { store.sent(id, submission.fromBlock); return undefined; }),
    Effect.catch((error) => Effect.succeed(error)),
  );
  if (failed !== undefined && definite(failed)) {
    live.sent.delete(id);
    return yield* keepNonce(parts, nonce, failed, id);
  }
  yield* parts.arm;
  return { id, hash: signed.hash, nonce, from: key.address } satisfies Relayed;
});
