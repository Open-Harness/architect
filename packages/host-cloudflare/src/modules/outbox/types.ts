// The event outbox (M5-reach-out Q1, Q3, Q5; GOAL17-pause; GOAL17-outbox): a row per declared `Blueprint.on` hop, written in the commit that
// journals the event, and a drain that calls each hop's operation as the system, in order, with retry and backoff, counted as the world's work.
import type { Effect } from "effect";
import type { Busy } from "@orthograph/language-effect";
import type { fanout as fanoutOf } from "./internal/fanout.ts";
import type { AnyErrorClass, Event, Principal } from "orthograph";

/** What the commit needs to know about one hop: where it goes and, when a hold may park it, the hold and the event field that names what is held. */
export interface HopRow {
  /** `op:<operation>`: the subscriber, as a row names it. */
  readonly to: string;
  readonly hold?: { readonly by: string; readonly field: string };
}

/** The hops by the name of the event that fans out to them. */
export type HopTable = ReadonlyMap<string, ReadonlyArray<HopRow>>;

/** One declared hop at runtime: the event, the operation it calls, how the payload is made, and what to do when the operation refuses. */
export interface Hop {
  readonly name: string;
  readonly event: Event;
  /** The operation's name: `superagent.fill`. */
  readonly to: string;
  readonly map: (event: never, meta: never) => unknown;
  /** `then`: the name of the operation that runs in the refused call's place. */
  readonly onRefused: { readonly error: AnyErrorClass; readonly then: string } | undefined;
}

/** A served operation as the drain calls it: with the delivery's key, whatever the operation says of `idempotent`. */
export interface Served<R> {
  readonly run: (payload: never, principal: Principal, request?: string, delivery?: string) => Effect.Effect<unknown, unknown, R>;
}

/** One database the outbox lives in, with the prefix its event ids carry (`evt_`, and `evt_<binding>_` for a declared store). */
export interface OutboxDb {
  readonly db: D1Database;
  readonly prefix: string;
}

/** M5-reach-out Q5.1: the first retry after `backoff`, doubling to `max`, for `attempts` tries; a claim not renewed within `lease` is taken again. */
export interface Policy {
  readonly backoff: number;
  readonly max: number;
  readonly attempts: number;
  readonly lease: number;
}

export const POLICY: Policy = { backoff: 1_000, max: 3_600_000, attempts: 15, lease: 30_000 };

export type RowState = "pending" | "claimed" | "delivered" | "refused" | "failed";

/** A row as the world's door shows it (`outbox.rows`). */
export interface OutboxRow {
  readonly event: string;
  readonly name: string;
  readonly to: string;
  readonly subject: string;
  readonly seq: number;
  readonly state: RowState;
  readonly attempts: number;
  readonly due: string;
  readonly hold: string | null;
  readonly outcome: string | null;
}

export interface DrainOptions<R> {
  readonly dbs: ReadonlyArray<OutboxDb>;
  readonly hops: ReadonlyArray<Hop>;
  /** Each operation by name. */
  readonly served: Readonly<Record<string, Served<R>>>;
  /** The hold names in use (`processing`): each has a `_hold_<name>` view in the database of the thing it holds. */
  readonly holds: ReadonlyArray<string>;
  /** The pass is over: the earliest instant a row is due again, or nothing. The caller sets its timer for it, through `Timers`. */
  readonly next: (at: number | undefined) => Effect.Effect<void, never, R>;
  readonly policy?: Policy;
}

export interface OutboxApi {
  /** The hops declared by operations (`on:`) and by mounts (an `on` verb), each operation by its name. */
  readonly hopsOf: (declared: ReadonlyArray<readonly [string, unknown]>, mounts: ReadonlyArray<{ readonly verbs: ReadonlyArray<unknown> }>) => ReadonlyArray<Hop>;
  /** One pass: deliver every row due now, in order. Counted work. */
  readonly drain: <R>(options: DrainOptions<R>) => Effect.Effect<void, never, R | Busy>;
  /** The statements that write an entry's rows, one per hop its event fans out to, to run after the entry's journal row in the same batch. */
  readonly fanout: typeof fanoutOf;
  /** `/_world/outbox*`: the rows, a hold, a release, a redelivery and the mark. The server serves it only where it hosts worlds. */
  readonly door: (dbs: ReadonlyArray<OutboxDb>, request: Request) => Promise<Response> | undefined;
}
