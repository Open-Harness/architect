import type { Hex, Signed } from "@orthograph/chain-evm/device";
import { Effect } from "effect";
import type { Relayed } from "../types.ts";
import { definite } from "./adopt.ts";
import type { Parts } from "./live.ts";

/** What a replacement may pay at most, per gas: ten times what the first transaction paid. */
const capOf = (signed: Signed) => {
  const { transaction } = signed.prepared;
  return (transaction.type === "legacy" ? transaction.gasPrice : transaction.maxFeePerGas) * 10n;
};

/**
 * Prepare (the nonce allocator hands out the next one), simulate, sign, write it down, send it. The row is stored with the signed
 * bytes before the send, so a crash cannot orphan a transaction the node may hold. The node has accepted it when this answers,
 * unless the send failed in a way that leaves that open: then the alarm looks, and sends it again if it is gone.
 *
 * A call the node refuses for good (a revert, no funds) answers its error to the caller, and its nonce is not left empty while later
 * ones are out: the row keeps the nonce, and the alarm fills it with a zero-value transfer from the relayer to itself.
 */
export const relay = (parts: Parts, call: { readonly to: Hex; readonly data: Hex }) => Effect.gen(function* () {
  const { live, store } = parts;
  const { port, key } = live;
  const prepared = yield* port.prepare({ from: key.address, to: call.to, data: call.data });
  const signed = yield* port.simulate(prepared).pipe(
    Effect.andThen(port.sign(prepared, key.signer)),
    Effect.tapError(() => port.release(prepared)),
  );
  const id = yield* Effect.sync(() => crypto.randomUUID());
  const nonce = prepared.transaction.nonce;
  store.add({ id, nonce, state: "submitting", hash: signed.hash, serialized: signed.serialized, replaces: [], fromBlock: 0n, cap: capOf(signed), fill: false, note: "" });
  live.sent.set(id, signed);
  const failed = yield* port.submit(signed).pipe(
    Effect.map((submission) => { store.sent(id, submission.fromBlock); return undefined; }),
    Effect.catch((error) => Effect.succeed(error)),
  );
  if (failed !== undefined && definite(failed)) {
    store.fillIt(id);
    // A refusal the allocator took back leaves the nonce free for the next call: take it again, so the fill is the one to use it.
    const again = yield* port.resume(signed.serialized, 0n).pipe(Effect.catch(() => Effect.succeed(undefined)));
    if (again !== undefined) live.sent.set(id, again);
    yield* parts.arm;
    return yield* Effect.fail(failed);
  }
  yield* parts.arm;
  return { id, hash: signed.hash, nonce, from: key.address } satisfies Relayed;
});
