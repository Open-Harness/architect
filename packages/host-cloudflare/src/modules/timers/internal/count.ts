// The world's count of work in flight, across every process in it (M8.07): each process reports the tokens it takes and
// gives back, each named by its owner. The world is quiet when none is held, on two reads in a row.
import { Data, Deferred, Duration, Effect, Option } from "effect";

/** A quiet wait ran past its real-time limit: each token still held is named by its owner, an operation's name for a handler. */
export class NeverQuiet extends Data.TaggedError("NeverQuiet")<{ readonly busy: ReadonlyArray<string> }> {}

export interface Count {
  readonly enter: (owner: string) => void;
  readonly leave: (owner: string) => void;
  /** The owner of each token held, once per token, sorted. */
  readonly held: () => ReadonlyArray<string>;
  /** Wait until nothing is held; `NeverQuiet` naming who is, when `limit` milliseconds of real time pass first. */
  readonly quiet: (limit: number) => Effect.Effect<void, NeverQuiet>;
}

export const makeCount = (): Count => {
  const tokens = new Map<string, number>();
  let total = 0;
  let waiters: Array<Deferred.Deferred<void>> = [];
  const held = () => [...tokens].flatMap(([owner, n]) => Array.from({ length: n }, () => owner)).sort();
  const empty = Effect.suspend(() => {
    if (total === 0) return Effect.void;
    const d = Deferred.makeUnsafe<void>();
    waiters.push(d);
    return Deferred.await(d);
  });
  // Two reads in a row agree: work a woken process starts on the next turn is seen before the world is called quiet.
  const settled: Effect.Effect<void> = Effect.gen(function* () {
    yield* empty;
    yield* Effect.yieldNow;
    if (total !== 0) return yield* settled;
  });
  return {
    enter: (owner) => {
      total++;
      tokens.set(owner, (tokens.get(owner) ?? 0) + 1);
    },
    leave: (owner) => {
      // A token the world never counted (the world was reset under a running request) is not a debt to repay.
      const n = tokens.get(owner);
      if (n === undefined) return;
      if (n <= 1) tokens.delete(owner);
      else tokens.set(owner, n - 1);
      total--;
      if (total > 0) return;
      const ready = waiters;
      waiters = [];
      for (const d of ready) Deferred.doneUnsafe(d, Effect.void);
    },
    held,
    quiet: (limit) =>
      settled.pipe(
        Effect.timeoutOption(Duration.millis(limit)),
        Effect.flatMap((done) => (Option.isSome(done) ? Effect.void : Effect.fail(new NeverQuiet({ busy: held() })))),
      ),
  };
};
