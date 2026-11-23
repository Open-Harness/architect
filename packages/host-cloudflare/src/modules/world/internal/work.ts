// Counted work and timers for a process that is not the world's Durable Object (M8.07): the generated Worker's runtime.
// Each token it takes is reported to the world's count, each wait is a row in the world's table, and a sleeper that wakes
// reads the instant the world fired it at, so a request that outlives a move of the clock sees the move.
import { Effect, Layer } from "effect";
import { BusyReporting, TimersWorld, WorldCount, WorldTable, type Busy, type DurableTimers, type Timers } from "@orthograph/language-effect";
import { WorldClock } from "#modules/clock/service.js";
import type { EntryEnv } from "../types.ts";
import { keeperOf } from "./entry.ts";

/** Each call finds the world's stub afresh: a stub lives only as long as the request that made it. */
const call = <A>(env: EntryEnv, f: (keeper: Awaited<ReturnType<typeof keeperOf>>) => Promise<A> | A): Effect.Effect<A> =>
  Effect.promise(() => keeperOf(env).then(f));

export const work = (env: EntryEnv): Layer.Layer<Busy | Timers | DurableTimers> => {
  // A real world has no controller to tell: nobody waits for it to be quiet.
  const counted = WorldClock.declared(env).kind !== "real";
  const count = Layer.succeed(WorldCount, WorldCount.of({
    enter: (owner) => (counted ? call(env, (keeper) => keeper.countEnter(owner)) : Effect.void),
    leave: (owner) => (counted ? call(env, (keeper) => keeper.countLeave(owner)) : Effect.void),
  }));
  const table = Layer.succeed(WorldTable, WorldTable.of({
    add: (owner, name, at, holder) => call(env, (keeper) => keeper.timerAdd(owner, name, at, holder)),
    // The wake is the instant the world fired the row at: this request's own clock is pointed at it before the code goes on.
    wait: (id) => call(env, (keeper) => keeper.timerWait(id)).pipe(Effect.flatMap((source) => Effect.sync(() => void (source !== undefined && WorldClock.refresh(source))))),
    cancel: (id) => call(env, (keeper) => keeper.timerCancel(id)),
    sleeping: call(env, (keeper) => keeper.timersSleeping()),
    set: (at, owner, name, wake) => call(env, (keeper) => keeper.timerSet(at, owner, name, wake)),
    clear: (owner, name) => call(env, (keeper) => keeper.timerClear(owner, name)),
    durable: call(env, (keeper) => keeper.timersDurable()),
  }));
  const busy = BusyReporting.pipe(Layer.provide(count));
  // One Busy for the handlers and the timers alike: the layer is built once and shared.
  return TimersWorld.pipe(Layer.provide(table), Layer.provideMerge(busy));
};
