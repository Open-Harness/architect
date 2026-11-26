import type { Effect } from "effect";
import { Data } from "effect";
import type { Address, ChainFault, Hex } from "@orthograph/chain-evm/device";

export interface PredictInput {
  /** The Safe's owners at creation, in order. Who they are is the caller's: a person's key, a bootstrap key, a founder's Safe. */
  readonly owners: ReadonlyArray<Address>;
  readonly saltNonce: bigint;
}

/** No owners: `setup` reverts on it (GS202), so no Safe could ever be deployed at such an address. */
export class NoOwners extends Data.TaggedError("NoOwners")<{}> {}

/** An owner given twice (compared without case): `setup` reverts on it (GS204). `owner` is the repeated one, checksummed. */
export class OwnersNotUnique extends Data.TaggedError("OwnersNotUnique")<{ readonly owner: Address }> {}

/** A Safe's address before it is deployed: the implementation's formula (`infrastructure:P/safe-address.ts:205-206`). */
export interface SafeAddressApi {
  /**
   * The `setup` call a new Safe is created with, byte for byte the implementation's (`infrastructure:P/safe-address.ts:114-141`):
   * the owners given, in order, threshold 1, `to` = `MultiSend` with `data` = `multiSend` of one packed transaction (uint8 operation,
   * address to, uint256 value, uint256 data length, bytes data) that delegatecalls `enableModules([Safe4337Module])` on
   * `SafeModuleSetup`, the 4337 module as fallback handler, and no payment (token, amount and receiver all zero).
   */
  readonly initializer: (owners: ReadonlyArray<Address>) => Effect.Effect<Hex, NoOwners | OwnersNotUnique | ChainFault>;
  /** `keccak256(abi.encodePacked(keccak256(initializer), saltNonce))`, as `SafeProxyFactory.createProxyWithNonce` makes it. */
  readonly salt: (initializer: Hex, saltNonce: bigint) => Hex;
  /**
   * The CREATE2 address from the factory, of that salt and the init code
   * `abi.encodePacked(proxyCreationCode, uint256(uint160(singleton)))`. EIP-55 checksummed.
   */
  readonly predict: (input: PredictInput) => Effect.Effect<Address, NoOwners | OwnersNotUnique | ChainFault>;
}
