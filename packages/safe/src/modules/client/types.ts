import type { Effect } from "effect";
import { Data } from "effect";
import type { Address, ChainError, ChainFault, ChainPort, Hex, Signer, TransactionReceipt } from "@orthograph/chain-evm/device";
import type { SafeTransaction } from "../safe-tx/types.ts";

/**
 * The Safe refused: a `require(…, "GS0xx")` in the Safe's code reverted with that code (`GS026`: a signature is not an
 * owner's, as when a SafeTx is replayed after its nonce was used; `GS025`: a hash not approved; `GS020`: signatures too
 * short; `GS013`: the inner call failed with no gas to refund). Every revert of the Safe's own is this, never a bare fault.
 */
export class SafeRefused extends Data.TaggedError("SafeRefused")<{
  readonly code: `GS${string}`;
  readonly safe: Address;
}> {}

/** The call data of the Safe's own functions. */
export interface SafeCallsApi {
  /** `execTransaction` of the transaction (without its nonce, which the Safe reads) and the packed signatures. */
  readonly execTransaction: (tx: SafeTransaction, signatures: Hex) => Effect.Effect<Hex, ChainFault>;
  readonly approveHash: (hash: Hex) => Effect.Effect<Hex, ChainFault>;
  readonly swapOwner: (prevOwner: Address, oldOwner: Address, newOwner: Address) => Effect.Effect<Hex, ChainFault>;
  readonly addOwnerWithThreshold: (owner: Address, threshold: bigint) => Effect.Effect<Hex, ChainFault>;
}

export interface SendInput {
  readonly safe: Address;
  readonly data: Hex;
}

export interface SafeClientApi {
  /** `getOwners()`, in the Safe's order. */
  readonly owners: (port: ChainPort, safe: Address) => Effect.Effect<ReadonlyArray<Address>, ChainError>;
  readonly threshold: (port: ChainPort, safe: Address) => Effect.Effect<bigint, ChainError>;
  readonly nonce: (port: ChainPort, safe: Address) => Effect.Effect<bigint, ChainError>;
  /**
   * Sends `data` to the Safe from `signer` (an owner or anyone else), and gives the receipt once it is mined. A Safe that
   * refuses is `SafeRefused` with its code, found before anything is signed or sent.
   */
  readonly send: (port: ChainPort, signer: Signer, input: SendInput) => Effect.Effect<TransactionReceipt, SafeRefused | ChainError>;
}
