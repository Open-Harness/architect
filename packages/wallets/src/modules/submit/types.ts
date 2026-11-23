import type { Effect } from "effect";
import type { Timers } from "@orthograph/language-effect";
import type { Address, ChainPort, Hash, Signer } from "@orthograph/chain-evm/device";
import type { KeyLocked, SimulationReverted } from "../../../blueprint/things/wallet/errors.js";
import type { ChainSetting } from "../chain/types.ts";

/** What a send answers: the transaction, where it got to, and the sender's nonce it used. */
export interface Sent {
  readonly transaction: Hash;
  /**
   * `confirmed`: K7 Q3's word, at the environment's level. A plain transfer has no event of its own to wait for, so the
   * intent is the transfer itself: included in a block and not reverted, at depth one, which is a local chain's level.
   */
  readonly level: "confirmed";
  readonly nonce: bigint;
}

export type SendRefused = SimulationReverted | KeyLocked;

/** A transaction a provider sent for itself: its hash, the nonce it used, and the block the chain was at just before. */
export interface Handed {
  readonly hash: Hash;
  readonly nonce: number;
  readonly fromBlock: bigint;
}

/**
 * What a provider that signs and sends in one step (an EIP-1193 `eth_sendTransaction`) is to the flow: it is given the
 * transfer once it has simulated, and answers the transaction it sent.
 */
export type Hand = (to: Address, value: bigint) => Effect.Effect<Handed, KeyLocked>;

/** The process's shared chain port for the setting (`Chain.shared`): every send on that chain goes through it, so they share its nonce lane. */
export type SharedPort = Effect.Effect<ChainPort, never, Timers>;

export interface SubmitApi {
  /**
   * A transfer from a key held here: prepare, simulate (never skipped; a transfer that fails it is refused with nothing
   * signed or sent, and its nonce handed back), sign, submit, and follow it until it is included.
   */
  readonly withKey: (setting: ChainSetting, shared: SharedPort, signer: Signer, to: Address, value: bigint) => Effect.Effect<Sent, SendRefused, Timers>;
  /**
   * The same for a provider that holds the key and sends for itself (a browser's wallet): simulated here first, so a
   * doomed transfer is refused before the person is asked to approve anything, then handed over and followed.
   */
  readonly withProvider: (setting: ChainSetting, shared: SharedPort, from: Address, to: Address, value: bigint, hand: Hand) => Effect.Effect<Sent, SendRefused, Timers>;
}
