import type { Effect } from "effect";
import type { Address, ChainError, ChainPort, Signer } from "@orthograph/chain-evm/device";

export interface TestTokenOptions {
  /** The whole supply, in base units, minted to the deployer. */
  readonly supply: bigint;
}

export interface TestTokenApi {
  /** The test token's decimals: 6, like USDC. */
  readonly decimals: 6;
  /**
   * Deploy the test token into a world's chain from `signer`: an OpenZeppelin 5 ERC-20 (its ERC-6093 errors included) with
   * 6 decimals, whose whole `supply` goes to the signer. Answers the contract's address once the deployment is mined.
   */
  readonly deploy: (port: ChainPort, signer: Signer, options: TestTokenOptions) => Effect.Effect<Address, ChainError>;
}
