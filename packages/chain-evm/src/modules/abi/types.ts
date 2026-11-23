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

export interface AbiApi {
  /** The calldata of one call: the 4-byte selector of the function's signature, then its arguments. `fn` is the one ABI item, so an overload is chosen by passing its item. Arguments of the wrong number or type are a `ChainFault`. */
  readonly encodeCall: (fn: AbiFunction, args: ReadonlyArray<unknown>) => Effect.Effect<Hex, ChainFault>;
  /**
   * What a function's answer holds, one element per output in order (no outputs is `[]`; a tuple is an object by its component names, a
   * dynamic array an array). Data that does not decode is a `ChainFault`, and so is a non-canonical encoding of it: trailing bytes, dirty padding, an out-of-range integer.
   */
  readonly decodeResult: (fn: AbiFunction, data: Hex) => Effect.Effect<ReadonlyArray<unknown>, ChainFault>;
  /** The deployment's data: the bytecode, then the ABI-encoded constructor arguments (none, with no constructor). Arguments that do not fit the constructor (missing, too few, too many, or given with no constructor) are a `ChainFault`. */
  readonly encodeDeploy: (bytecode: Hex, constructor: AbiConstructor | undefined, args: ReadonlyArray<unknown>) => Effect.Effect<Hex, ChainFault>;
  /**
   * An `error` item of an ABI as a refusal lock entry: its `selector` is the first 4 bytes of the keccak-256 of its `signature`
   * (`Name(type,...)`, tuples written out), its `name` is the item's name, so `decodeRevert` decodes the contract's own errors.
   */
  readonly refusal: (item: AbiError, code: string, program?: Address) => RefusalLockEntry;
}
