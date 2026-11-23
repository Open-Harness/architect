// The world: one Durable Object per running world. Its front door is `/_world/*`. It keeps the cast, signing each
// one up for real through Better Auth; the clock and the registry of things join it in stage five.
import type { CastMember } from "#modules/auth/types.js";

export interface WorldEnv {
  readonly DB: D1Database;
  /** Better Auth's secret. Made fresh by `ortho dev` for each run; never written to a file. */
  readonly AUTH_SECRET: string;
  /** Made fresh by `ortho dev`: its health answer says it, and a reset must present it (a record of dev is no one else's world). */
  readonly ORTHO_WORLD_NONCE?: string;
}

/**
 * `POST /_world/cast` with `{ names, anonymous? }`: each name signed up once (kept for the world's life) and signed in
 * afresh. A name in `anonymous` only gets an email and a password, so a script can sign them up itself.
 */
export interface Cast {
  readonly [name: string]: CastMember;
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
  /** This environment hosts worlds with lifetimes (a test environment): `/_world/worlds` is open, and each world is its own Durable Object. */
  readonly leases?: boolean;
}
