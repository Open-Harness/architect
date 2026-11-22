// conformance: for a contract, the ABI against the deployed code (ST2-abi-adapters section 8). It runs every call the adapter
// declares against a deployed contract and says where the two disagree. The cloud pass runs the same against the real
// contract at its address; that is later (no network now).
import type { Effect } from "effect";
import type { ChainFault } from "@orthograph/chain-evm/device";
import type { ContractChain, ErrorBinding } from "../contract/types.ts";
import type { AbiItem } from "../generate/types.ts";

export interface ConformanceInput {
  readonly abi: ReadonlyArray<AbiItem>;
  readonly errors: ReadonlyArray<ErrorBinding>;
}

/** What went wrong with one item, in a word a test can match on. */
export type DisagreementKind =
  /** A read answered with no data, or a write reverted with no data: the code has no such selector. */
  | "no-such-function"
  /** A revert by an error whose selector the ABI does not declare. */
  | "undeclared-revert"
  /** A read answered with data that does not decode as the declared outputs. */
  | "bad-answer"
  /** No write conformance ran emitted the declared event. */
  | "event-not-emitted"
  /** A log of the declared event's topic that does not decode as the declared arguments. */
  | "event-undecodable";

export interface Disagreement {
  /** `function approve`, `event Approval`: the ABI item, by kind and name. */
  readonly item: string;
  readonly kind: DisagreementKind;
  /** A sentence: what was asked and what came back. Holds no key. */
  readonly detail: string;
}

export interface ConformanceReport {
  /** Every item that agrees, `function balanceOf`, `event Transfer`, sorted. Errors are not listed: they are judged through the calls that raise them. */
  readonly agrees: ReadonlyArray<string>;
  /** Sorted by item. Empty when the contract agrees with the ABI. */
  readonly disagreements: ReadonlyArray<Disagreement>;
  readonly ok: boolean;
}

export interface ConformanceApi {
  /**
   * Run, against the `ContractChain` it is given (the port's signer pays; the chain is a world's, so writes are sent).
   * Probe arguments are made from each parameter's type, never chosen by the caller: `address` is `0x...01`, a `bool` false,
   * a `string` empty, `bytes` is `0x`, `bytesN` zeros, an array empty and a tuple its components'. A number is the pass's number.
   *
   * Pass A (numbers 0): each read must answer and decode; each write is simulated and, when it simulates, sent and included, and
   * its receipt's logs decode against the declared events. Pass B (numbers 1): each write is simulated only; it must simulate
   * or fail as a declared error (an `ERC20InsufficientBalance` is agreement); an empty revert is `no-such-function`, any other
   * revert `undeclared-revert`. Each declared event must be emitted by some pass A write.
   *
   * Infrastructure failing (the chain's RPC down) is a `ChainFault`; a disagreement never is.
   */
  readonly run: (input: ConformanceInput) => Effect.Effect<ConformanceReport, ChainFault, ContractChain>;
}
