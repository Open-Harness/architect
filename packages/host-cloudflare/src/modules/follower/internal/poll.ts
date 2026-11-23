import { makeChainPort, makeEventSource, type EventAbi, type EventCheckpoint, type EventFor } from "@orthograph/chain-evm/device";
import { TimersLive } from "@orthograph/language-effect";
import { Data, Effect } from "effect";
import type { FollowerConfig, FollowerSink, SinkEntry } from "../types.ts";
import { entryOf } from "./entries.ts";

export class FollowerFault extends Data.TaggedError("FollowerFault")<{ readonly message: string }> {}

export type Stored = EventCheckpoint<EventFor<EventAbi>>;

const hand = (sink: FollowerSink, entry: SinkEntry) => Effect.tryPromise({
  try: () => sink.accept(entry),
  catch: (error) => new FollowerFault({ message: `the sink refused ${entry.id}: ${error instanceof Error ? error.message : String(error)}` }),
}).pipe(Effect.flatMap((answer) => answer === "accepted" || answer === "seen"
  ? Effect.void
  : Effect.fail(new FollowerFault({ message: `the sink answered ${JSON.stringify(answer)} for ${entry.id}` }))));

/** One step of the reliable stream: read at most a window, hand each change on in order, and give back the checkpoint to keep. The caller keeps it only if this succeeds, so it never passes a change the sink has not taken. */
export const step = (config: FollowerConfig, old: Stored | undefined, sink: FollowerSink) => Effect.gen(function* () {
  const port = yield* makeChainPort({ chainId: config.chainId, rpcUrl: config.rpcUrl, ...(config.pollIntervalMs === undefined ? {} : { pollIntervalMs: config.pollIntervalMs }) });
  const source = makeEventSource(config.event as EventAbi, config.address as `0x${string}`, BigInt(config.fromBlock));
  const result = yield* port.follow(source, typeof config.depth === "number" ? { depth: config.depth } : config.depth).poll(old);
  for (const change of result.changes) {
    const entry = entryOf(config, change);
    if (entry !== undefined) yield* hand(sink, entry);
  }
  return { checkpoint: result.checkpoint, caughtUp: result.caughtUp };
}).pipe(Effect.provide(TimersLive));
