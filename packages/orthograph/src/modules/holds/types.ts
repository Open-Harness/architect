// Holds (GOAL17-pause): one switch that holds work a thing's own state says to hold. The thing's plugin declares the switch;
// the app lists what it holds, because only the app knows every plugin whose events cross the outbox.
import type { Event } from "#modules/events/types.js";
import type { State } from "#modules/machines/types.js";
import type { Operation, Read } from "#modules/operations/types.js";
import type { Field, Thing } from "#modules/things/types.js";

/** One delivery: an event, and the operation its outbox hop calls. */
export interface Delivery {
  readonly event: Event;
  readonly to: Operation | Read;
}

/** A delivery that is not held, and why. */
export interface Unheld extends Delivery {
  readonly reason: string;
}

export interface Held {
  readonly kind: "holds";
  readonly hold: Hold;
  /** Waits while the switch is on: the row stays pending, and the drain skips it. */
  readonly held: ReadonlyArray<Delivery>;
  /** Runs while the switch is on, each with its reason. */
  readonly unheld: ReadonlyArray<Unheld>;
}

export interface Hold<T extends Thing = Thing> {
  readonly kind: "hold";
  readonly thing: T;
  /** The field that names what is held: an event's `superagent` is compared with it. */
  readonly key: Field;
  /** The states in which the switch is on. */
  readonly while: ReadonlyArray<State>;
  /** The app's lists, every delivery of an event that carries the key in one of them. */
  readonly holds: (lists: { readonly held: ReadonlyArray<Delivery>; readonly unheld: ReadonlyArray<Unheld> }) => Held;
}

export interface HoldsApi {
  /** `export const processing = Blueprint.hold(Superagent, { key: Superagent.fields.id, while: [machine.states.paused] })`. */
  readonly hold: <T extends Thing>(thing: T, spec: { readonly key: Field; readonly while: ReadonlyArray<State> }) => Hold<T>;
}
