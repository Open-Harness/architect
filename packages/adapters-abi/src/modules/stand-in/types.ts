// stand-in: put an ABI adapter's stand-in contract into a world's chain (ST2-abi-adapters section 7). The stand-in is the
// contract itself, its compiled bytecode shipped with its source; it runs in the world's Anvil (`Stand.process`).
// Wiring the deployment into `Worlds.start` is Goal 3's (asked when ST2.04 needs it); this is the deployment itself.
import type { Effect } from "effect";
import type { Address, ChainError, ChainPort, Hex, Signer } from "@orthograph/chain-evm/device";

export interface DeployInput {
  readonly port: ChainPort;
  /** Pays for the deployment, and is the account the stand-in's constructor sees as `msg.sender`. */
  readonly signer: Signer;
  /** The stand-in's deployment bytecode, no constructor arguments. */
  readonly bytecode: Hex;
}

export interface StandInApi {
  /**
   * Deploy: prepare a creation transaction, simulate it, sign, submit, track to one block, and answer the contract's address.
   * A deployment that reverts, or whose receipt has no contract address, fails (`ChainFault`, kind `revert`).
   */
  readonly deploy: (input: DeployInput) => Effect.Effect<Address, ChainError>;
}
