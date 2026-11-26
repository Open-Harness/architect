import type { Effect } from "effect";
import type { ChainFault } from "@orthograph/chain-evm/device";

export interface SafeWorldApi {
  /**
   * The world starter: puts the pinned deployed code of every `SafeDeployment` contract at its canonical address on a
   * world's Anvil, with `anvil_setCode`, so a Safe can be created there as on Base. Each code is the release's, with its
   * immutables as the canonical deployment has them, and is checked against its recorded code hash before it is set.
   * Running it twice changes nothing.
   */
  readonly install: (rpcUrl: string) => Effect.Effect<void, ChainFault>;
}
