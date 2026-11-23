// The relayer: one Durable Object per relayer key (named by the chain's CAIP-2 id, `eip155:<chainId>`). It holds the key, hands out
// nonces in order, sends every call from that key, and sends a dropped one again with a higher fee. Every value is JSON.
import type { Hex } from "@orthograph/chain-evm/device";

/** What the Worker binds for it. The key is a secret binding: `0x` and 64 hex digits. It is never an argument, an answer, a log line or a stored byte. */
export interface RelayerEnv {
  readonly RELAYER_KEY?: string;
}

export interface RelayerConfig {
  readonly rpcUrl: string;
  readonly chainId: number;
  /** The alarm's period. With none, the relayer sets no alarm and replaces only when `reconcile` is called. */
  readonly pollIntervalMs?: number;
}

export interface Relayed {
  readonly id: string;
  readonly hash: Hex;
  readonly nonce: number;
  readonly from: Hex;
}

/**
 * `submitted`: the node holds it. `included`: mined, success. `reverted`: mined, failed. `dropped`: no receipt, the node no longer
 * holds it and the nonce is unused (or another call took the nonce, which nothing can undo).
 */
export type RelayState = "submitted" | "included" | "reverted" | "dropped";

export interface RelayStatus {
  readonly id: string;
  readonly nonce: number;
  /** The current transaction. */
  readonly hash: Hex;
  readonly state: RelayState;
  /** The hashes it replaced, oldest first. */
  readonly replaces: ReadonlyArray<Hex>;
}

export interface Replaced {
  readonly id: string;
  readonly nonce: number;
  readonly oldHash: Hex;
  readonly newHash: Hex;
}

/** What the Worker calls on a relayer, over Durable Object RPC. */
export interface RelayerApi {
  configure(config: RelayerConfig): Promise<{ readonly address: Hex }>;
  relay(call: { readonly to: Hex; readonly data: Hex }): Promise<Relayed>;
  status(id: string): Promise<RelayStatus>;
  reconcile(): Promise<{ readonly replaced: ReadonlyArray<Replaced> }>;
}
