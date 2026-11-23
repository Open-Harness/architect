// Adapted from @prb/effect-evm@5.0.3 src/tx/{manager,replacement}.ts. See LICENSE-prb-effect-evm.
import type { Timers } from "@orthograph/language-effect";
import { Effect } from "effect";
import type { PublicClient } from "viem";
import type { Rpc } from "./rpc.ts";
import { rpcFault } from "../../faults/service.ts";
import type { Submission } from "../types.ts";
import { retryRead } from "./receipt-retry.ts";

export const findReplacement = (rpc: Rpc, timers: typeof Timers.Service, submission: Submission) =>
  Effect.gen(function* () {
    const read = <A>(request: (client: PublicClient) => Promise<A>) =>
      retryRead(timers, rpc(request)).pipe(Effect.mapError((error) => rpcFault(error)));
    const head = yield* read((client) => client.getBlockNumber({ cacheTime: 0 }));
    const from = submission.from.toLowerCase();
    for (let number = head; number >= submission.fromBlock; number--) {
      const block = yield* read((client) => client.getBlock({ blockNumber: number, includeTransactions: true }));
      const tx = block.transactions.find((candidate) => candidate.from.toLowerCase() === from && candidate.nonce === submission.nonce);
      if (tx === undefined) continue;
      if (tx.hash === submission.hash) return undefined; // Its receipt can lag the block RPC.
      const sameCall = (tx.to ?? undefined)?.toLowerCase() === submission.to?.toLowerCase() &&
        tx.input.toLowerCase() === (submission.data ?? "0x").toLowerCase() &&
        tx.value === (submission.value ?? 0n);
      return { hash: tx.hash, sameCall };
    }
  });
