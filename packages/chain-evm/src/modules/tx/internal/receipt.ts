// Adapted from @prb/effect-evm@5.0.3 src/tx/manager.ts and tx/internal/receipt-retry.ts. See LICENSE-prb-effect-evm.
import type { Timers } from "@orthograph/language-effect";
import { Effect } from "effect";
import type { Hash, TransactionReceipt } from "viem";
import { isPendingReceipt } from "../../faults/internal/viem-mapper.ts";
import { decodeRevert, rpcFault } from "../../faults/service.ts";
import type { ChainPortOptions, Submission } from "../types.ts";
import { withinRpcDeadline, type Rpc } from "./rpc.ts";
import { retryRead } from "./receipt-retry.ts";

export const readReceipt = (rpc: Rpc, timers: typeof Timers.Service, hash: Hash) =>
  retryRead(timers, rpc((client) => client.getTransactionReceipt({ hash }))).pipe(
    Effect.catch((error) => isPendingReceipt(error) ? Effect.succeed(undefined) : Effect.fail(rpcFault(error))),
  );

export const receiptSpan = (chainId: number, receipt: TransactionReceipt) =>
  Effect.void.pipe(Effect.withSpan("chain.evm.receipt", { attributes: {
    chainId,
    "transaction.hash": receipt.transactionHash,
    "transaction.status": receipt.status,
    "transaction.gasUsed": receipt.gasUsed.toString(),
    "transaction.effectiveGasPrice": receipt.effectiveGasPrice.toString(),
    "block.number": receipt.blockNumber.toString(),
    "block.hash": receipt.blockHash,
  } }));

export const receiptError = (options: ChainPortOptions, timers: typeof Timers.Service, submission: Submission, hash: Hash) => {
  const trace = options.traceRevert;
  const data = trace === undefined ? Effect.succeed(undefined) : withinRpcDeadline(
    timers, options.rpcTimeoutMs ?? 10_000, "chain.evm.trace", Effect.suspend(() => trace(hash)),
  ).pipe(Effect.catch(() => Effect.succeed(undefined)));
  return data.pipe(Effect.flatMap((data) => decodeRevert(data, submission.to, options.refusals)), Effect.flip);
};
