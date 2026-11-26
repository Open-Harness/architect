// One attempt at a call, as the operations it runs share it (#1079, CX-inner-operations): the unit every write is held in, the caller, and the
// journal entries the moves made so far, in the order made. An inner operation runs in its outer's attempt and never commits on its own.
import { Data, type Effect } from "effect";
import type { Principal } from "orthograph";
import type { Entry } from "#modules/journal/types.js";
import type { Unit } from "#modules/records/types.js";

/** An update's version had moved on, so this attempt committed nothing. Never leaves the wrapper: the whole call runs again. */
export class Conflict extends Data.TaggedError("Conflict")<{}> {}

export interface Attempt {
  readonly unit: Unit;
  readonly principal: Principal;
  /** Every move's entry this attempt has made so far: an inner operation's join the outer's, and the commit writes them all. */
  readonly journal: Array<Entry>;
}

/** What a served operation offers the operations that run it: its pipeline, run inside their attempt, and every refusal it can make. */
export interface Inner {
  readonly name: string;
  readonly operation: unknown;
  readonly run: (payload: object, attempt: Attempt) => Effect.Effect<object, unknown, unknown>;
  /** Its refusals, its own inner operations' included; never `IdempotencyConflict`, since run inside another it keeps no request key. */
  readonly refusals: ReadonlySet<string>;
}

/** Where a served operation keeps its `Inner`: not part of `Served`'s public shape, which callers outside the runtime use. */
export const INNER = Symbol.for("@orthograph/language-effect/Inner");

export const innerOf = (served: unknown): Inner | undefined =>
  typeof served === "object" && served !== null && INNER in served ? (served as { readonly [INNER]: Inner })[INNER] : undefined;
