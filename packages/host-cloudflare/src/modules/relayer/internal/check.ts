// Reading the chain about what was sent: `status` for one submission, `reconcile` for all of those that may still change. The alarm
// runs `reconcile`, so a dropped transaction is sent again whether or not anyone asks.
import { ChainFault, type Standing } from "@orthograph/chain-evm/device";
import { Effect } from "effect";
import type { RelayState, RelayStatus, Replaced } from "../types.ts";
import { definite, reason, unsent } from "./adopt.ts";
import type { Parts } from "./live.ts";
import { capOf } from "./relay.ts";
import type { Kept, Row } from "./store.ts";

const shown = (state: Kept): RelayState => (state === "lost" ? "dropped" : state === "submitting" ? "submitted" : state);
const view = (row: Row, state: RelayState = shown(row.state)): RelayStatus => ({
  id: row.id, nonce: row.nonce, hash: row.hash, state, replaces: row.replaces, ...(row.note === "" ? {} : { problem: row.note }),
});

/** Where the chain says this submission's current transaction stands. None when the relayer holds no transaction for it. */
const standing = (parts: Parts, row: Row): Effect.Effect<Standing | undefined, ChainFault> => {
  const signed = parts.live.held.get(row.id)?.signed;
  if (signed === undefined) return Effect.succeed(undefined);
  const { from, transaction } = signed.prepared;
  return parts.live.port.probe({
    hash: row.hash, from, nonce: row.nonce, fromBlock: row.fromBlock,
    ...(transaction.to == null ? {} : { to: transaction.to }),
    ...(transaction.data === undefined ? {} : { data: transaction.data }),
    ...(transaction.value === undefined ? {} : { value: transaction.value }),
  });
};

/** A submission that can no longer change: it is written down, and its reservation is left to the allocator, which lets it go once the node's count has passed the nonce. */
const end = (parts: Parts, row: Row, state: Kept) => {
  parts.store.setState(row.id, state);
  parts.live.held.delete(row.id);
};

/** What a submission is now, read from the chain. Only a mined answer is written down: it cannot change back. */
export const status = (parts: Parts, id: string) => Effect.gen(function* () {
  const row = parts.store.find(id);
  if (row === undefined) return yield* new ChainFault({ kind: "configuration", message: "this relayer has sent no submission with that id" });
  if (row.state === "included" || row.state === "reverted" || row.state === "lost") return view(row);
  const now = yield* standing(parts, row);
  switch (now?._tag) {
    case "Included": end(parts, row, "included"); return view(row, "included");
    case "Reverted": end(parts, row, "reverted"); return view(row, "reverted");
    case "Dropped": return view(row, "dropped");
    case "Replaced": return view(row, "dropped");
    default: return view(parts.store.find(id) ?? row);
  }
});

/**
 * Send the call again at the same nonce, paying more, and keep the new transaction as the submission's current one. A row that is a fill
 * sends the zero-value transfer to the relayer itself instead. When the send fails in transit the new transaction is recorded all the
 * same: the allocator now expects it, and the next look at the node finds out whether it arrived.
 */
const resend = (parts: Parts, row: Row) => Effect.gen(function* () {
  const { live, store } = parts;
  const held = live.held.get(row.id);
  if (held?.signed === undefined) return undefined;
  const next = yield* live.port.replace(held.signed, live.key.signer, { strategy: row.fill ? "cancel" : "speedup", maxFeePerGas: row.cap }).pipe(
    Effect.catch((error) => error.kind === "nonce"
      // Nothing is broadcast at this nonce (its send was refused and the port let it go): there is nothing to replace, so the row fills it.
      ? Effect.sync(() => { store.toFill(row.id, "nothing is broadcast at its nonce"); live.held.set(row.id, { reservation: held.reservation }); return undefined; })
      : Effect.fail(error)),
  );
  if (next === undefined) return undefined;
  const submission = yield* live.port.submit(next).pipe(Effect.catch((error) => definite(error) ? Effect.fail(error) : Effect.succeed(undefined)));
  live.held.set(row.id, { reservation: held.reservation, signed: next });
  store.replace(row, next.hash, next.serialized, submission?.fromBlock ?? row.fromBlock);
  return { id: row.id, nonce: row.nonce, oldHash: row.hash, newHash: next.hash } satisfies Replaced;
});

/**
 * A row kept only for its nonce (its call could not be sent): when the node shows the nonce unused, send a zero-value transfer from the
 * relayer to itself at it, from the row's own reservation, so what is queued behind it goes through. A nonce someone else used needs
 * nothing. A fill the node refuses keeps the reservation (the port keeps it on a rejection), so the next alarm tries again.
 */
const fillNow = (parts: Parts, row: Row) => Effect.gen(function* () {
  const { live, store } = parts;
  const { port, key } = live;
  const held = live.held.get(row.id);
  if (held === undefined) return undefined;
  const now = yield* port.probe({ hash: row.hash, from: key.address, nonce: row.nonce, fromBlock: row.fromBlock, to: key.address, data: "0x", value: 0n });
  switch (now._tag) {
    case "Included": end(parts, row, "included"); return undefined;
    case "Reverted": end(parts, row, "reverted"); return undefined;
    case "Replaced": end(parts, row, "lost"); return undefined;
    case "Held": return undefined;
    case "Dropped": {
      const signed = yield* port.fill(held.reservation, key.signer);
      const submission = yield* port.submit(signed).pipe(Effect.catch((error) => definite(error) ? Effect.fail(error) : Effect.succeed(undefined)));
      live.held.set(row.id, { reservation: held.reservation, signed });
      store.filled(row.id, signed.hash, signed.serialized, submission?.fromBlock ?? 0n, capOf(signed));
      return undefined;
    }
  }
});

const settle = (parts: Parts, row: Row) => Effect.gen(function* () {
  if (unsent(row)) return yield* fillNow(parts, row);
  const now = yield* standing(parts, row);
  switch (now?._tag) {
    case "Included": case "Reverted": {
      // A replacement the relayer sent but did not get to write down is the one that was mined: it becomes the current one.
      const mined = now.receipt.transactionHash;
      if (mined !== row.hash) parts.store.replace(row, mined, row.serialized, row.fromBlock);
      end(parts, row, now._tag === "Included" ? "included" : "reverted");
      return undefined;
    }
    case "Held":
      if (row.state !== "submitted") parts.store.setState(row.id, "submitted");
      if (row.note !== "") parts.store.note(row.id, "");
      return undefined;
    case "Replaced": end(parts, row, "lost"); return undefined; // a different call took the nonce
    case "Dropped": return yield* resend(parts, row);
    case undefined: return undefined;
  }
});

/**
 * Every submission that may still change is read from the chain, lowest nonce first, and every dropped one is sent again. One at a
 * time (the caller holds the reconcile lock): an alarm that comes while a call is reconciling waits, then finds nothing left to replace. A submission a `relay`
 * call is still working on is left to that call. One that cannot be read or sent now is left for the next time, with the reason on its
 * row (`status` shows it as `problem`).
 */
export const reconcile = (parts: Parts) => Effect.gen(function* () {
  const replaced: Replaced[] = [];
  for (const row of parts.store.open()) {
    if (parts.live.inflight.has(row.id)) continue;
    const done = yield* settle(parts, row).pipe(Effect.catch((error) => Effect.sync(() => { parts.store.note(row.id, reason(error)); return undefined; })));
    if (done !== undefined && !row.fill) replaced.push(done);
  }
  return { replaced };
});
