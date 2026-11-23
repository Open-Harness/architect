import { makeChainPort, makeEventSource, type EventAbi, type EventCheckpoint, type EventFor } from "@orthograph/chain-evm/device";
import { Timers, TimersLive } from "@orthograph/language-effect";
import { Data, Effect } from "effect";
import { SINK_TIMEOUT_MS, type FollowerConfig, type FollowerSink, type SinkEntry } from "../types.ts";
import { entryOf } from "./entries.ts";

export class FollowerFault extends Data.TaggedError("FollowerFault")<{ readonly kind: "unconfigured" | "sink-refused" | "sink-answer" | "sink-timeout"; readonly message: string }> {}

export type Stored = EventCheckpoint<EventFor<EventAbi>>;

const hand = (sink: () => FollowerSink, entry: SinkEntry) => Effect.gen(function* () {
  const timers = yield* Timers;
  const timedOut = new FollowerFault({ kind: "sink-timeout", message: `the sink did not answer ${entry.id} in time` });
  const ask = Effect.tryPromise({ try: () => sink().accept(entry), catch: () => new FollowerFault({ kind: "sink-refused", message: `the sink refused ${entry.id}` }) });
  const answer = yield* Effect.raceFirst(ask, timers.sleep("follower.sink", SINK_TIMEOUT_MS).pipe(Effect.andThen(Effect.fail(timedOut))));
  if (answer !== "accepted" && answer !== "seen") return yield* new FollowerFault({ kind: "sink-answer", message: `the sink answered ${JSON.stringify(answer)} for ${entry.id}` });
});

/** One step of the reliable stream: read at most a window, hand each change on in order, and give back the checkpoint to keep. The caller keeps it only if this succeeds, so it never passes a change the sink has not taken. */
export const step = (config: FollowerConfig, old: Stored | undefined, sink: () => FollowerSink) => Effect.gen(function* () {
  const port = yield* makeChainPort({ chainId: config.chainId, rpcUrl: config.rpcUrl, ...(config.pollIntervalMs === undefined ? {} : { pollIntervalMs: config.pollIntervalMs }) });
  const source = makeEventSource(config.event as EventAbi, config.address as `0x${string}`, BigInt(config.fromBlock));
  const result = yield* port.follow(source, typeof config.depth === "number" ? { depth: config.depth } : config.depth).poll(old);
  for (const change of result.changes) {
    const entry = entryOf(config, change);
    if (entry !== undefined) yield* hand(sink, entry);
  }
  return { checkpoint: result.checkpoint, caughtUp: result.caughtUp };
}).pipe(Effect.provide(TimersLive));
