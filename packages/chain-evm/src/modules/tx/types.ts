// Adapted from @prb/effect-evm@5.0.3 src/tx/{manager,policy,tracker}.ts. See LICENSE-prb-effect-evm.
import type { Effect, Stream } from "effect";
import type { Address, Hash, Hex, TransactionReceipt, TransactionSerializableEIP1559, TransactionSerializableLegacy } from "viem";
import type { ChainError, ChainFault, RefusalLockEntry } from "../faults/types.ts";
import type { DecodedEvent, EventFollower, EventSource } from "../events/types.ts";

export interface Call {
  readonly from: Address;
  readonly to?: Address;
  readonly data?: Hex;
  readonly value?: bigint;
  readonly gas?: bigint;
}

type Envelope = { readonly chainId: number; readonly nonce: number; readonly gas: bigint };

export type Transaction = Readonly<Envelope & (
  | (TransactionSerializableEIP1559 & { readonly type: "eip1559"; readonly maxFeePerGas: bigint; readonly maxPriorityFeePerGas: bigint })
  | (TransactionSerializableLegacy & { readonly type: "legacy"; readonly gasPrice: bigint })
)>;

export interface Unsigned {
  readonly from: Address;
  readonly transaction: Transaction;
}

export interface Signer {
  readonly address: Address;
  readonly signTransaction: (transaction: Transaction) => Effect.Effect<Hex, ChainFault>;
}

export interface Signed {
  readonly prepared: Unsigned;
  readonly serialized: Hex;
  readonly hash: Hash;
}

export interface Submission {
  readonly hash: Hash;
  readonly from: Address;
  readonly nonce: number;
  readonly fromBlock: bigint;
  readonly to?: Address;
  readonly data?: Hex;
  readonly value?: bigint;
}

export type ConfirmationLevel = { readonly depth: number } | { readonly tag: "safe" | "finalized" };

export interface Intent<TEvent extends DecodedEvent = DecodedEvent> {
  readonly source: EventSource<TEvent>;
  /** Contract deadline in epoch seconds. A later block cannot execute the intent. */
  readonly deadline?: bigint;
  readonly matches: (event: TEvent) => boolean;
}

export type TxState<TEvent extends DecodedEvent = DecodedEvent> =
  | { readonly _tag: "Included"; readonly receipt: TransactionReceipt }
  /** Tracking a plain transfer at `{ depth }`: how many blocks count now, the including block as 1. Emitted each time the count changes. */
  | { readonly _tag: "Deepened"; readonly blocks: number; readonly receipt: TransactionReceipt }
  | { readonly _tag: "Reverted"; readonly receipt: TransactionReceipt; readonly error: ChainError }
  | { readonly _tag: "Replaced"; readonly oldHash: Hash; readonly newHash: Hash }
  | { readonly _tag: "Dropped"; readonly hash: Hash; readonly reason: "nonce-consumed" | "deadline" }
  | { readonly _tag: "Confirmed"; readonly event: TEvent }
  | { readonly _tag: "Corrected"; readonly event: TEvent; readonly wasConfirmed: boolean };

/** What the chain says about one submission right now (`ChainPort.probe`): one read, no waiting. */
export type Standing =
  | { readonly _tag: "Held" }
  /** Mined. When the same call was sent again at a higher fee and that one was mined, the receipt is its (`receipt.transactionHash`). */
  | { readonly _tag: "Included"; readonly receipt: TransactionReceipt }
  | { readonly _tag: "Reverted"; readonly receipt: TransactionReceipt }
  /** A different call from the sender used the nonce: nothing can send this one at that nonce again. */
  | { readonly _tag: "Replaced"; readonly hash: Hash }
  /** No receipt, the node no longer holds it, and the nonce is unused: it can be sent again. */
  | { readonly _tag: "Dropped" };

export interface ChainPort {
  readonly prepare: (call: Call) => Effect.Effect<Unsigned, ChainError>;
  /** An `eth_call` of the prepared transaction. `sign` and `submit` refuse a transaction that has not passed it. On failure, `release` it. */
  readonly simulate: (tx: Unsigned) => Effect.Effect<void, ChainError>;
  readonly sign: (tx: Unsigned, signer: Signer) => Effect.Effect<Signed, ChainFault>;
  readonly submit: (tx: Signed) => Effect.Effect<Submission, ChainError>;
  readonly track: <TEvent extends DecodedEvent>(
    submission: Submission,
    level: ConfirmationLevel,
    intent?: Intent<TEvent>,
  ) => Stream.Stream<TxState<TEvent>, ChainFault>;
  readonly follow: <TEvent extends DecodedEvent>(
    source: EventSource<TEvent>,
    level: ConfirmationLevel,
  ) => EventFollower<TEvent>;
  readonly replace: (tx: Signed, signer: Signer, policy: ReplacementPolicy) => Effect.Effect<Signed, ChainFault>;
  readonly release: (tx: Unsigned) => Effect.Effect<void>;
  /** Where a submission stands on the chain now. A single read: it never waits for a receipt (`track` does). */
  readonly probe: (submission: Submission) => Effect.Effect<Standing, ChainFault>;
  /**
   * Take back a transaction this sender signed and broadcast before the process restarted, from its signed bytes: the nonce is
   * reserved again and the result can be replaced like any other. Nothing is sent and nothing is simulated. Resume in nonce
   * order; a nonce already reserved, or bytes that are not a transaction this port can send, fail.
   */
  readonly resume: (serialized: Hex, fromBlock: bigint) => Effect.Effect<Signed, ChainFault>;
}

export interface ReplacementPolicy {
  readonly strategy: "speedup" | "cancel";
  readonly maxFeePerGas: bigint;
}

export interface ChainPortOptions {
  readonly chainId: number;
  readonly rpcUrl: string;
  readonly pollIntervalMs?: number;
  readonly receiptTimeoutMs?: number;
  readonly rpcTimeoutMs?: number;
  readonly refusals?: ReadonlyArray<RefusalLockEntry>;
  /** Optional trace provider for recovering data from mined reverts. */
  readonly traceRevert?: (hash: Hash) => Effect.Effect<Hex | undefined, ChainFault>;
}
