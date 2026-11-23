// Adapted from @prb/effect-evm@5.0.3 src/events/{stream,cursor,reliable-stream}.ts. See LICENSE-prb-effect-evm.
import type { Timers } from "@orthograph/language-effect";
import { Effect, Stream } from "effect";
import type { Rpc } from "../tx/internal/rpc.ts";
import { rpcFault } from "../faults/service.ts";
import { ChainFault } from "../faults/types.ts";
import { retryRead } from "../tx/internal/receipt-retry.ts";
import type { ConfirmationLevel } from "../tx/types.ts";
import { readRange } from "./internal/backfill.ts";
import { buildWindow, changed, findAncestor, max, min, WINDOW } from "./internal/cursor.ts";
import { applyEvents } from "./internal/reliable-stream.ts";
import type { DecodedEvent, EventCheckpoint, EventFollower, EventSource } from "./types.ts";

export { makeEventSource } from "./internal/decoder.ts";

export const makeFollower = <TEvent extends DecodedEvent>(
  rpc: Rpc, timers: typeof Timers.Service, interval: number, source: EventSource<TEvent>, level: ConfirmationLevel,
): EventFollower<TEvent> => {
  const empty: EventCheckpoint<TEvent> = { through: undefined, window: [], seen: [] };
  const block = (point: { blockNumber: bigint } | { blockTag: "latest" | "safe" | "finalized" }) =>
    retryRead(timers, rpc((client) => client.getBlock({ ...point, includeTransactions: false }))).pipe(Effect.mapError((error) => rpcFault(error, source.address)));
  const hashAt = (number: bigint) => block({ blockNumber: number }).pipe(Effect.map(({ hash }) => hash));

  const poll: EventFollower<TEvent>["poll"] = (old = empty) => Effect.gen(function* () {
    if (source.fromBlock < 0n || ("depth" in level && (!Number.isSafeInteger(level.depth) || level.depth < 1))) {
      return yield* new ChainFault({ kind: "configuration", program: source.address, message: "Invalid event start block or confirmation depth" });
    }
    const head = yield* block({ blockTag: "latest" });
    const ancestor = yield* findAncestor(old, head, hashAt, source.address);
    const from = max(source.fromBlock, (ancestor?.number ?? -1n) + 1n);
    // Backfill in hash-window-sized pages so every new log can be verified against its block.
    const end = min(head.number, from + WINDOW - 1n);
    const through = end === head.number ? head : yield* block({ blockNumber: end });
    const retained = old.window.filter(({ number }) => ancestor !== undefined && number <= ancestor.number);
    const window = yield* buildWindow(retained, through, (n) => block({ blockNumber: n }), source.address);
    const logs = from > end ? [] : yield* readRange(rpc, timers, source, from, end);
    const confirmedThrough = "depth" in level
      ? head.number + 1n - BigInt(level.depth)
      : (yield* block({ blockTag: level.tag })).number;
    const hashes = new Map(window.map(({ number, hash }) => [number, hash]));
    const snap = yield* hashAt(head.number);
    if (snap !== head.hash || logs.some((log) => hashes.get(log.blockNumber) !== log.blockHash)) {
      return yield* changed(source.address);
    }
    const result = applyEvents(old, ancestor, logs, min(end, confirmedThrough), max(0n, end - WINDOW + 1n));
    return {
      caughtUp: end === head.number,
      headTimestamp: head.timestamp,
      changes: result.changes,
      checkpoint: { through: { number: through.number, hash: through.hash }, window, seen: result.seen },
    };
  }).pipe(Effect.withSpan("chain.evm.events.poll", { attributes: { address: source.address } }));

  const stream: EventFollower<TEvent>["stream"] = (initial) => Stream.unfold(
    { checkpoint: initial, wait: false },
    ({ checkpoint, wait }) => Effect.gen(function* () {
      if (wait) yield* timers.sleep("chain.evm.events", interval);
      const next = yield* poll(checkpoint);
      return [next, { checkpoint: next.checkpoint, wait: next.caughtUp }] as const;
    }),
  );

  return { poll, stream };
};
