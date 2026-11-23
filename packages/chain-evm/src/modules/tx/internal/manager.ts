// Adapted from @prb/effect-evm@5.0.3 src/tx/{manager,tracker,replacement}.ts. See LICENSE-prb-effect-evm.
import { Effect, Option, Semaphore } from "effect";
import { keccak256, type Hash, type TransactionSerialized } from "viem";
import { hasMessage, isDefiniteRejection, isPendingReceipt, rpcFaultKind } from "../../faults/internal/viem-mapper.ts";
import { mapRpcError, rpcFault } from "../../faults/service.ts";
import { ChainFault, type ChainError } from "../../faults/types.ts";
import { makeNonces } from "../../nonce/service.ts";
import type { NonceReservation } from "../../nonce/types.ts";
import type { Call, ChainPort, ChainPortOptions, Submission, Transaction, Unsigned, Signed } from "../types.ts";
import { estimateFees, replacementTransaction } from "./fees.ts";
import type { Rpc } from "./rpc.ts";
import { readSigned, signTransaction } from "./sign.ts";
import { readCall } from "./read.ts";
import { simulateCall } from "./simulate.ts";

const unsimulated = () => new ChainFault({ kind: "unsimulated", message: "The transaction was not simulated before it was signed or sent" });
const unavailable = () => new ChainFault({ kind: "nonce", message: "The transaction was not prepared by this EVM port" });

