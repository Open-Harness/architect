// The doors: what a Worker serves at `/_in/<mount>` for each adapter that receives events (M5-reach-out Q2, built in Goal 17 slice 11).
import type { Context } from "effect";
import type { Adapter, SourceKind } from "orthograph";

/** One door: the mount it is for, the adapter that says how it verifies and reads, the events the mount includes, and the secret's name in the environment. */
export interface Door {
  readonly mount: string;
  readonly adapter: Adapter<any, any, any>;
  readonly events: ReadonlyArray<string>;
  /** The active sources that map this adapter's events: a delivery none of them takes (a comment deleted, an issue labeled) is acknowledged and ignored. None: every included event is taken. */
  readonly sources: ReadonlyArray<SourceKind<any>>;
  /** `<MOUNT>_WEBHOOK_SIGNING`: the binding that holds the signing secret. */
  readonly secret: string;
}

export interface InboundOptions {
  readonly doors: ReadonlyArray<Door>;
  /** The default database: the inbox is its journal. */
  readonly db: D1Database;
  /** The Worker's bindings, from which each door's secret is read by name. */
  readonly secrets: Readonly<Record<string, unknown>>;
}

export interface InboundApi {
  /**
   * One request to `/_in/<mount>`. 404 for a mount without a door, 405 for any method but POST, 401 `{ _tag: "BadSignature" }`
   * for a signature that does not verify (nothing written), and otherwise 200 with `{ accepted: true }`, `{ seen: true }`
   * or `{ ignored: true }` (or a handshake's answer). Each delivery is judged by the event's own identity, never the
   * sender's delivery id; an accepted one is one row of the journal, in the request's trace.
   */
  readonly handle: (options: InboundOptions, request: Request, context?: Context.Context<never>) => Promise<Response>;
}
