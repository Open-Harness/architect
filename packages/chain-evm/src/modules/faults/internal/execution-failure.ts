// Adapted from @prb/effect-evm@5.0.3 src/core/errors/execution-failure.ts. See LICENSE-prb-effect-evm.
import { ContractFunctionRevertedError, RawContractError, type Hex } from "viem";
import { errorChain, errorMessages, isRecord } from "./viem-mapper.ts";

const HEX = /^0x(?:[0-9a-f]{2})*$/iu;
const REVERT = /execution reverted|reverted with (?:reason|custom error)|function .* reverted/iu;
const REVERT_DATA = /(?:revert data|return data)\s*[:=]\s*(0x[0-9a-f]*)\b/iu;

const hex = (value: unknown, depth = 0): Hex | undefined => {
  if (typeof value === "string" && HEX.test(value)) return value as Hex;
  if (depth >= 4 || !isRecord(value)) return undefined;
  for (const field of ["data", "rawData", "revertData", "returnData", "hex", "value"]) {
    const nested = hex(value[field], depth + 1);
    if (nested !== undefined) return nested;
  }
};

export const decodeExecutionFailure = (error: unknown): { readonly data?: Hex } | undefined => {
  let reverted = false;
  let data: Hex | undefined;
  for (const cause of errorChain(error)) {
    if (cause instanceof ContractFunctionRevertedError) {
      reverted = true;
      data ??= hex(cause.raw);
    }
    if (cause instanceof RawContractError) {
      reverted = true;
      data ??= hex(cause.data);
    }
    if (isRecord(cause) && cause["code"] === 3) {
      reverted = true;
      data ??= hex(cause["data"]);
    }
    for (const message of errorMessages(cause)) {
      const labeled = message.match(REVERT_DATA)?.[1];
      if (!REVERT.test(message) && labeled === undefined) continue;
      reverted = true;
      data ??= (isRecord(cause) ? hex(cause["data"]) : undefined) ?? hex(labeled);
    }
  }
  return data !== undefined ? { data } : reverted ? {} : undefined;
};
