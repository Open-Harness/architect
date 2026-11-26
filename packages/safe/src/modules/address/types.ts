import type { Effect } from "effect";
import type { Address, ChainFault, Hex } from "@orthograph/chain-evm/device";

export interface PredictInput {
  readonly firstOwner: Address;
  readonly saltNonce: bigint;
}

/** A Safe's address before it is deployed: the implementation's formula (`infrastructure:P/safe-address.ts:205-206`). */
export interface SafeAddressApi {
  /**
   * The `setup` call a new Safe is created with, byte for byte the implementation's (`infrastructure:P/safe-address.ts:114-141`):
   * owners `[firstOwner]`, threshold 1, `to` = `MultiSend` with `data` = `multiSend` of one packed transaction (uint8 operation,
   * address to, uint256 value, uint256 data length, bytes data) that delegatecalls `enableModules([Safe4337Module])` on
   * `SafeModuleSetup`, the 4337 module as fallback handler, and no payment (token, amount and receiver all zero).
   */
  readonly initializer: (firstOwner: Address) => Effect.Effect<Hex, ChainFault>;
  /** `keccak256(abi.encodePacked(keccak256(initializer), saltNonce))`, as `SafeProxyFactory.createProxyWithNonce` makes it. */
  readonly salt: (initializer: Hex, saltNonce: bigint) => Hex;
  /**
   * The CREATE2 address from the factory, of that salt and the init code
   * `abi.encodePacked(proxyCreationCode, uint256(uint160(singleton)))`. EIP-55 checksummed.
   */
  readonly predict: (input: PredictInput) => Effect.Effect<Address, ChainFault>;
}
