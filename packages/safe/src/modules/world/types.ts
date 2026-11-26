import type { Effect } from "effect";
import type { ChainFault } from "@orthograph/chain-evm/device";

export interface SafeWorldApi {
  /**
   * The world starter: puts the pinned deployed code of every `SafeDeployment` contract at its canonical address on a
   * world's Anvil, with `anvil_setCode`, so a Safe can be created there as on Base. Each code is the release's, with its
   * immutables as the canonical deployment has them, and is checked against its recorded code hash before it is set.
   * Running it twice changes nothing. The EntryPoint is not put in place (`SafeDeployment.entryPoint` is only what the module is
   * bound to), and the world's own accounts are left as they were. A chain that does not answer is a `ChainFault`.
   */
  readonly install: (rpcUrl: string) => Effect.Effect<void, ChainFault>;
}
