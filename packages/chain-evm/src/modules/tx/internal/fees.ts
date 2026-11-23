// Adapted from @prb/effect-evm@5.0.3 src/tx/{fees,replacement}.ts. See LICENSE-prb-effect-evm.
import { Effect } from "effect";
import type { Rpc } from "./rpc.ts";
import { rpcFault } from "../../faults/service.ts";
import { ChainFault } from "../../faults/types.ts";
import type { Transaction } from "../types.ts";

const legacyFees = (rpc: Rpc) => rpc((client) => client.getGasPrice()).pipe(Effect.mapError((error) => rpcFault(error)));
const eip1559Fees = (rpc: Rpc) => rpc((client) => client.estimateFeesPerGas({ type: "eip1559", chain: undefined })).pipe(
  Effect.mapError((error) => rpcFault(error)),
);

export const estimateFees = (rpc: Rpc) => Effect.gen(function* () {
  const block = yield* rpc((client) => client.getBlock({ blockTag: "latest" })).pipe(Effect.mapError((error) => rpcFault(error)));
  return block.baseFeePerGas == null
    ? { type: "legacy" as const, gasPrice: yield* legacyFees(rpc) }
    : { type: "eip1559" as const, ...yield* eip1559Fees(rpc) };
});

const bump = (fee: bigint) => fee + (fee / 8n || 1n);
const max = (left: bigint, right: bigint) => left > right ? left : right;
const capExceeded = () => new ChainFault({ kind: "funds", message: "The fee cap is lower than the replacement fee" });

/** Replacement candidates use a 12.5% increase (at least 1 wei), bounded by the caller's fee cap. */
export const replacementTransaction = (rpc: Rpc, original: Transaction, cap: bigint) =>
  Effect.gen(function* () {
    if (original.type === "legacy") {
      const gasPrice = max(bump(original.gasPrice), yield* legacyFees(rpc));
      if (gasPrice > cap) return yield* capExceeded();
      return { ...original, gasPrice };
    }
    const estimate = yield* eip1559Fees(rpc);
    const maxPriorityFeePerGas = max(bump(original.maxPriorityFeePerGas), estimate.maxPriorityFeePerGas);
    const maxFeePerGas = max(max(bump(original.maxFeePerGas), estimate.maxFeePerGas), maxPriorityFeePerGas);
    if (maxFeePerGas > cap) return yield* capExceeded();
    return { ...original, maxFeePerGas, maxPriorityFeePerGas };
  });
