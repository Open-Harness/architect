// Counted work and timers for a process that is not the world's Durable Object (M8.07): the generated Worker's runtime.
// Each token it takes is reported to the world's count, each wait is a row in the world's table, and a sleeper that wakes
// reads the instant the world fired it at, so a request that outlives a move of the clock sees the move.
import { Effect, Layer } from "effect";
import { BusyReporting, TimersWorld, WorldCount, WorldTable, wakesByKind, type Busy, type DurableTimers, type Timers } from "@orthograph/language-effect";
import { WorldClock } from "#modules/clock/service.js";
import type { WorldWakes } from "#modules/timers/types.js";
import type { EntryEnv } from "../types.ts";
import { keeperOf } from "./entry.ts";

/** Each call finds the world's stub afresh: a stub lives only as long as the request that made it. */
const call = <A>(env: EntryEnv, f: (keeper: Awaited<ReturnType<typeof keeperOf>>) => Promise<A> | A): Effect.Effect<A> =>
  Effect.promise(() => keeperOf(env).then(f));

/**
 * The one way a request takes up the world's clock after it has been without it: it asks the world for its source now and points its
 * own cell at it. A request parked at day 0 whose wait ends at day +1 reads day +1, whichever side of the race won. A real world
 * has no source to ask for.
 */
export const resumed = (env: EntryEnv): Effect.Effect<void> =>
  WorldClock.declared(env).kind === "real"
    ? Effect.void
    : call(env, (keeper) => keeper.source()).pipe(Effect.flatMap((source) => Effect.sync(() => void (source !== undefined && WorldClock.refresh(source)))));

export const work = (env: EntryEnv, kinds?: WorldWakes): Layer.Layer<Busy | Timers | DurableTimers> => {
  // A real world has no controller to tell: nobody waits for it to be quiet.
  const counted = WorldClock.declared(env).kind !== "real";
  const count = Layer.succeed(WorldCount, WorldCount.of({
    // Tokens have identity: the id the world gave carries its generation, and releases exactly that token.
    enter: (owner) => (counted ? call(env, (keeper) => keeper.countEnter(owner)) : Effect.succeed("real")),
    leave: (id) => (counted ? call(env, (keeper) => keeper.countLeave(id)) : Effect.void),
    name: (id, owner) => (counted ? call(env, (keeper) => keeper.countName(id, owner)) : Effect.void),
    // The box of the request this fiber runs in, taken at its entry: the work counts under it instead of taking another token.
    request: Effect.sync(() => WorldClock.box()),
  }));
  const table = Layer.succeed(WorldTable, WorldTable.of({
    add: (owner, name, at, holder) => call(env, (keeper) => keeper.timerAdd(owner, name, at, holder)),
    // The wake is the instant the world fired the row at: this request's own clock is pointed at it before the code goes on.
    wait: (id) => call(env, (keeper) => keeper.timerWait(id)).pipe(Effect.flatMap((source) => Effect.sync(() => void (source !== undefined && WorldClock.refresh(source))))),
    // Giving a row up is where a request that parked takes its token back: it resumes on the world's clock as it is now.
    cancel: (id) => call(env, (keeper) => keeper.timerCancel(id)).pipe(Effect.tap(() => resumed(env))),
    sleeping: call(env, (keeper) => keeper.timersSleeping()),
    set: (at, owner, name, wake) => call(env, (keeper) => keeper.timerSet(at, owner, name, wake)),
    clear: (owner, name) => call(env, (keeper) => keeper.timerClear(owner, name)),
    durable: call(env, (keeper) => keeper.timersDurable()),
  }));
  const busy = BusyReporting.pipe(Layer.provide(count));
  // One Busy for the handlers and the timers alike: the layer is built once and shared.
  // With a wake route a durable timer can be set; without one setting it is a defect (M8-timers-shape rule 6).
  const wakes = kinds === undefined ? Layer.empty : wakesByKind(kinds);
  return TimersWorld.pipe(Layer.provide(table), Layer.provide(wakes), Layer.provideMerge(busy));
};