export const makeTransactionManager = (rpc: Rpc, options: ChainPortOptions) =>
  Effect.gen(function* () {
    const nonces = yield* makeNonces(rpc);
    const reservations = new WeakMap<Unsigned, { readonly nonce: NonceReservation; readonly send: Semaphore.Semaphore }>();
    // Only a transaction that simulated cleanly may be signed or sent. Nothing else adds to this set.
    const simulated = new WeakSet<Unsigned>();
    const signedTransactions = new WeakMap<Signed, { readonly transaction: Transaction; readonly replaces?: Hash }>();

    const prepare: ChainPort["prepare"] = (call: Call) => Effect.gen(function* () {
      const request = {
        account: call.from,
        ...(call.to === undefined ? {} : { to: call.to }),
        ...(call.data === undefined ? {} : { data: call.data }),
        ...(call.value === undefined ? {} : { value: call.value }),
      };
      const gas = call.gas ?? (yield* rpc((client) => client.estimateGas(request)).pipe(
        Effect.catch((error) => mapRpcError(error, call.to, options.refusals)),
      ));
      const fees = yield* estimateFees(rpc);
      yield* nonces.pruneFinalized(call.from).pipe(Effect.ignore);
      const reservation = yield* nonces.reserve(call.from);
      const transaction: Transaction = Object.freeze({
        chainId: options.chainId, nonce: reservation.nonce, gas, ...fees,
        ...(request.to === undefined ? {} : { to: request.to }),
        ...(request.data === undefined ? {} : { data: request.data }),
        ...(request.value === undefined ? {} : { value: request.value }),
      });
      const result = Object.freeze({ from: call.from, transaction });
      reservations.set(result, { nonce: reservation, send: Semaphore.makeUnsafe(1) });
      return result;
    }).pipe(Effect.withSpan("chain.evm.prepare", { attributes: { chainId: options.chainId } }));

    const simulateOnce = simulateCall(rpc, options);
    const simulate: ChainPort["simulate"] = (prepared) => Effect.gen(function* () {
      if (!reservations.has(prepared)) return yield* unavailable();
      yield* simulateOnce(prepared);
      simulated.add(prepared);
    });

    const sign: ChainPort["sign"] = (prepared, signer) => Effect.gen(function* () {
      if (!reservations.has(prepared)) return yield* unavailable();
      if (!simulated.has(prepared)) return yield* unsimulated();
      const signed = yield* signTransaction(prepared, signer);
      signedTransactions.set(signed, { transaction: prepared.transaction });
      return signed;
    }).pipe(Effect.withSpan("chain.evm.sign"));

    const submit = (signed: Signed): Effect.Effect<Submission, ChainError> => Effect.gen(function* () {
      const reserved = reservations.get(signed.prepared);
      const context = signedTransactions.get(signed);
      if (reserved === undefined || context === undefined) return yield* unavailable();
      if (!simulated.has(signed.prepared)) return yield* unsimulated();
      const { transaction, replaces } = context;
      const reservation = reserved.nonce;
      return yield* reserved.send.withPermit(Effect.gen(function* () {
        // Read the starting block before broadcasting so a replacement mined during send is trackable.
        const head = yield* rpc((client) => client.getBlockNumber({ cacheTime: 0 })).pipe(Effect.mapError((error) => rpcFault(error)));
        const attempt = yield* nonces.beginBroadcast(reservation, {
          hash: signed.hash, fromBlock: head, ...(replaces === undefined ? {} : { replaces }),
        });
        const hash = yield* rpc((client) => client.sendRawTransaction({
          serializedTransaction: signed.serialized as TransactionSerialized,
        })).pipe(Effect.catch((error) => Effect.gen(function* () {
          if (hasMessage(error, /\balready known\b|\bknown transaction\b/iu)) return signed.hash;
          if (rpcFaultKind(error) === "nonce") {
            const found = yield* rpc((client) => client.getTransaction({ hash: signed.hash })).pipe(
              Effect.catch((lookupError) => isPendingReceipt(lookupError) ? Effect.succeed(undefined) : Effect.fail(rpcFault(lookupError))),
            );
            if (found?.hash === signed.hash) return signed.hash;
          }
          if (isDefiniteRejection(error)) yield* nonces.rejectBroadcast(reservation, attempt);
          return yield* mapRpcError(error, transaction.to ?? undefined, options.refusals);
        })));
        if (hash.toLowerCase() !== signed.hash.toLowerCase()) {
          return yield* new ChainFault({ kind: "transport", message: "EVM RPC returned an unexpected transaction hash" });
        }
        return {
          hash: signed.hash, from: reservation.address, nonce: reservation.nonce, fromBlock: attempt.broadcast.fromBlock,
          ...(transaction.to == null ? {} : { to: transaction.to }),
          ...(transaction.data === undefined ? {} : { data: transaction.data }),
          ...(transaction.value === undefined ? {} : { value: transaction.value }),
        };
      }));
    }).pipe(Effect.withSpan("chain.evm.submit", { attributes: { hash: signed.hash, chainId: options.chainId } }));

    const replace: ChainPort["replace"] = (signed, signer, policy) => Effect.gen(function* () {
      const original = signedTransactions.get(signed)?.transaction;
      if (original === undefined) return yield* unavailable();
      const bumped = yield* replacementTransaction(rpc, original, policy.maxFeePerGas);
      const transaction = Object.freeze(policy.strategy === "speedup"
        ? bumped
        : { ...bumped, to: signed.prepared.from, data: "0x" as const, value: 0n, gas: 21_000n });
      const next = yield* signTransaction(signed.prepared, signer, transaction);
      signedTransactions.set(next, { transaction, replaces: signed.hash });
      return next;
    }).pipe(Effect.withSpan("chain.evm.replace", { attributes: { hash: signed.hash, strategy: policy.strategy } }));

    const resume: ChainPort["resume"] = (serialized, fromBlock) => Effect.gen(function* () {
      const { transaction, from } = yield* readSigned(serialized, options.chainId);
      const reservation = yield* nonces.reserveNext(from, transaction.nonce);
      if (reservation.nonce !== transaction.nonce) {
        yield* nonces.release(reservation);
        return yield* new ChainFault({ kind: "nonce", message: "The nonce of a resumed transaction is already reserved" });
      }
      const prepared: Unsigned = Object.freeze({ from, transaction });
      const signed: Signed = Object.freeze({ prepared, serialized, hash: keccak256(serialized) });
      reservations.set(prepared, { nonce: reservation, send: Semaphore.makeUnsafe(1) });
      simulated.add(prepared);
      signedTransactions.set(signed, { transaction });
      yield* nonces.beginBroadcast(reservation, { hash: signed.hash, fromBlock });
      return signed;
    }).pipe(Effect.withSpan("chain.evm.resume", { attributes: { chainId: options.chainId } }));

    const release: ChainPort["release"] = (prepared) =>
      Effect.suspend(() => Option.fromUndefinedOr(reservations.get(prepared)?.nonce).pipe(
        Option.match({ onNone: () => Effect.void, onSome: nonces.release }),
      ));

    const read = readCall(rpc, options);

    return { prepare, simulate, read, sign, submit, replace, release, resume, nonces };
  });
