// Every entry that runs app code reads its world's instant and wraps itself (M8.05, M8.06): the Worker's `fetch`,
// `scheduled` and `queue`, each Durable Object's `fetch`, RPC and `alarm`, a Workflows step. The caller's world does not
// travel into another object's request, so each entry looks up its own, from the world's Durable Object. A real world
// skips all of it: no lookup, no patch.
import { Effect } from "effect";
import { makeBox, type BusyBox } from "@orthograph/language-effect";
import { WorldClock } from "#modules/clock/service.js";
import type { ClockSource } from "#modules/clock/types.js";
import type { WorldTimersRpc } from "#modules/timers/types.js";
import type { EntryEnv } from "../types.ts";
import { live } from "./leases.ts";

/** What the Worker calls on its world's Durable Object, over RPC. */
export interface Keeper extends WorldTimersRpc {
  readonly source: () => Promise<ClockSource | undefined>;
  /** An entry begins: the world takes a token for it under `owner` and answers it with the source its request reads time from. */
  readonly begin: (owner: string) => Promise<{ readonly source: ClockSource | undefined; readonly token: string | undefined }>;
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

/**
 * Run `f` in this request's world: `Date` and Effect's `Clock` read the world's time, and the world holds one token for the request
 * (`owner`, `entry:<path>`) from the moment it arrives until `f` ends, so nothing that is in flight goes uncounted: a read, the
 * portal, a sign-in, an operation, its retries, its authorization and its commit. A sleep lends the token out and takes it back
 * (`Busy.lend`); the entry's own end gives it back. A real world runs `f` as it is.
 */
export const within = <A>(env: EntryEnv, f: () => Promise<A>, owner = "entry:step"): Promise<A> => {
  if (WorldClock.declared(env).kind === "real") return f();
  return keeperOf(env).then((keeper) =>
    keeper.begin(owner).then(({ source, token }) => {
      if (source === undefined) return (token === undefined ? Promise.resolve() : Promise.resolve(keeper.countLeave(token))).then(f);
      const box = makeBox(owner, { pinned: true, ...(token === undefined ? {} : { id: token }) });
      return WorldClock.entered(source, box, f, (ended) => endRequest(keeper, ended));
    }));
};

/**
 * The entry is over: the box is no longer pinned, and if no fiber of it is running (every one lent, or none) its token goes back. A
 * fiber still running (work detached from the response) keeps the token, and gives it back itself when it ends.
 */
const endRequest = (keeper: Keeper, box: BusyBox): Promise<unknown> =>
  // Under the box's own gate, so it cannot end between a fiber's take of the box's token and the record of it: that token would never be released.
  Effect.runPromise(box.gate.withPermits(1)(Effect.sync(() => {
    box.pinned = false;
    if (box.id === undefined || box.holders > box.lent) return undefined;
    const id = box.id;
    box.id = undefined;
    return id;
  }))).then((id) => (id === undefined ? undefined : keeper.countLeave(id)));

/** The same for an entry that answers at once (an RPC method): a real world still answers at once, with no promise made. */
export const withinNow = <A>(env: EntryEnv, f: () => A, owner = "entry:rpc"): A | Promise<A> =>
  WorldClock.declared(env).kind === "real" ? f() : within(env, () => Promise.resolve(f()), owner);

/**
 * A Worker's entry, wrapped. `/_world/*` is the world's own door: the Durable Object wraps what reads the world's time,
 * and the registry of worlds keeps real time (a world's lifetime is the machine's, K23 section 1), so it is not wrapped here.
 */
export const entry = <Env extends EntryEnv>(handler: ExportedHandler<Env>): ExportedHandler<Env> => {
  return {
    ...handler,
    ...(handler.fetch === undefined
      ? {}
      : { fetch: (request, env, ctx) => (new URL(request.url).pathname.startsWith("/_world/") ? handler.fetch!(request, env, ctx) : within(env, () => Promise.resolve(handler.fetch!(request, env, ctx)), `entry:${new URL(request.url).pathname}`)) }),
    ...(handler.scheduled === undefined ? {} : { scheduled: (controller, env, ctx) => within(env, () => Promise.resolve(handler.scheduled!(controller, env, ctx)), "entry:scheduled") }),
    ...(handler.queue === undefined ? {} : { queue: (batch, env, ctx) => within(env, () => Promise.resolve(handler.queue!(batch, env, ctx)), "entry:queue") }),
  };
};
