import type { Effect, Redacted } from "effect";
import type { Address, Hex } from "viem";
import type { ChainFault } from "../faults/types.ts";
import type { Signer } from "../tx/types.ts";

/** One secp256k1 key, held as a value: what signs, and who it signs as. The secret itself is not on it. */
export interface Key {
  readonly address: Address;
  /** EIP-191 `personal_sign` of a text message: 0x + 130 hex digits (r, s, v). */
  readonly signMessage: (message: string) => Effect.Effect<Hex, ChainFault>;
  /** What `ChainPort.sign` takes: signs a prepared transaction, nothing else. */
  readonly signer: Signer;
}

export interface KeysApi {
  /** A new secret key from the platform's random source. Redacted: it prints as `<redacted>`. */
  readonly generate: Effect.Effect<Redacted.Redacted<Hex>>;
  /**
   * The key a secret makes. A secret that is not `0x` and 64 hex digits (or is out of the curve's range) fails as a
   * `ChainFault` of kind `signing` whose message never holds the secret.
   */
  readonly fromSecret: (secret: Redacted.Redacted<string>) => Effect.Effect<Key, ChainFault>;
  /** Keccak-256: what Web3 Secret Storage v3 uses for its MAC. */
  readonly keccak256: (bytes: Uint8Array) => Uint8Array;
  /** Whether the text is a 20-byte address (any case; a mixed-case one must carry its checksum). */
  readonly isAddress: (text: string) => text is Address;
  /** The EIP-55 checksummed form of an address. */
  readonly checksum: (address: Address) => Address;
}
