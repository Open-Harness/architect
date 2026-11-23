import { TimersLive } from "@orthograph/language-effect";
import { Effect } from "effect";
import type { FollowerConfig, FollowerSink, SinkEntry } from "../types.ts";
import { hand, read, type Stored } from "./poll.ts";

export const CHECKPOINT = "checkpoint";
export const OUTBOX = "outbox";

/** What a Durable Object's storage gives, and no more. */
export interface Store {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
}

/** A step's read of the chain, kept before anything goes to the sink: the checkpoint it leads to, and the entries still to be taken. */
export interface Outbox { readonly checkpoint: Stored; readonly entries: ReadonlyArray<SinkEntry>; readonly caughtUp: boolean }

const wait = <A>(work: () => Promise<A>) => Effect.promise(work);

/** Hand the entries on in order. Each one taken (accepted or seen) leaves the outbox; when it is empty the checkpoint it led to is the checkpoint. */
const deliver = (store: Store, sink: () => FollowerSink, box: Outbox) => Effect.gen(function* () {
  for (let i = 0; i < box.entries.length; i++) {
    yield* hand(sink, box.entries[i]!);
    yield* wait(() => store.put(OUTBOX, { ...box, entries: box.entries.slice(i + 1) }));
  }
  // The checkpoint first: a stop before the delete leaves an empty outbox, which the next step only commits.
  yield* wait(() => store.put(CHECKPOINT, box.checkpoint));
  yield* wait(() => store.delete(OUTBOX));
  return { caughtUp: box.caughtUp };
});

/**
 * One step. A step that left entries in the outbox delivers them first and does not read the chain. Otherwise it reads, stores the new
 * checkpoint together with its entries, and only then hands them on: so a change the sink took is never lost to a failed later one, and a
 * reorg before the retry still finds the checkpoint that says what the sink was told (M6-chain item 12). The sink's "seen" makes a
 * second delivery of an id harmless.
 */
export const runStep = (store: Store, config: FollowerConfig, sink: () => FollowerSink) => Effect.gen(function* () {
  const pending = yield* wait(() => store.get<Outbox>(OUTBOX));
  if (pending !== undefined) return yield* deliver(store, sink, pending);
  const next = yield* read(config, yield* wait(() => store.get<Stored>(CHECKPOINT)));
  if (next.entries.length === 0) {
    yield* wait(() => store.put(CHECKPOINT, next.checkpoint));
    return { caughtUp: next.caughtUp };
  }
  yield* wait(() => store.put(OUTBOX, next));
  return yield* deliver(store, sink, next);
}).pipe(Effect.provide(TimersLive));
