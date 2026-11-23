import type { Effect, Semaphore } from "effect";
import type { Timers } from "@orthograph/language-effect";
import type { Address, ChainPort } from "@orthograph/chain-evm/device";

/** The chain a wallet's accounts are on and, to send, where it answers. */
export interface ChainSetting {
  /** The EIP-155 chain id: the `31337` of `eip155:31337`. */
  readonly chainId: number;
  /** An HTTP(S) JSON-RPC endpoint. Without one a wallet makes keys and signs but cannot send. */
  readonly rpcUrl: string | undefined;
  /**
   * How many blocks count before a send is `confirmed`, the including block as 1 (K7 F2, M1.38). Declared with
   * `ORTHO_WALLET_DEPTH` (a whole number of at least 1) or, in a world, `chain.depth`. A local chain (id 31337) that
   * declares none is 1; any other chain has none, and a send on it is a defect naming the variable.
   */
  readonly depth: number | undefined;
}

export interface ChainApi {
  /**
   * The setting the host gives: `ORTHO_WALLET_CHAIN` (a CAIP-2 id, default `eip155:1`), `ORTHO_WALLET_RPC_URL` and
   * `ORTHO_WALLET_DEPTH`, read through Effect's config provider (the process environment on a CLI; a browser supplies
   * its own provider). A malformed chain id or a depth that is not a whole number of at least 1 is a defect that names
   * the variable.
   */
  readonly fromHost: Effect.Effect<ChainSetting>;
  /** The depth a chain has: the one declared, else 1 for the local chain (id 31337), else none. */
  readonly depthOf: (chainId: number, declared: number | undefined) => number | undefined;
  /**
   * The one thing a process shares between sends: a lock for an account on a chain and endpoint, the same lock whichever
   * signer a send came from. A keyed send holds it from `prepare` until the node has accepted the broadcast, so the next
   * send's port reads a nonce that counts it. No nonce state is kept: every send makes its own port from `port`.
   */
  readonly lock: (setting: ChainSetting, from: Address) => Effect.Effect<Semaphore.Semaphore>;
  /** The chain port for a setting. An unreachable endpoint or another chain id is a defect that says so; no key is in it. */
  readonly port: (setting: ChainSetting) => Effect.Effect<ChainPort, never, Timers>;
}
