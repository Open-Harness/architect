// Every entry that runs app code reads its world's instant and wraps itself (M8.05, M8.06): the Worker's `fetch`,
// `scheduled` and `queue`, each Durable Object's `fetch`, RPC and `alarm`, a Workflows step. The caller's world does not
// travel into another object's request, so each entry looks up its own, from the world's Durable Object. A real world
// skips all of it: no lookup, no patch.
import { Effect } from "effect";
import { WorldClock } from "#modules/clock/service.js";
import type { ClockSource } from "#modules/clock/types.js";
import type { WorldTimersRpc } from "#modules/timers/types.js";
import type { EntryEnv } from "../types.ts";
import { live } from "./leases.ts";

/** What the Worker calls on its world's Durable Object, over RPC. */
export interface Keeper extends WorldTimersRpc {
  readonly source: () => Promise<ClockSource | undefined>;
}

/** The world's Durable Object stub: the live world's own instance in an environment with leases, the one named `world` otherwise. */
export const keeperOf = (env: EntryEnv): Promise<Keeper> => {
  const name = env.ORTHO_WORLDS === "1" ? Effect.runPromise(live(env.DB)).then((held) => held[0]?.id ?? "world") : Promise.resolve("world");
  return name.then((id) => env.WORLD.get(env.WORLD.idFromName(id)) as unknown as Keeper);
};

/**
 * What this request reads the world's time from, asked of the world's Durable Object once per entry; nothing for a real
 * world. A stepped world's source is its instant (it cannot move while a request is in flight: an advance waits for quiet,
 * M8.07); a scaled world's is its anchors, so each read works out the instant now without asking again.
 */
export const sourceOf = (env: EntryEnv): Promise<ClockSource | undefined> => {
  if (WorldClock.declared(env).kind === "real") return Promise.resolve(undefined);
  return keeperOf(env).then((keeper) => keeper.source());
};

/** Run `f` in this request's world: `Date` and Effect's `Clock` read the world's time. A real world runs `f` as it is. */
export const within = <A>(env: EntryEnv, f: () => Promise<A>): Promise<A> =>
  WorldClock.declared(env).kind === "real" ? f() : sourceOf(env).then((source) => (source === undefined ? f() : WorldClock.within(source, f)));

/** The same for an entry that answers at once (an RPC method): a real world still answers at once, with no promise made. */
export const withinNow = <A>(env: EntryEnv, f: () => A): A | Promise<A> =>
  WorldClock.declared(env).kind === "real" ? f() : sourceOf(env).then((source) => (source === undefined ? f() : WorldClock.within(source, f)));

/**
 * A Worker's entry, wrapped. `/_world/*` is the world's own door: the Durable Object wraps what reads the world's time,
 * and the registry of worlds keeps real time (a world's lifetime is the machine's, K23 section 1), so it is not wrapped here.
 */
export const entry = <Env extends EntryEnv>(handler: ExportedHandler<Env>): ExportedHandler<Env> => {
  return {
    ...handler,
    ...(handler.fetch === undefined
      ? {}
      : { fetch: (request, env, ctx) => (new URL(request.url).pathname.startsWith("/_world/") ? handler.fetch!(request, env, ctx) : within(env, () => Promise.resolve(handler.fetch!(request, env, ctx)))) }),
    ...(handler.scheduled === undefined ? {} : { scheduled: (controller, env, ctx) => within(env, () => Promise.resolve(handler.scheduled!(controller, env, ctx))) }),
    ...(handler.queue === undefined ? {} : { queue: (batch, env, ctx) => within(env, () => Promise.resolve(handler.queue!(batch, env, ctx))) }),
  };
};
