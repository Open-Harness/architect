import type { Effect } from "effect";
import type { Address, ChainFault } from "@orthograph/chain-evm/device";

export interface ZodiacInstalled {
  /** `MODULE_PROXY_FACTORY`. */
  readonly factory: Address;
  /** `ROLES_MASTERCOPY`. */
  readonly mastercopy: Address;
}

export interface ZodiacWorldApi {
  /**
   * Put Zodiac's `ModuleProxyFactory` and the Roles 2.1.1 mastercopy (with the libraries it links) at their canonical
   * addresses on a world's chain (an Anvil at `rpcUrl`), with the code they have on every public chain. A chain that
   * already has them is left as it is.
   */
  readonly install: (rpcUrl: string) => Effect.Effect<ZodiacInstalled, ChainFault>;
}
