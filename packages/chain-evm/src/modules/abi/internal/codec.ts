import { Effect } from "effect";
import { concatHex, decodeAbiParameters, encodeAbiParameters, toFunctionSelector, type Hex } from "viem";
import { ChainFault } from "../../faults/types.ts";
import type { AbiConstructor, AbiFunction, AbiParameter } from "../types.ts";

const fault = (message: string) => new ChainFault({ kind: "configuration", message });

/** The viem call that throws, as a value: a bad argument or malformed data is a `ChainFault`, never a throw. */
const attempt = <A>(message: string, run: () => A): Effect.Effect<A, ChainFault> =>
  Effect.try({ try: run, catch: () => fault(message) });

const encodeArguments = (
  what: string, inputs: ReadonlyArray<AbiParameter>, args: ReadonlyArray<unknown>,
): Effect.Effect<Hex, ChainFault> =>
  args.length === inputs.length
    ? attempt(`${what} takes arguments of other types than were given`, () => encodeAbiParameters(inputs, args))
    : Effect.fail(fault(`${what} takes ${inputs.length} argument(s), ${args.length} given`));

export const encodeCall = (fn: AbiFunction, args: ReadonlyArray<unknown>): Effect.Effect<Hex, ChainFault> =>
  Effect.flatMap(
    attempt(`Cannot take the selector of ${fn.name}`, () => toFunctionSelector(fn)),
    (selector) => Effect.map(encodeArguments(`Function ${fn.name}`, fn.inputs, args), (words) => concatHex([selector, words])),
  );

/** viem decodes data that is not canonical (trailing bytes, dirty padding), so what was decoded is encoded again and compared with the input. */
export const decodeResult = (fn: AbiFunction, data: Hex): Effect.Effect<ReadonlyArray<unknown>, ChainFault> =>
  Effect.flatMap(
    attempt(`The answer of ${fn.name} does not decode`, () => [...decodeAbiParameters(fn.outputs, data)]),
    (values) => Effect.flatMap(
      attempt(`The answer of ${fn.name} does not encode again`, () => encodeAbiParameters(fn.outputs, values)),
      (canonical) => canonical.toLowerCase() === data.toLowerCase()
        ? Effect.succeed(values)
        : Effect.fail(fault(`The answer of ${fn.name} is not a canonical encoding of its outputs`)),
    ),
  );

export const encodeDeploy = (
  bytecode: Hex, constructor: AbiConstructor | undefined, args: ReadonlyArray<unknown>,
): Effect.Effect<Hex, ChainFault> =>
  Effect.map(encodeArguments("The constructor", constructor?.inputs ?? [], args), (words) => concatHex([bytecode, words]));
