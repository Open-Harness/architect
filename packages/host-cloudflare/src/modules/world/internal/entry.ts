// Every entry that runs app code reads its world's instant and wraps itself (M8.05, M8.06): the Worker's `fetch`,
// `scheduled` and `queue`, each Durable Object's `fetch`, RPC and `alarm`, a Workflows step. The caller's world does not
// travel into another object's request, so each entry looks up its own, from the world's Durable Object. A real world
// skips all of it: no lookup, no patch.
import { Effect } from "effect";
import { WorldClock } from "#modules/clock/service.js";
import type { EntryEnv } from "../types.ts";
import { live } from "./leases.ts";

interface Timed {
  readonly now: () => Promise<number>;
}

/** The world's instant now, read from its Durable Object; nothing for a real world. */
export const instantOf = (env: EntryEnv): Promise<number | undefined> => {
  if (WorldClock.declared(env).kind === "real") return Promise.resolve(undefined);
  const name = env.ORTHO_WORLDS === "1" ? Effect.runPromise(live(env.DB)).then((held) => held[0]?.id ?? "world") : Promise.resolve("world");
  return name.then((id) => (env.WORLD.get(env.WORLD.idFromName(id)) as unknown as Timed).now());
};

/** Run `f` in this request's world: `Date` and Effect's `Clock` read the world's instant. A real world runs `f` as it is. */
export const within = <A>(env: EntryEnv, f: () => Promise<A>): Promise<A> =>
  WorldClock.declared(env).kind === "real" ? f() : instantOf(env).then((instant) => (instant === undefined ? f() : WorldClock.within(instant, f)));

/** The same for an entry that answers at once (an RPC method): a real world still answers at once, with no promise made. */
export const withinNow = <A>(env: EntryEnv, f: () => A): A | Promise<A> =>
  WorldClock.declared(env).kind === "real" ? f() : instantOf(env).then((instant) => (instant === undefined ? f() : WorldClock.within(instant, f)));

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
