// The world's count of work in flight, across every process in it (M8.07): each token has an identity, an id that carries the
// incarnation and generation it was taken in, and only that id releases it. The owner is kept for naming who is busy. The world is quiet when no
// token of the current generation is held, on two reads in a row. A reset starts a new generation: an id from an older one, or one
// already released, can never release a token of the new one.
import { Data, Deferred, Duration, Effect, Option } from "effect";

/** A quiet wait ran past its real-time limit: each token still held is named by its owner, an operation's name for a handler. */
export class NeverQuiet extends Data.TaggedError("NeverQuiet")<{ readonly busy: ReadonlyArray<string> }> {}

export interface Count {
  /** Take a token for `owner`: its id, `<epoch>.<generation>.<n>`, the epoch being this incarnation of the count (a restart, or another world). */
  readonly enter: (owner: string) => string;
  /** Release exactly that token; an id of another generation, or one already released, does nothing. */
  readonly leave: (id: string) => void;
  /** Is this token held now? False for an id of another incarnation or generation, or one already released. */
  readonly has: (id: string) => boolean;
  /** How many resets this count has seen: a move that began in one generation must not carry on in the next. */
  readonly generation: () => number;
  /** Name a token again (a request's entry names it by its path, the operation names it when it begins). */
  readonly name: (id: string, owner: string) => void;
  /** The owner of each token held, once per token, sorted. */
  readonly held: () => ReadonlyArray<string>;
  /** Open a write section for a token (a commit): false when the world does not hold it, or is closed to writes while it resets. */
  readonly section: (id: string) => boolean;
  /** The write section ended. */
  readonly sectionEnd: (id: string) => void;
  /** Closed to writes and to new tokens (a reset is wiping the databases), until `admit`. */
  readonly close: () => void;
  readonly admit: () => void;
  readonly closed: () => boolean;
  /** Wait until no write section is open, for at most `limit` milliseconds of real time; a reset has begun, so nothing new opens. */
  readonly drain: (limit: number) => Effect.Effect<void>;
  /** Start a new generation: every token of the old one is forgotten, and waiters are released. */
  readonly reset: () => void;
  /** Wait until nothing is held; `NeverQuiet` naming who is, when `limit` milliseconds of real time pass first. */
  readonly quiet: (limit: number) => Effect.Effect<void, NeverQuiet>;
}

export const makeCount = (): Count => {
  const tokens = new Map<string, string>();
  // Ids restart at 0 in a new incarnation (the Durable Object restarted) and in every other world's count, so they carry an epoch of this one's own.
  const epoch = crypto.randomUUID().slice(0, 8);
  let generation = 0;
  let next = 0;
  let waiters: Array<Deferred.Deferred<void>> = [];
  const sections = new Map<string, number>();
  let draining: Array<Deferred.Deferred<void>> = [];
  let closed = false;
  const sectionsEnded = () => {
    if (sections.size > 0) return;
    const ready = draining;
    draining = [];
    for (const d of ready) Deferred.doneUnsafe(d, Effect.void);
  };
  const held = () => [...tokens.values()].sort();
  const empty = Effect.suspend(() => {
    if (tokens.size === 0) return Effect.void;
    const d = Deferred.makeUnsafe<void>();
    waiters.push(d);
    return Deferred.await(d);
  });
  const release = () => {
    const ready = waiters;
    waiters = [];
    for (const d of ready) Deferred.doneUnsafe(d, Effect.void);
  };
  // Two reads in a row agree: work a woken process starts on the next turn is seen before the world is called quiet.
  const settled: Effect.Effect<void> = Effect.gen(function* () {
    yield* empty;
    yield* Effect.yieldNow;
    if (tokens.size !== 0) return yield* settled;
  });
  return {
    enter: (owner) => {
      const id = `${epoch}.${generation}.${next++}`;
      tokens.set(id, owner);
      return id;
    },
    leave: (id) => {
      if (!tokens.delete(id)) return;
      if (tokens.size === 0) release();
    },
    name: (id, owner) => {
      if (tokens.has(id)) tokens.set(id, owner);
    },
    held,
    has: (id) => tokens.has(id),
    section: (id) => {
      if (closed || !tokens.has(id)) return false;
      sections.set(id, (sections.get(id) ?? 0) + 1);
      return true;
    },
    sectionEnd: (id) => {
      const n = sections.get(id);
      if (n === undefined) return;
      if (n <= 1) sections.delete(id);
      else sections.set(id, n - 1);
      sectionsEnded();
    },
    close: () => { closed = true; },
    admit: () => { closed = false; },
    closed: () => closed,
    drain: (limit) => {
      if (sections.size === 0) return Effect.void;
      const d = Deferred.makeUnsafe<void>();
      draining.push(d);
      return Deferred.await(d).pipe(Effect.timeoutOption(Duration.millis(limit)), Effect.asVoid);
    },
    generation: () => generation,
    reset: () => {
      generation += 1;
      tokens.clear();
      sections.clear();
      sectionsEnded();
      release();
    },
    quiet: (limit) =>
      settled.pipe(
        Effect.timeoutOption(Duration.millis(limit)),
        Effect.flatMap((done) => (Option.isSome(done) ? Effect.void : Effect.fail(new NeverQuiet({ busy: held() })))),
      ),
  };
};
