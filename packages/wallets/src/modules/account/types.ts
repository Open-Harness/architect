import type { Brand, Option } from "effect";
import type { Address } from "@orthograph/chain-evm/device";

/** A CAIP-10 account on an EIP-155 chain: `eip155:31337:0xAb…` (K7: the wallet's values are CAIP-10, never a bare address). */
export interface Eip155Account {
  readonly chainId: number;
  readonly address: Address;
}

export interface AccountApi {
  /** `eip155:<chain id>:<address>`. */
  readonly format: (account: Eip155Account) => string;
  /**
   * A CAIP-10 account, or a bare address (the chain then comes from `chainId`), or nothing. Never throws: a Solana account,
   * a malformed address or an unknown namespace is `None`.
   */
  readonly parse: (text: string, chainId?: number) => Option.Option<Eip155Account>;
  /** `wal_` and sixteen characters of the address: the wallet's id, the same for the same key on any signer. */
  readonly idOf: (address: Address) => string & Brand.Brand<"wal">;
}
