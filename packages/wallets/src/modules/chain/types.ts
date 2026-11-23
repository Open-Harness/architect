import type { Effect } from "effect";
import type { Timers } from "@orthograph/language-effect";
import type { ChainPort } from "@orthograph/chain-evm/device";

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
  /** The chain port for a setting. An unreachable endpoint or another chain id is a defect that says so; no key is in it. */
  readonly port: (setting: ChainSetting) => Effect.Effect<ChainPort, never, Timers>;
  /**
   * The port every send on this chain and endpoint shares, kept for the life of the process and keyed by chain id and
   * RPC URL: its nonce manager is the one lane, so overlapping sends from one account take distinct nonces, whichever
   * signer object each came from. Read and filled when the effect runs; nothing runs at construction. Only a port that
   * was made is kept: a failure (no endpoint, an unusable chain) is that send's defect and the next send tries again.
   * Sends that arrive before any port exists wait on one build.
   */
  readonly shared: (setting: ChainSetting) => Effect.Effect<ChainPort, never, Timers>;
}
