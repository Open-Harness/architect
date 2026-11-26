import type { Effect } from "effect";
import { Data } from "effect";
import type { Address, ChainError } from "@orthograph/chain-evm/device";

/**
 * The Safe refused: a `require(…, "GS0xx")` in the Safe's code reverted with that code. For example `GS026` (a signature is
 * not an owner's, as when a SafeTx is replayed after its nonce was used), `GS025` (a hash not approved), `GS020` (signatures
 * too short), `GS013` (the inner call failed with no gas to refund), `GS031` (a call only the Safe itself may make).
 */
export class SafeRefused extends Data.TaggedError("SafeRefused")<{
  readonly code: `GS${string}`;
  readonly safe: Address;
}> {}

/**
 * Safe's reverts are `require` strings, not custom errors, so the generated `Safe` module (`src/generated/`, A1's shape)
 * leaves them as chain-evm's `ChainError`. This types them.
 */
export interface SafeRefusalApi {
  /** A revert that is `Error(string)` with exactly a Safe code (`GS` and three digits) is `SafeRefused` for that Safe; anything else comes back as it was. */
  readonly from: (safe: Address, error: ChainError) => SafeRefused | ChainError;
  /** The same, on an effect's failure: a call to `safe` whose Safe refused fails as `SafeRefused`, every other failure as it was. */
  readonly typed: (safe: Address) => <A, E, R>(effect: Effect.Effect<A, E | ChainError, R>) => Effect.Effect<A, E | ChainError | SafeRefused, R>;
}
