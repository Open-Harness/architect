import { DurableObject } from "cloudflare:workers";
import { Clock, Effect } from "effect";
import type { WorldEnv, WorldHost } from "./types.ts";
import { frontDoor, RESET_HEADER } from "./internal/front-door.ts";
import { AuthD1 } from "#modules/auth/service.js";
import type { AuthInstance } from "#modules/auth/types.js";
import { WorldClock } from "#modules/clock/service.js";
import type { ClockSource, ClockState } from "#modules/clock/types.js";
import { WorldTimers } from "#modules/timers/service.js";
import type { WorldTimersRpc, WorldTimersState, WorldWakes } from "#modules/timers/types.js";
import { entry, within, withinNow } from "./internal/entry.ts";
import { facts } from "./internal/facts.ts";
import { end, live } from "./internal/leases.ts";
import { resetDatabases } from "./internal/reset.ts";
import { worldsDoor } from "./internal/worlds.ts";
import { work } from "./internal/work.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/**
 * The world's Durable Object. Export it from the Worker's entry; bind it as `WORLD`. In a long-lived environment each
 * world is its own instance, named by the world's id: it holds the cast, and an alarm at the world's expiry that
 * destroys it (D3 #7, #50). Under `ortho dev` and a local prove there is the one, named `world`, and no alarm.
 */
export class World extends DurableObject<WorldEnv> {
  private readonly auth: AuthInstance;
  /** The world's instant (M8.06): the wall clock, or the one it keeps in its own storage. */
  private readonly clock: ClockState;
  /** The world's timer table and count of work in flight (M8.07). */
  private readonly timers: WorldTimersState;

  constructor(ctx: DurableObjectState, env: WorldEnv) {
    super(ctx, env);
    this.clock = WorldClock.state(ctx.storage.sql, WorldClock.declared(env));
    const kinds = this.wakeKinds();
    // A due durable row is woken by its kind's code, here in the world's own isolate and in the world's time (fresh source).
    const wakes = kinds === undefined ? undefined : WorldTimers.route(kinds);
    this.timers = WorldTimers.state({
      sql: ctx.storage.sql, clock: this.clock, env, changed: () => void this.schedule(),
      ...(wakes === undefined ? {} : { wakes: (timer) => Effect.promise(() => this.inTime(() => Effect.runPromise(wakes(timer)))) }),
    });
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS cast (name TEXT PRIMARY KEY, person TEXT, email TEXT NOT NULL, password TEXT NOT NULL)");
    this.auth = AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET, worlds: true });
  }

  /**
   * Which code wakes each kind of durable timer (M8.07). The generated Worker for a blueprint with a stepped or scaled clock
   * extends this class and answers its wake map, empty until a feature registers a kind; no map, no route, and a due row fails.
   */
  protected wakeKinds(): WorldWakes | undefined {
    return undefined;
  }

  override fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/_world/arm" || pathname === "/_world/end") {
      return request.json().then((body) => (pathname === "/_world/arm" ? this.arm(body as { id: string; expires: number }) : this.finish(body as { id: string; reason: "destroyed" | "expired" })));
    }
    const clock = WorldClock.door(this.clock, request, this.timers.controller);
    if (clock) return clock;
    // The cast signs up and in through Better Auth, which reads `Date`: at the world's instant, not the machine's.
    const answered = this.inTime(() => Effect.runPromise(frontDoor(this.ctx.storage.sql, this.auth, request, this.env.ORTHO_WORLD_NONCE)));
    // The warm reset between runs (ST1.24) is the one way back: the clock returns to its declared start, a scaled one re-anchored now.
    // Only the reset the world itself accepted (its nonce matched) does it.
    return pathname === "/_world/reset" && request.method === "POST" ? answered.then((response) => { if (response.ok) { this.clock.reset(); this.timers.reset(); } return response; }) : answered;
  }

  /** The world's instant now. */
  now(): number {
    return this.clock.now();
  }

  /** An entry begins (M8.07): the world counts it under `owner` (`entry:<path>`) and answers the source its request reads time from. */
  begin(owner: string): ClockSource | undefined {
    if (this.clock.kind !== "real") this.timers.rpc.countEnter(owner);
    return this.clock.source();
  }

  /** What to read the world's time from. Every other entry (the Worker, the actors) asks this over RPC, once, to run in this world's time. */
  source(): ClockSource | undefined {
    return this.clock.source();
  }

  private inTime<A>(f: () => Promise<A>): Promise<A> {
    const source = this.clock.source();
    return source === undefined ? f() : WorldClock.within(source, f);
  }

  /** Remember the world's id and wake at its expiry. */
  private arm({ id, expires }: { readonly id: string; readonly expires: number }): Promise<Response> {
    return this.ctx.storage.put({ world: id, expires }).then(() => this.schedule()).then(() => json({ armed: id }));
  }

  /**
   * The one alarm a Durable Object has: the world's lifetime, or in a real world the earliest timer, whichever is first.
   * A stepped or scaled world sets no alarm for timers: its controller fires them (M8.07).
   */
  private schedule(): Promise<void> {
    return this.ctx.storage.get<number>("expires").then((expires) => {
      const next = [expires, this.timers.nextAlarm()].filter((at): at is number => at !== undefined);
      return next.length === 0 ? undefined : this.ctx.storage.setAlarm(Math.min(...next));
    });
  }

  /** Delete what the world made, then everything the world itself holds, alarm included. */
  private finish({ id, reason }: { readonly id: string; readonly reason: "destroyed" | "expired" }): Promise<Response> {
    return Effect.runPromise(Clock.currentTimeMillis.pipe(Effect.flatMap((now) => end(this.env.DB, id, reason, now)))).then((ended) =>
      this.ctx.storage.deleteAlarm().then(() => this.ctx.storage.deleteAll()).then(() => json({ ended })));
  }

  /** The world's own lifetime: real time, never the world's (K23 section 1), so it is the one entry that is not wrapped. */
  override alarm(): Promise<void> {
    return this.ctx.storage.get<string | number>(["world", "expires"]).then((kept) => {
      const id = kept.get("world") as string | undefined;
      const expires = kept.get("expires") as number | undefined;
      // A world armed before the expiry was kept ends at its alarm, as it always did; otherwise the alarm is a timer's.
      if (id !== undefined && (expires === undefined || WorldClock.wall() >= expires)) return this.finish({ id, reason: "expired" }).then(() => undefined);
      // The timer alarm runs app code, so it wraps itself in its world's time (a real world's `inTime` is a plain call).
      return this.inTime(() => Effect.runPromise(this.timers.fireDue())).then(() => this.schedule());
    });
  }

  // What the Worker and every other process call on the world (M8.07): the count of work in flight and the timer table.
  countEnter(owner: string): void { return this.timers.rpc.countEnter(owner); }
  countLeave(owner: string): void { return this.timers.rpc.countLeave(owner); }
  timerAdd(...args: Parameters<WorldTimersRpc["timerAdd"]>): number { return this.timers.rpc.timerAdd(...args); }
  timerWait(id: number): ReturnType<WorldTimersRpc["timerWait"]> { return this.timers.rpc.timerWait(id); }
  timerCancel(id: number): boolean { return this.timers.rpc.timerCancel(id); }
  timerSet(...args: Parameters<WorldTimersRpc["timerSet"]>): number { return this.timers.rpc.timerSet(...args); }
  timerClear(...args: Parameters<WorldTimersRpc["timerClear"]>): boolean { return this.timers.rpc.timerClear(...args); }
  timersSleeping(): ReturnType<WorldTimersRpc["timersSleeping"]> { return this.timers.rpc.timersSleeping(); }
  timersDurable(): ReturnType<WorldTimersRpc["timersDurable"]> { return this.timers.rpc.timersDurable(); }
}

