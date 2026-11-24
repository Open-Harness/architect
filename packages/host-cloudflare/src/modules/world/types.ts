// The world: one Durable Object per running world. Its front door is `/_world/*`. It keeps the cast, signing each
// one up for real through Better Auth; its clock (M8.06) answers at `/_world/clock`; the registry of things joins it in stage five.
import type { CastMember } from "#modules/auth/types.js";
import type { OutboxDb } from "#modules/outbox/types.js";

export interface WorldEnv {
  readonly DB: D1Database;
  /** Better Auth's secret. Made fresh by `ortho dev` for each run; never written to a file. */
  readonly AUTH_SECRET: string;
  /** Made fresh by `ortho dev`: its health answer says it, and a reset must present it (a record of dev is no one else's world). */
  readonly ORTHO_WORLD_NONCE?: string;
  /** How worlds tell time (M8.06): each environment's clock as JSON. Absent, or no entry for this environment: real. */
  readonly ORTHO_CLOCKS?: string;
  readonly ORTHO_ENVIRONMENT?: string;
  /** How long a move waits for the world to be quiet, in real milliseconds, before it fails as `NeverQuiet` (M8.07). Five seconds when unset. */
  readonly ORTHO_QUIET_MS?: string;
  /** The most timers one move may fire at one instant before it fails as `NeverQuiet`, naming who keeps registering them. 10 000 when unset. */
  readonly ORTHO_FIRE_LIMIT?: string;
}

/**
 * `POST /_world/cast` with `{ names, anonymous? }`: each name signed up once (kept for the world's life) and signed in
 * afresh. A name in `anonymous` only gets an email and a password, so a script can sign them up itself.
 */
export interface Cast {
  readonly [name: string]: CastMember;
}

/** What an entry needs from its bindings to find its world and its clock (M8.06). */
export interface EntryEnv {
  readonly WORLD: DurableObjectNamespace;
  readonly DB: D1Database;
  /** `1` in an environment that hosts worlds with lifetimes: the live world is its own instance, named by its id. */
  readonly ORTHO_WORLDS?: string;
  readonly ORTHO_CLOCKS?: string;
  readonly ORTHO_ENVIRONMENT?: string;
}

/** What `toWorld` needs from the Worker's bindings. */
export interface WorldHost {
  readonly worlds: DurableObjectNamespace;
  readonly db: D1Database;
  readonly tables: ReadonlyArray<string>;
  /** The declared database stores (K3): each its own binding, with the tables of the things that live in it. */
  readonly stores?: ReadonlyArray<{ readonly db: D1Database; readonly tables: ReadonlyArray<string> }>;
  /** The Durable Objects things that live as actors are kept in, and the tables they go by: their facts are read from the actor, never from D1. */
  readonly actors?: DurableObjectNamespace;
  readonly actorTables?: ReadonlyArray<string>;
  /** The databases the event outbox lives in, when the blueprint declares a hop: the outbox door answers from their `_outbox` rows. */
  readonly outbox?: ReadonlyArray<OutboxDb>;
  /**
   * The probes this world answers beyond its own doors, by the route under `/_world/` (`probe/agent/told`): each a handler a package's `testing.ts` exports
   * (GOAL17-check-harness, call 5). Only the world's own entry registers them; the production Worker's entry holds none, so a probe route is a 404 there.
   */
  readonly probes?: Readonly<Record<string, (request: Request, world: { readonly actors?: DurableObjectNamespace; readonly actorTables?: ReadonlyArray<string> }) => Promise<Response>>>;
  /** This environment hosts worlds with lifetimes (a test environment): `/_world/worlds` is open, and each world is its own Durable Object. */
  readonly leases?: boolean;
}
