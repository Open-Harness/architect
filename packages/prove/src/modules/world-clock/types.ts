// A journey's clock steps (M8.07): `s.clock.advance(span)` and `s.clock.moveTo(instant)` ask the world's own door to move
// its clock, and answer once the world is quiet at the target. The door's answer is the step's answer.
import type { Effect } from "effect";

/** A timer that ran on the way, as the world's door lists it. */
export interface FiredTimer {
  readonly due: string;
  readonly owner: string;
  readonly name: string;
}

/** What `GET /_world/clock` answers. */
export interface ClockReading {
  readonly kind: "real" | "stepped" | "scaled";
  readonly now: string;
  readonly timers: ReadonlyArray<{ readonly due: string; readonly owner: string; readonly name: string }>;
}

/** What a clock step is asked to do: a span in words, or an instant. */
export type ClockMove = { readonly advance: string } | { readonly moveTo: string };

/** The door's answer: its status, and `{ now, fired }` on 200, or the refusal (`ClockNotMovable`, `NeverQuiet`, `BadMove`) with its words. */
export interface Moved {
  readonly status: number;
  readonly body: unknown;
}

export interface WorldClockApi {
  /** The world's clock now; nothing when this world has no clock door (a deployed environment closes `/_world`) or does not answer. */
  readonly read: (url: string) => Effect.Effect<ClockReading | undefined>;
  /** Move the world's clock and settle it: the world answers once everything due on the way has run and it is quiet at the target. */
  readonly move: (url: string, move: ClockMove) => Effect.Effect<Moved>;
}
