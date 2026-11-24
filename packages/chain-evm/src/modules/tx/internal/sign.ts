import { Effect } from "effect";
import { keccak256, parseTransaction, recoverTransactionAddress, serializeTransaction, type Hex, type TransactionSerialized } from "viem";
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

const unreadable = () => new ChainFault({ kind: "signing", message: "The bytes are not a signed EIP-1559 or legacy transaction of this chain" });

/** The transaction a signed byte string holds and the address that signed it: how a transaction kept across a restart is taken back. */
export const readSigned = (serialized: Hex, chainId: number) => Effect.gen(function* () {
  const bytes = serialized as TransactionSerialized;
  const parsed = yield* Effect.try({ try: () => parseTransaction(bytes), catch: unreadable });
  const from = yield* Effect.tryPromise({ try: () => recoverTransactionAddress({ serializedTransaction: bytes }), catch: unreadable });
  const { nonce, gas, to, data, value } = parsed;
  if (nonce === undefined || gas === undefined || parsed.chainId !== chainId) return yield* unreadable();
  const body = { chainId, nonce, gas, ...(to == null ? {} : { to }), ...(data === undefined ? {} : { data }), ...(value === undefined ? {} : { value }) };
  if (parsed.type === "eip1559" && parsed.maxFeePerGas !== undefined && parsed.maxPriorityFeePerGas !== undefined) {
    const transaction: Transaction = Object.freeze({ ...body, type: "eip1559", maxFeePerGas: parsed.maxFeePerGas, maxPriorityFeePerGas: parsed.maxPriorityFeePerGas });
    return { transaction, from };
  }
  if (parsed.type === "legacy" && parsed.gasPrice !== undefined) {
    const transaction: Transaction = Object.freeze({ ...body, type: "legacy", gasPrice: parsed.gasPrice });
    return { transaction, from };
  }
  return yield* unreadable();
});
