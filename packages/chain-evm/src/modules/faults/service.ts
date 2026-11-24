// Adapted from @prb/effect-evm@5.0.3 src/core/errors/{viem-mapper,execution-failure}.ts. See LICENSE-prb-effect-evm.
import { Effect } from "effect";
import { decodeErrorResult, toFunctionSelector, toFunctionSignature, type Address, type Hex } from "viem";
import { decodeExecutionFailure } from "./internal/execution-failure.ts";
import { rpcFaultKind } from "./internal/viem-mapper.ts";
import { ChainFault, ChainRefusal, type ChainError, type RefusalLockEntry } from "./types.ts";

const PANIC = "0x4e487b71";
const selectorOf = (data: Hex): Hex => data.slice(0, 10).toLowerCase() as Hex;

export const validateRefusalLock = (lock: ReadonlyArray<RefusalLockEntry>) =>
  Effect.gen(function* () {
    for (const entry of lock) {
      const signature = toFunctionSignature({ ...entry.abi, type: "function", outputs: [], stateMutability: "pure" });
      if (entry.signature !== signature || entry.selector.toLowerCase() !== toFunctionSelector(signature)) {
        return yield* new ChainFault({ kind: "configuration", message: "An EVM refusal lock entry disagrees with its ABI" });
      }
    }
  });

/** Only locked selectors produce a refusal. Provider text is never used as a refusal identity. */
export const decodeRevert = (
  data: Hex | undefined,
  program?: Address,
  lock: ReadonlyArray<RefusalLockEntry> = [],
): Effect.Effect<never, ChainError> =>
  Effect.gen(function* () {
    const context = program === undefined ? {} : { program };
    if (data === undefined || data.length < 10) {
      return yield* new ChainFault({
        kind: "revert", ...context, ...(data === undefined ? {} : { raw: data }),
        message: "EVM execution reverted without a decodable selector",
      });
    }
    const selector = selectorOf(data);
    const applicable = lock.filter((entry) => entry.selector.toLowerCase() === selector &&
      (entry.program === undefined || entry.program.toLowerCase() === program?.toLowerCase()));
    const scoped = applicable.filter((entry) => entry.program !== undefined);
    const [entry, collision] = scoped.length > 0 ? scoped : applicable;
    if (entry !== undefined && collision === undefined) {
      const decoded = yield* Effect.result(Effect.try({
        try: () => decodeErrorResult({ abi: [entry.abi], data }),
        catch: () => new ChainFault({ kind: "revert", ...context, raw: data, message: "Malformed EVM refusal payload" }),
      }));
      if (decoded._tag === "Failure") return yield* decoded.failure;
      if (decoded.success.errorName === entry.abi.name && (decoded.success.args?.length ?? 0) === entry.abi.inputs.length) {
        const args = Object.fromEntries(entry.abi.inputs.map((input, index) => [
          input.name || String(index), decoded.success.args?.[index],
        ]));
        return yield* new ChainRefusal({ code: entry.code, name: entry.name, selector, ...context, args });
      }
    }
    return yield* new ChainFault({
      kind: selector === PANIC ? "panic" : "revert", ...context, raw: data,
      message: selector === PANIC ? "EVM execution panicked" : "EVM execution reverted with an unlocked selector",
    });
  });

const DEFINITE: ReadonlySet<string> = new Set(["funds", "rejected", "revert", "panic", "signing", "configuration", "unsupported"]);

/**
 * Whether a failure of `submit` or `fill` is final for that call: the node refused it (or it never could be sent), so sending the same
 * bytes again cannot help, and a port built with `keepOnReject` has left the nonce held by its owner. A transport error or a timeout is
 * not: the transaction may be on the node. The port alone decides this; callers do not classify errors themselves.
 */
export const isDefinite = (error: unknown): boolean =>
  error instanceof ChainRefusal || (error instanceof ChainFault && DEFINITE.has(error.kind));

export const mapRpcError = (
  error: unknown,
  program?: Address,
  lock: ReadonlyArray<RefusalLockEntry> = [],
): Effect.Effect<never, ChainError> => {
  const revert = decodeExecutionFailure(error);
  if (revert !== undefined) return decodeRevert(revert.data, program, lock);
  return Effect.fail(rpcFault(error, program));
};

// viem errors can include a request URL or serialized transaction. Keep only the classification.
export const rpcFault = (error: unknown, program?: Address): ChainFault =>
  error instanceof ChainFault ? error : new ChainFault({
    kind: rpcFaultKind(error),
    ...(program === undefined ? {} : { program }),
    message: "EVM RPC request failed",
  });
