import { Effect } from "effect";
import { keccak256, parseTransaction, recoverTransactionAddress, serializeTransaction, type TransactionSerialized } from "viem";
import { ChainFault } from "../../faults/types.ts";
import type { Signed, Signer, Transaction, Unsigned } from "../types.ts";

const badSignature = () => new ChainFault({
  kind: "signing", message: "The signed EVM transaction differs from the prepared transaction or sender",
});

export const signTransaction = (prepared: Unsigned, signer: Signer, transaction: Transaction = prepared.transaction) =>
  Effect.gen(function* () {
    if (signer.address.toLowerCase() !== prepared.from.toLowerCase()) return yield* badSignature();
    const serialized = yield* signer.signTransaction(transaction);
    const serializedTx = serialized as TransactionSerialized;
    const matches = yield* Effect.try({
      try: () => {
        const parsed = parseTransaction(serializedTx);
        if (parsed.type !== transaction.type) return false;
        const { r: _r, s: _s, v: _v, yParity: _parity, ...payload } = parsed;
        return serializeTransaction(payload) === serializeTransaction(transaction);
      },
      catch: badSignature,
    });
    if (!matches) return yield* badSignature();
    const address = yield* Effect.tryPromise({
      try: () => recoverTransactionAddress({ serializedTransaction: serializedTx }),
      catch: badSignature,
    });
    if (address.toLowerCase() !== prepared.from.toLowerCase()) return yield* badSignature();
    return Object.freeze({ prepared, serialized, hash: keccak256(serialized) }) satisfies Signed;
  });
