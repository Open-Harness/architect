import { Data, type Effect } from "effect";
import type {
  Address, ChainError, ChainPort, DecodedEvent, EventSource, Signer, Submission,
} from "@orthograph/chain-evm/device";

/**
 * OpenZeppelin 5's ERC-6093 error `ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)`: the sender
 * tried to move more than it holds. Its fields are the revert's own, decoded.
 */
export class ERC20InsufficientBalance extends Data.TaggedError("ERC20InsufficientBalance")<{
  readonly sender: Address;
  readonly balance: bigint;
  readonly needed: bigint;
}> {}

/** ERC-6093's `ERC20InvalidReceiver(address receiver)`: a transfer to the zero address. */
export class ERC20InvalidReceiver extends Data.TaggedError("ERC20InvalidReceiver")<{
  readonly receiver: Address;
}> {}

/** The token's own refusals, typed. A revert the adapter does not know stays the port's `ChainError`. */
export type Erc20Refusal = ERC20InsufficientBalance | ERC20InvalidReceiver;

/** The arguments of `Transfer(address indexed from, address indexed to, uint256 value)`, typed. */
export interface TransferArgs {
  readonly from: Address;
  readonly to: Address;
  readonly value: bigint;
}

/** One mined `Transfer` log, decoded. */
export type TransferEvent = DecodedEvent & {
  readonly eventName: "Transfer";
  readonly args: TransferArgs;
};

/** One ERC-20 contract at one address, reached through a chain port. */
export interface Erc20Token {
  readonly address: Address;
  /** `balanceOf(account)`, in the token's base units (USDC: 6 decimals, so 1 USDC is `1_000_000n`). */
  readonly balanceOf: (args: { readonly account: Address }) => Effect.Effect<bigint, ChainError>;
  /** `decimals()`, read from the contract, never assumed. */
  readonly decimals: () => Effect.Effect<number, ChainError>;
  /**
   * `transfer(to, value)` from the signer: prepared, simulated, signed and sent. A refusal the simulation finds fails
   * typed and nothing is sent. It answers the submission; the caller tracks it (`ChainPort.track`).
   */
  readonly transfer: (
    args: { readonly to: Address; readonly value: bigint },
    signer: Signer,
  ) => Effect.Effect<Submission, Erc20Refusal | ChainError>;
  /** The contract's `Transfer` event from `fromBlock` on: what `ChainPort.follow` and `track` take. */
  readonly Transfer: (fromBlock: bigint) => EventSource<TransferEvent>;
}

export interface Erc20Api {
  /** The ERC-20 at `address`. Nothing is read until a call runs. */
  readonly at: (port: ChainPort, address: Address) => Erc20Token;
}
