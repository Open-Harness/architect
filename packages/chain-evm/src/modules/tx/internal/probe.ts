import type { Timers } from "@orthograph/language-effect";
import { Effect } from "effect";
import { isPendingReceipt } from "../../faults/internal/viem-mapper.ts";
import { rpcFault } from "../../faults/service.ts";
import type { ChainFault } from "../../faults/types.ts";
import type { Standing, Submission } from "../types.ts";
import { retryRead } from "./receipt-retry.ts";
import { readReceipt } from "./receipt.ts";
import { findReplacement } from "./replacement.ts";
import type { Rpc } from "./rpc.ts";

/** A replacement is looked for no further back than this: a submission this old that lost its nonce is not worth a scan of the chain. */
const LOOKBACK = 2_048n;

/**
 * Where one submission stands now, from three reads at most: its receipt, whether the node holds it, whether its nonce is used.
 * A transaction that is mined but whose receipt lags is `Held`: it is not dropped and must not be sent again.
 */
export const probeSubmission = (
  rpc: Rpc,
  timers: typeof Timers.Service,
  nonceAtHead: (address: Submission["from"]) => Effect.Effect<number, ChainFault>,
  submission: Submission,
): Effect.Effect<Standing, ChainFault> => Effect.gen(function* () {
  const receipt = yield* readReceipt(rpc, timers, submission.hash);
  if (receipt !== undefined) return receipt.status === "success" ? { _tag: "Included", receipt } : { _tag: "Reverted", receipt };
  const held = yield* retryRead(timers, rpc((client) => client.getTransaction({ hash: submission.hash }))).pipe(
    Effect.map(() => true),
    Effect.catch((error) => isPendingReceipt(error) ? Effect.succeed(false) : Effect.fail(rpcFault(error))),
  );
  if (held) return { _tag: "Held" };
  if ((yield* nonceAtHead(submission.from)) <= submission.nonce) return { _tag: "Dropped" };
  const head = yield* retryRead(timers, rpc((client) => client.getBlockNumber({ cacheTime: 0 }))).pipe(Effect.mapError((error) => rpcFault(error)));
  const floor = head > LOOKBACK ? head - LOOKBACK : 0n;
  const replacement = yield* findReplacement(rpc, timers, { ...submission, fromBlock: submission.fromBlock > floor ? submission.fromBlock : floor });
  if (replacement === undefined) return { _tag: "Held" };
  if (!replacement.sameCall) return { _tag: "Replaced", hash: replacement.hash };
  const mined = yield* readReceipt(rpc, timers, replacement.hash);
  return mined === undefined ? { _tag: "Held" } : mined.status === "success" ? { _tag: "Included", receipt: mined } : { _tag: "Reverted", receipt: mined };
}) as Effect.Effect<Standing, ChainFault>;
