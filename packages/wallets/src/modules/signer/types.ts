import type { Effect, Redacted } from "effect";
import type { Timers } from "@orthograph/language-effect";
import type { Address, Hex } from "@orthograph/chain-evm/device";
import type { KeyLocked, NoSuchKey } from "../../../blueprint/things/wallet/errors.js";
import type { ChainSetting } from "../chain/types.ts";
import type { SendRefused, Sent } from "../submit/types.ts";

/** Where a key lives (K7 F5: each wallet declares it): on the person's machine, in their browser's wallet, in a server's key store, or in a world. */
export type SignerName = "node" | "browser" | "keystore" | "world";

export const SIGNER_NAMES: ReadonlyArray<SignerName> = ["node", "browser", "keystore", "world"];

/** A key a signer keeps, by the label it was given. */
export interface Held {
  readonly label: string;
  readonly address: Address;
}

/**
 * One signer on one host (K7: a `Signer` per host). Every operation of the wallet is asked of a signer by name; the host
 * decides which signers it has. None of them ever gives a secret back.
 */
export interface Signer {
  readonly name: SignerName;
  /** The chain this signer's accounts are on: what the CAIP-10 values it answers say. */
  readonly chain: ChainSetting;
  /** A new key under `label`; one that already exists under it is answered as it is, never replaced. */
  readonly create: (label: string) => Effect.Effect<Held, KeyLocked>;
  /** A key from `source` under `label`: a secret key, or for a browser the account its wallet holds. */
  readonly import: (label: string, source: Redacted.Redacted<string>) => Effect.Effect<Held, KeyLocked>;
  readonly keys: Effect.Effect<ReadonlyArray<Held>, KeyLocked>;
  /** An EIP-191 signature, `0x` and 130 hex digits. */
  readonly sign: (label: string, message: string) => Effect.Effect<Hex, KeyLocked | NoSuchKey>;
  /** The transfer, through the whole lifecycle, signed by the key of this label. */
  readonly send: (label: string, to: Address, value: bigint) => Effect.Effect<Sent, SendRefused | NoSuchKey, Timers>;
}

/** The place a key-holding signer keeps its keys: memory, an encrypted file, a server's store. */
export interface Keyring {
  readonly held: Effect.Effect<ReadonlyArray<Held>, KeyLocked>;
  readonly put: (label: string, secret: Redacted.Redacted<Hex>) => Effect.Effect<Held, KeyLocked>;
  /** The secret under `label`, to sign with at once and not keep. */
  readonly open: (label: string) => Effect.Effect<Redacted.Redacted<Hex>, KeyLocked | NoSuchKey>;
}

/** The labels a browser keeps for the accounts its wallet holds: the wallet has no names of its own. */
export interface LabelBook {
  readonly read: Effect.Effect<Readonly<Record<string, string>>>;
  readonly write: (book: Readonly<Record<string, string>>) => Effect.Effect<void>;
}

/** An EIP-1193 provider (`window.ethereum`): all a browser's wallet is. */
export interface Eip1193 {
  readonly request: (args: { readonly method: string; readonly params?: ReadonlyArray<unknown> }) => Promise<unknown>;
}

export interface SignersApi {
  /** A signer for keys held in a `Keyring`. */
  readonly keyed: (name: SignerName, chain: ChainSetting, keyring: Keyring) => Signer;
  /** A signer for keys a browser's wallet holds, reached through its EIP-1193 provider. */
  readonly provided: (name: SignerName, chain: ChainSetting, provider: Eip1193, labels: LabelBook) => Signer;
  /** A signer a host does not have: every request is refused as `KeyLocked`, and says why in a log. */
  readonly absent: (name: SignerName, chain: ChainSetting, why: string) => Signer;
  /** Keys in memory, for the lifetime of the process holding the map: a server's key store in a world, a world's test wallets. */
  readonly memory: (store: Map<string, { readonly secret: Redacted.Redacted<Hex>; readonly address: Address }>) => Keyring;
  /** Labels in memory. */
  readonly labelsInMemory: (book: Map<string, string>) => LabelBook;
}