/**
 * Every entry that runs app code wraps itself in its world's time (M8.06). `entry` wraps a Worker's `fetch`, `scheduled`
 * and `queue`; `within` wraps any other promise-returning entry (a Workflows step), and `withinNow` an RPC method that
 * answers at once. A real world runs each as it is.
 */
export const WorldEntry = { entry, within, withinNow, work };
export type { WorldWakes };

/**
 * A `/_world/*` request. Facts come straight from the database. `/_world/worlds` is the environment's registry of worlds,
 * which only an environment that hosts worlds (`leases`) has. Anything else goes to the live world's own Durable Object
 * in such an environment, and otherwise to the one world of this deployment.
 */
export const toWorld = (world: WorldHost, request: Request): Promise<Response> => {
  const { pathname } = new URL(request.url);
  if (pathname.startsWith("/_world/facts/")) return Effect.runPromise(facts(world, request));
  // A warm world is emptied between runs (ST1.24); a world with leases ends by its own lease instead. The header makes the
  // request one a browser page cannot send cross-origin without a preflight; the world checks its value against its own.
  if (pathname === "/_world/reset" && request.method === "POST") {
    if (world.leases) return Promise.resolve(json({ error: "a world with leases is ended, not reset" }, 404));
    if (!request.headers.get(RESET_HEADER)) return Promise.resolve(json({ error: `a reset names its world in ${RESET_HEADER}` }, 400));
    return world.worlds.get(world.worlds.idFromName("world")).fetch(request).then((cast) =>
      cast.ok
        ? (cast.json() as Promise<{ readonly people: ReadonlyArray<string> }>).then(({ people }) => Effect.runPromise(resetDatabases(world, people))).then(() => json({ reset: true }))
        : cast);
  }
  if (!world.leases) return world.worlds.get(world.worlds.idFromName("world")).fetch(request);
  if (pathname.startsWith("/_world/worlds")) return Effect.runPromise(worldsDoor({ worlds: world.worlds, db: world.db }, request));
  return Effect.runPromise(live(world.db)).then((held) => world.worlds.get(world.worlds.idFromName(held[0]?.id ?? "world")).fetch(request));
};
