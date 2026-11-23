// Adapted from @prb/effect-evm@5.0.3 src/nonce/manager.ts. See LICENSE-prb-effect-evm.
import { Effect, Ref } from "effect";
import type { Address } from "viem";
import { ChainFault } from "../../faults/types.ts";
import type { Broadcast, BroadcastAttempt, NonceReservation } from "../types.ts";

type Pending = {
  readonly reservation: NonceReservation;
  readonly broadcast?: Broadcast;
};

type AccountNonces = {
  readonly finalized: number;
  readonly pending: ReadonlyMap<number, Pending>;
};

type Accounts = ReadonlyMap<string, AccountNonces>;
const keyOf = (address: Address) => address.toLowerCase();
const empty: AccountNonces = { finalized: 0, pending: new Map() };

export const makeNonceManager = Effect.gen(function* () {
  // One instance belongs to one chain. The case-folded sender separates its nonce lanes.
  const state = yield* Ref.make<Accounts>(new Map());

  const update = (all: Accounts, address: Address, account: AccountNonces): Accounts => {
    const next = new Map(all);
    next.set(keyOf(address), account);
    return next;
  };

  const reserveNext = (address: Address, startNonce: number) =>
    Ref.modify(state, (all) => {
      const account = all.get(keyOf(address)) ?? empty;
      const pending = new Map(account.pending);
      let nonce = Math.max(startNonce, account.finalized);
      while (pending.has(nonce)) nonce += 1;
      const reservation = Object.freeze({ address, nonce });
      pending.set(nonce, { reservation });
      return [reservation, update(all, address, { ...account, pending })];
    });

  /** What is reserved at a nonce and what was last broadcast there, if anything. */
  const entryAt = (address: Address, nonce: number) =>
    Ref.get(state).pipe(Effect.map((all) => {
      const entry = all.get(keyOf(address))?.pending.get(nonce);
      return entry === undefined ? undefined : { reservation: entry.reservation, broadcast: entry.broadcast };
    }));

  const release = (reservation: NonceReservation) =>
    Ref.update(state, (all) => {
      const { address, nonce } = reservation;
      const account = all.get(keyOf(address)) ?? empty;
      const entry = account.pending.get(nonce);
      if (entry?.reservation !== reservation || entry.broadcast !== undefined) return all;
      const pending = new Map(account.pending);
      pending.delete(nonce);
      return update(all, address, { ...account, pending });
    });

  const beginBroadcast = (reservation: NonceReservation, broadcast: Broadcast) =>
    Ref.modify(state, (all): readonly [BroadcastAttempt | undefined, Accounts] => {
      const { address, nonce } = reservation;
      const account = all.get(keyOf(address)) ?? empty;
      const entry = account.pending.get(nonce);
      if (entry?.reservation !== reservation || nonce < account.finalized) return [undefined, all];
      if (entry.broadcast?.hash === broadcast.hash) return [{ broadcast: entry.broadcast, fresh: false }, all];
      if (entry.broadcast?.hash !== broadcast.replaces) return [undefined, all];
      const pending = new Map(account.pending);
      const next = { ...broadcast, fromBlock: entry.broadcast?.fromBlock ?? broadcast.fromBlock };
      pending.set(nonce, { reservation, broadcast: next });
      return [
        { broadcast: next, fresh: true, ...(entry.broadcast === undefined ? {} : { previous: entry.broadcast }) },
        update(all, address, { ...account, pending }),
      ];
    }).pipe(
      Effect.flatMap((attempt) => attempt === undefined
        ? Effect.fail(new ChainFault({ kind: "nonce", message: "The nonce is no longer reserved for this transaction" }))
        : Effect.succeed(attempt)),
    );

  const rejectBroadcast = (reservation: NonceReservation, attempt: BroadcastAttempt) =>
    Ref.update(state, (all) => {
      if (!attempt.fresh) return all; // A previous attempt may already be on the chain.
      const { address, nonce } = reservation;
      const account = all.get(keyOf(address)) ?? empty;
      const entry = account.pending.get(nonce);
      if (entry?.reservation !== reservation || entry.broadcast !== attempt.broadcast) return all;
      const pending = new Map(account.pending);
      if (attempt.previous === undefined) pending.delete(nonce);
      else pending.set(nonce, { reservation, broadcast: attempt.previous });
      return update(all, address, { ...account, pending });
    });

  const pruneFinalized = (address: Address, nextNonce: number) =>
    Ref.update(state, (all) => {
      const account = all.get(keyOf(address)) ?? empty;
      if (nextNonce <= account.finalized) return all;
      const pending = new Map(account.pending);
      for (const nonce of pending.keys()) {
        if (nonce < nextNonce) pending.delete(nonce);
      }
      return update(all, address, { finalized: nextNonce, pending });
    });

  return { reserveNext, entryAt, release, beginBroadcast, rejectBroadcast, pruneFinalized };
});
