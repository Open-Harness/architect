import type { Hex, Signed } from "@orthograph/chain-evm/device";
import { Effect } from "effect";
import type { Relayed } from "../types.ts";
import type { Parts } from "./live.ts";

/** What a replacement may pay at most, per gas: ten times what the first transaction paid. */
const capOf = (signed: Signed) => {
  const { transaction } = signed.prepared;
  return (transaction.type === "legacy" ? transaction.gasPrice : transaction.maxFeePerGas) * 10n;
};

/** A send that failed in transit may still have reached the node: the relayer keeps it and lets the alarm find out. */
const uncertain = (error: unknown) =>
  typeof error === "object" && error !== null && "kind" in error && (error.kind === "transport" || error.kind === "timeout");

/**
 * Prepare (the nonce allocator hands out the next one), simulate, sign, send, and keep it. The node has accepted it when this
 * answers; whether it is mined is `status`'s to say.
 */
export const relay = (parts: Parts, call: { readonly to: Hex; readonly data: Hex }) => Effect.gen(function* () {
  const { live, store } = parts;
  const { port, key } = live;
  const prepared = yield* port.prepare({ from: key.address, to: call.to, data: call.data });
  const signed = yield* port.simulate(prepared).pipe(
    Effect.andThen(port.sign(prepared, key.signer)),
    Effect.tapError(() => port.release(prepared)),
  );
  const submission = yield* port.submit(signed).pipe(
    Effect.catch((error) => uncertain(error) ? Effect.succeed(undefined) : port.release(prepared).pipe(Effect.andThen(Effect.fail(error)))),
  );
  const id = yield* Effect.sync(() => crypto.randomUUID());
  const nonce = prepared.transaction.nonce;
  store.add({ id, nonce, state: "submitted", hash: signed.hash, serialized: signed.serialized, replaces: [], fromBlock: submission?.fromBlock ?? 0n, cap: capOf(signed) });
  live.sent.set(id, signed);
  yield* parts.arm;
  return { id, hash: signed.hash, nonce, from: key.address } satisfies Relayed;
});
