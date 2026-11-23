// Adapted from @prb/effect-evm@5.0.3 src/core/errors/{contract,tx}.ts. See LICENSE-prb-effect-evm.
import { Data } from "effect";
import type { Abi, Address, Hex } from "viem";

export type FaultKind =
  | "configuration" | "transport" | "timeout" | "nonce" | "funds"
  | "rejected" | "resource" | "revert" | "panic" | "signing"
  | "unsupported" | "event" | "reorg" | "unsimulated";

export class ChainFault extends Data.TaggedError("ChainFault")<{
  readonly kind: FaultKind;
  readonly program?: Address;
  readonly raw?: Hex;
  readonly message: string;
}> {}

export class ChainRefusal extends Data.TaggedError("ChainRefusal")<{
  readonly code: string;
  readonly name: string;
  readonly selector: Hex;
  readonly program?: Address;
  readonly args: Readonly<Record<string, unknown>>;
}> {}

export type ChainError = ChainFault | ChainRefusal;

/** The EVM projection of one wire identity in blueprint/refusals.lock, including old selectors. */
export interface RefusalLockEntry {
  readonly code: string;
  readonly name: string;
  readonly selector: Hex;
  readonly signature: string;
  readonly abi: Extract<Abi[number], { type: "error" }>;
  readonly program?: Address;
}
