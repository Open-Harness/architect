// Adapted from @prb/effect-evm@5.0.3 src/nonce/service.ts. See LICENSE-prb-effect-evm.
import type { Address, Hash } from "viem";

export interface NonceReservation {
  readonly address: Address;
  readonly nonce: number;
}

export interface Broadcast {
  readonly hash: Hash;
  readonly fromBlock: bigint;
  readonly replaces?: Hash;
}

export interface BroadcastAttempt {
  readonly broadcast: Broadcast;
  readonly fresh: boolean;
  readonly previous?: Broadcast;
}
