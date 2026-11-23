import { Data, type Effect, type Option, type Redacted } from "effect";
import type { Hex } from "@orthograph/chain-evm/device";

/** scrypt's cost: memory is 128 · n · r bytes. */
export interface Cost {
  readonly n: number;
  readonly r: number;
  readonly p: number;
}

/** Why a keystore file did not open. Neither reason ever holds the passphrase or the key. */
export class KeystoreFault extends Data.TaggedError("KeystoreFault")<{ readonly reason: "wrong-passphrase" | "malformed" }> {}

export interface KeystoreApi {
  /** geth's "standard" (n 262144, about 0.7 s and 256 MiB) and "light" (n 4096, p 6): a world uses light. */
  readonly cost: { readonly standard: Cost; readonly light: Cost };
  /** The text of a Web3 Secret Storage v3 file (scrypt, aes-128-ctr, keccak-256 MAC) holding `secret`. */
  readonly encrypt: (secret: Redacted.Redacted<Hex>, passphrase: Redacted.Redacted<string>, cost: Cost) => Effect.Effect<string>;
  /** The secret a file holds; `wrong-passphrase` when the MAC does not match, `malformed` when it is no v3 file. */
  readonly decrypt: (file: string, passphrase: Redacted.Redacted<string>) => Effect.Effect<Redacted.Redacted<Hex>, KeystoreFault>;
  /** The address a file names, lower case with no `0x`, without opening it; none when it is no v3 file. */
  readonly addressOf: (file: string) => Option.Option<string>;
}
