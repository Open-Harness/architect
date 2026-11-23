// Reading the chain about what was sent: `status` for one submission, `reconcile` for all of those that may still change. The alarm
// runs `reconcile`, so a transaction the node dropped is sent again, byte for byte, whether or not anyone asks.
import { ChainFault, type Standing } from "@orthograph/chain-evm/device";
import { Effect } from "effect";
import type { Rebroadcast, RelayState, RelayStatus } from "../types.ts";
import { definite, reason, unsent } from "./adopt.ts";
import type { Parts } from "./live.ts";
import type { Kept, Row } from "./store.ts";

const shown = (state: Kept): RelayState => (state === "lost" ? "dropped" : state === "submitting" ? "submitted" : state);
const view = (row: Row, state: RelayState = shown(row.state)): RelayStatus => ({
  id: row.id, nonce: row.nonce, hash: row.hash, state, replaces: [], ...(row.note === "" ? {} : { problem: row.note }),
});

/** Where the chain says this submission's transaction stands. None when the relayer holds no transaction for it. */
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
 * The node no longer holds the transaction and its nonce is unused: send the same signed bytes again. Sending them is safe at any moment (the
 * port answers "already known" and a nonce used by this hash as success, and registers the broadcast if it never got to). A rebroadcast is
 * refused only on the node's pool checks (a balance that is short, a fee below the floor), and those can clear: so a failure of any kind keeps
 * the row's bytes and reservation, notes the reason, and leaves it for the next alarm. Only a call refused while it is being relayed (the caller
 * got the error) becomes a fill. A row stuck this way shows in `health` once it is past its deadline.
 */
const rebroadcast = (parts: Parts, row: Row) => Effect.gen(function* () {
  const { live, store } = parts;
  const held = live.held.get(row.id);
  if (held?.signed === undefined) return undefined;
  const submission = yield* live.port.submit(held.signed);
  store.sent(row.id, submission.fromBlock);
  return { id: row.id, nonce: row.nonce, hash: row.hash } satisfies Rebroadcast;
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
      store.filled(row.id, signed.hash, signed.serialized, submission?.fromBlock ?? 0n);
      return undefined;
    }
  }
});

const settle = (parts: Parts, row: Row) => Effect.gen(function* () {
  if (unsent(row)) return yield* fillNow(parts, row);
  const now = yield* standing(parts, row);
  switch (now?._tag) {
    case "Included": end(parts, row, "included"); return undefined;
    case "Reverted": end(parts, row, "reverted"); return undefined;
    case "Held":
      if (row.state !== "submitted") parts.store.setState(row.id, "submitted");
      if (row.note !== "") parts.store.note(row.id, "");
      return undefined;
    case "Replaced": end(parts, row, "lost"); return undefined; // a different call took the nonce
    case "Dropped": return yield* rebroadcast(parts, row);
    case undefined: return undefined;
  }
});

/**
 * Every submission that may still change is read from the chain, lowest nonce first, and every dropped one is sent again, the same bytes. The
 * caller holds the reconcile lock: an alarm that comes while a call is reconciling waits, then finds nothing left to send. A submission a `relay`
 * call is still working on is left to that call. One that cannot be read or sent now is left for the next time, with the reason on its row
 * (`status` shows it as `problem`). `replaced` is empty: there is no fee-bump replacement yet (`design/later.md`).
 */
export const reconcile = (parts: Parts) => Effect.gen(function* () {
  const sent: Rebroadcast[] = [];
  for (const row of parts.store.open()) {
    if (parts.live.inflight.has(row.id)) continue;
    // A row stuck on the same refusal is noted once, when it sticks: the note is written again only if the reason changes, and it is cleared when the row moves.
    const done = yield* settle(parts, row).pipe(Effect.catch((error) => Effect.sync(() => {
      if (row.note !== reason(error)) parts.store.note(row.id, reason(error));
      return undefined;
    })));
    if (done !== undefined) sent.push(done);
  }
  return { replaced: [], rebroadcast: sent };
});
