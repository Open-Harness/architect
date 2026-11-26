import type { Address, Hex } from "@orthograph/chain-evm/device";

/**
 * Safe 1.4.1 as Capxul deploys it: the L2 singleton, its proxy factory and MultiSend libraries, and Safe's 4337 module
 * release (v0.3.0) for `SafeModuleSetup` and `Safe4337Module`. Addresses and code hashes are read from
 * `@safe-global/safe-deployments` and `@safe-global/safe-modules-deployments` at an exact version; every address is
 * EIP-55 checksummed.
 */
export interface SafeDeploymentInfo {
  readonly version: "1.4.1";
  readonly proxyFactory: Address;
  /** SafeL2, the singleton every proxy delegates to. */
  readonly singleton: Address;
  readonly moduleSetup: Address;
  readonly safe4337Module: Address;
  readonly multiSend: Address;
  readonly multiSendCallOnly: Address;
  /** The ERC-4337 EntryPoint v0.7 the module is bound to (its `SUPPORTED_ENTRYPOINT`). */
  readonly entryPoint: Address;
  /** `SafeProxy`'s creation code, what the factory's `proxyCreationCode()` returns. */
  readonly proxyCreationCode: Hex;
  /** The keccak-256 of each deployed runtime code, as `@safe-global/safe-deployments` records it (canonical deployment). */
  readonly codeHashes: {
    readonly proxyFactory: Hex;
    readonly singleton: Hex;
    readonly multiSend: Hex;
    readonly multiSendCallOnly: Hex;
  };
}
