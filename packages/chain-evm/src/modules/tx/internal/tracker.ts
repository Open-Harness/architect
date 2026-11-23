// Adapted from @prb/effect-evm@5.0.3 src/tx/{manager,tracker}.ts and K7 Q3. See LICENSE-prb-effect-evm.
import type { Timers } from "@orthograph/language-effect";
import { Clock, Effect, Stream } from "effect";
import type { Hash, TransactionReceipt } from "viem";
import type { DecodedEvent, EventCheckpoint, EventFollower } from "../../events/types.ts";
import { rpcFault } from "../../faults/service.ts";
import { ChainFault } from "../../faults/types.ts";
import type { ChainPortOptions, Intent, Submission, TxState } from "../types.ts";
import { readReceipt, receiptError, receiptSpan } from "./receipt.ts";
import { retryRead } from "./receipt-retry.ts";
import { RpcDeadline, type Rpc } from "./rpc.ts";
import { findReplacement } from "./replacement.ts";

interface Tracking<TEvent extends DecodedEvent> {
  readonly deadline: number;
  readonly wait: boolean;
  readonly done: boolean;
  readonly timedOut: boolean;
  readonly confirmed: boolean;
  readonly checkpoint: EventCheckpoint<TEvent> | undefined;
  readonly receipt: TransactionReceipt | undefined;
  readonly replacement: Hash | undefined;
  readonly dropped: boolean;
  /** Blocks that count for a transfer tracked to a depth: the including block and every one after it. */
  readonly blocks: number;
}

export const trackTransaction = <TEvent extends DecodedEvent>(
  rpc: Rpc,
  timers: typeof Timers.Service,
  options: ChainPortOptions,
  interval: number,
  timeout: number,
  nonceAtHead: (address: Submission["from"]) => Effect.Effect<number, ChainFault>,
  submission: Submission,
  intent: Intent<TEvent> | undefined,
  follower: EventFollower<TEvent> | undefined,
  /** Without an intent, a transfer is done when it is this many blocks deep (the including block is 1); undefined, when it is included. */
  depth?: number,
): Stream.Stream<TxState<TEvent>, ChainFault> =>
  Stream.unwrap(Effect.gen(function* () {
    const start = yield* Clock.currentTimeMillis;
    const initial: Tracking<TEvent> = {
      deadline: start + timeout, wait: false, done: false, timedOut: false, confirmed: false,
      checkpoint: undefined, receipt: undefined, replacement: undefined, dropped: false, blocks: 0,
    };
    const timedOut = () => new ChainFault({ kind: "timeout", message: "The EVM tracking deadline elapsed before observing the requested outcome" });
    const poll = (previous: Tracking<TEvent>) => Effect.gen(function* () {
      const states: TxState<TEvent>[] = [];
      const now = yield* Clock.currentTimeMillis;
      const included = yield* readReceipt(rpc, timers, submission.hash);
      const replacement = included === undefined && (yield* nonceAtHead(submission.from)) > submission.nonce
        ? yield* findReplacement(rpc, timers, submission)
        : undefined;
      if (replacement?.sameCall && replacement.hash !== previous.replacement) {
        states.push({ _tag: "Replaced", oldHash: submission.hash, newHash: replacement.hash });
      }
      const receipt = replacement?.sameCall
        ? yield* readReceipt(rpc, timers, replacement.hash)
        : included;
      if (receipt !== undefined && (receipt.transactionHash !== previous.receipt?.transactionHash ||
          receipt.blockHash !== previous.receipt.blockHash)) {
        yield* receiptSpan(options.chainId, receipt);
        states.push({ _tag: "Included", receipt });
        if (receipt.status === "reverted") {
          states.push({ _tag: "Reverted", receipt, error: yield* receiptError(options, timers, submission, receipt.transactionHash) });
        }
      }
      let blocks = receipt === undefined ? 0 : previous.blocks;
      if (depth !== undefined && intent === undefined && receipt !== undefined && receipt.status === "success") {
        const head = yield* retryRead(timers, rpc((client) => client.getBlockNumber({ cacheTime: 0 }))).pipe(Effect.mapError((error) => rpcFault(error)));
        blocks = head < receipt.blockNumber ? 1 : Number(head - receipt.blockNumber) + 1;
        if (blocks !== previous.blocks) states.push({ _tag: "Deepened", blocks, receipt });
      }
      const dropped = replacement !== undefined && !replacement.sameCall;
      let checkpoint = previous.checkpoint;
      let confirmed = previous.confirmed;
      let deadline = previous.deadline;
      let wait = true;
      let expired = false;
      if (follower !== undefined && intent !== undefined) {
        const page = yield* follower.poll(checkpoint);
        checkpoint = page.checkpoint;
        wait = page.caughtUp;
        for (const change of page.changes) {
          if (change._tag === "Observed" || !intent.matches(change.event)) continue;
          states.push(change);
        }
        const matching = page.checkpoint.seen.filter(({ event }) => intent.matches(event));
        confirmed = states.some((state) => state._tag === "Confirmed") || matching.some(({ confirmed }) => confirmed) ||
          (confirmed && !states.some((state) => state._tag === "Corrected" && state.wasConfirmed));
        expired = wait && !confirmed && matching.length === 0 &&
          intent.deadline !== undefined && page.headTimestamp > intent.deadline;
        if (previous.confirmed && !confirmed) deadline = now + timeout;
      }
      if (!confirmed && !previous.dropped && (dropped || expired)) {
        states.push({ _tag: "Dropped", hash: submission.hash, reason: dropped ? "nonce-consumed" : "deadline" });
      }
      // A transfer to a depth is done when it is that deep (or mined and reverted); a new block is progress, so it renews the budget.
      const deep = depth === undefined || receipt?.status === "reverted" || blocks >= depth;
      const done = expired || (intent === undefined && (dropped || (receipt !== undefined && deep)));
      if (blocks !== previous.blocks) deadline = now + timeout;
      const timedOut = (yield* Clock.currentTimeMillis) >= deadline && !confirmed && !done && wait;
      return [states, {
        deadline, done, timedOut, wait, confirmed, checkpoint, receipt,
        replacement: replacement?.sameCall ? replacement.hash : undefined, dropped, blocks,
      }] as const;
    });
    return Stream.unfold(initial, (previous) => Effect.gen(function* () {
      if (previous.done) return undefined;
      if (previous.timedOut) return yield* timedOut();
      if (previous.wait) {
        const now = yield* Clock.currentTimeMillis;
        const delay = previous.confirmed ? interval : Math.min(interval, previous.deadline - now);
        if (delay <= 0) return yield* timedOut();
        yield* timers.sleep("chain.evm.receipt", delay);
      }
      return yield* (previous.confirmed ? poll(previous) : poll(previous).pipe(
        Effect.provideService(RpcDeadline, previous.deadline),
      ));
    })).pipe(Stream.flatMap((states) => Stream.fromIterable(states)));
  }));
