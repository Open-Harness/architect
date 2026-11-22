import type { Effect } from "effect";
import type { Abi, AbiParameter, Address, Hex } from "viem";
import type { ChainFault, RefusalLockEntry } from "../faults/types.ts";

/** viem's ABI types, named here and exported by the device entry, so a caller needs no viem import. */
export type AbiDocument = Abi;
export type AbiConstructor = Extract<Abi[number], { type: "constructor" }>;
export type AbiError = Extract<Abi[number], { type: "error" }>;
export type AbiEvent = Extract<Abi[number], { type: "event" }>;
export type AbiFunction = Extract<Abi[number], { type: "function" }>;
export type { AbiParameter };

/** `abi` is viem's `Abi`, so a parsed human-readable ABI and a compiler's JSON both fit. */
export interface CallInput {
  readonly abi: Abi;
  readonly functionName: string;
  readonly args?: ReadonlyArray<unknown>;
}

export interface ResultInput {
  readonly abi: Abi;
  readonly functionName: string;
  /** What an `eth_call` of that function answered, as `ChainPort.read` returns it. */
  readonly data: Hex;
}

export interface DeployInput {
  readonly abi: Abi;
  readonly bytecode: Hex;
  /** The constructor's arguments, in order. */
  readonly args?: ReadonlyArray<unknown>;
}

export interface AbiApi {
  /** The calldata of one call: the 4-byte selector of the function's signature, then its arguments. An unknown function, or arguments of the wrong number or type, is a `ChainFault`. */
  readonly encodeCall: (input: CallInput) => Effect.Effect<Hex, ChainFault>;
  /**
   * The value a function's answer holds, as viem decodes it: no outputs is `undefined`, one output is its value (a tuple is an object
   * by its component names, a dynamic array an array), several outputs are an array in order. Data that does not decode is a `ChainFault`.
   */
  readonly decodeResult: (input: ResultInput) => Effect.Effect<unknown, ChainFault>;
  /** The deployment's data: the bytecode, then the ABI-encoded constructor arguments (none, when the ABI has no constructor). Arguments that do not fit the constructor (missing, too few, or given to an ABI with none) are a `ChainFault`. */
  readonly encodeDeploy: (input: DeployInput) => Effect.Effect<Hex, ChainFault>;
  /**
   * An `error` item of an ABI as a refusal lock entry: its `selector` is the first 4 bytes of the keccak-256 of its `signature`
   * (`Name(type,...)`, tuples written out), its `name` is the item's name, so `decodeRevert` decodes the contract's own errors.
   */
  readonly refusal: (item: AbiError, code: string, program?: Address) => RefusalLockEntry;
}
