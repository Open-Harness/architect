// Reading the chain about what was sent: `status` for one submission, `reconcile` for all of those that may still change. The alarm
// runs `reconcile`, so a dropped transaction is sent again whether or not anyone asks.
import { ChainFault, type Standing } from "@orthograph/chain-evm/device";
import { Effect } from "effect";
import type { RelayState, RelayStatus, Replaced } from "../types.ts";
import type { Parts } from "./live.ts";
import type { Kept, Row } from "./store.ts";

const shown = (state: Kept): RelayState => (state === "lost" ? "dropped" : state);
const view = (row: Row, state: RelayState = shown(row.state)): RelayStatus => ({ id: row.id, nonce: row.nonce, hash: row.hash, state, replaces: row.replaces });

/** Where the chain says this submission's current transaction stands. None when the relayer no longer holds what it needs to ask. */
const standing = (parts: Parts, row: Row): Effect.Effect<Standing | undefined, ChainFault> => {
  const signed = parts.live.sent.get(row.id);
  if (signed === undefined) return Effect.succeed(undefined);
  const { from, transaction } = signed.prepared;
  return parts.live.port.probe({
    hash: row.hash, from, nonce: row.nonce, fromBlock: row.fromBlock,
    ...(transaction.to == null ? {} : { to: transaction.to }),
    ...(transaction.data === undefined ? {} : { data: transaction.data }),
    ...(transaction.value === undefined ? {} : { value: transaction.value }),
  });
};

/** What a submission is now, read from the chain. Only a mined answer is written down: it cannot change back. */
export const status = (parts: Parts, id: string) => Effect.gen(function* () {
  const row = parts.store.find(id);
  if (row === undefined) return yield* new ChainFault({ kind: "configuration", message: "this relayer has sent no submission with that id" });
  if (row.state === "included" || row.state === "reverted" || row.state === "lost") return view(row);
  const now = yield* standing(parts, row);
  switch (now?._tag) {
    case "Included": parts.store.setState(id, "included"); return view(row, "included");
    case "Reverted": parts.store.setState(id, "reverted"); return view(row, "reverted");
    case "Dropped": return view(row, "dropped");
    case "Replaced": return view(row, "dropped");
    default: return view(row, "submitted");
  }
});

/** Send the same call again at the same nonce, paying more, and keep the new transaction as the submission's current one. */
const resend = (parts: Parts, row: Row) => Effect.gen(function* () {
  const { live, store } = parts;
  const held = live.sent.get(row.id);
  const signed = held ?? (yield* live.port.resume(row.serialized, row.fromBlock));
  const next = yield* live.port.replace(signed, live.key.signer, { strategy: "speedup", maxFeePerGas: row.cap });
  const submission = yield* live.port.submit(next);
  live.sent.set(row.id, next);
  store.replace(row, next.hash, next.serialized, submission.fromBlock);
  return { id: row.id, nonce: row.nonce, oldHash: row.hash, newHash: next.hash } satisfies Replaced;
});

const settle = (parts: Parts, row: Row) => Effect.gen(function* () {
  const now = yield* standing(parts, row);
  switch (now?._tag) {
    case "Included": case "Reverted": {
      // A replacement the relayer sent but did not get to write down is the one that was mined: it becomes the current one.
      const mined = now.receipt.transactionHash;
      if (mined !== row.hash) parts.store.replace(row, mined, row.serialized, row.fromBlock);
      parts.store.setState(row.id, now._tag === "Included" ? "included" : "reverted");
      return undefined;
    }
    case "Held": if (row.state !== "submitted") parts.store.setState(row.id, "submitted"); return undefined;
    case "Replaced": parts.store.setState(row.id, "lost"); return undefined; // a different call took the nonce
    case "Dropped": return yield* resend(parts, row);
    case undefined: return undefined;
  }
});

/**
 * Every submission that may still change is read from the chain, lowest nonce first, and every dropped one is sent again. One at a
 * time (the lock): an alarm that comes while a call is reconciling waits, then finds nothing left to replace. A submission that
 * cannot be read or sent now is left for the next time.
 */
export const reconcile = (parts: Parts) => parts.lock.withPermit(Effect.gen(function* () {
  const replaced: Replaced[] = [];
  for (const row of parts.store.open()) {
    const done = yield* settle(parts, row).pipe(Effect.catch(() => Effect.succeed(undefined)));
    if (done !== undefined) replaced.push(done);
  }
  return { replaced };
}));
