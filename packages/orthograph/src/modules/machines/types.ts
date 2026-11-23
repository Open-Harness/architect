// Machines: a thing's states and the moves between them. Moves take their names from their keys.
import type { Event } from "#modules/events/types.js";
import type { FieldsInput, Thing } from "#modules/things/types.js";
import type { Assertion } from "#modules/journeys/types.js";
import type { Span, TimeBy } from "#modules/time/types.js";

export interface MoveSpec<S extends string> {
  /** The states it may start from; `[]` means it creates the thing. */
  readonly from: ReadonlyArray<S>;
  /** Where it ends: one state, or a list when the handler chooses the outcome. */
  readonly to: S | ReadonlyArray<S>;
  readonly emits: Event;
  /** When the move happens by itself, fired by the keeper: `Blueprint.time.every(...)` or `Blueprint.time.after(...)` (K23 section 3). */
  readonly by?: TimeBy;
  /** How long after its due instant a move made by time may still run on time. None means it must run exactly when due. */
  readonly late?: Span;
  /** Worked out at the thing's next use instead of fired by the keeper. */
  readonly lazy?: boolean;
}

export interface Move<S extends string = string, To extends S = S, From extends ReadonlyArray<S> = ReadonlyArray<S>> {
  readonly kind: "move";
  readonly machine: Machine;
  readonly key: string;
  /** The literal tuple the machine declared (`[]`, `["active"]`), so a handler's types can tell a creating move from the rest. */
  readonly from: From;
  readonly to: ReadonlyArray<To>;
  readonly emits: Event;
  /** Present only on a move made by time. */
  readonly by?: TimeBy;
  readonly late?: Span;
  readonly lazy?: boolean;
}

/** The machine's own refusal: a move called from a state it can't start from. Generated as `<Thing>Not<State>`. */
export interface NotFrom {
  readonly kind: "not-from";
  readonly machine: Machine;
  readonly exit: number;
}

/** One state of a machine, as a reference a rule names (`machine.states.claimed`); `F` is its thing's fields, type only (G5). */
export interface State<S extends string = string, F extends FieldsInput = FieldsInput> {
  readonly kind: "state";
  readonly machine: Machine;
  readonly key: S;
  readonly "~thing"?: F;
}

export interface Machine<
  S extends string = string,
  Mv extends Record<string, MoveSpec<S>> = Record<string, MoveSpec<S>>,
  F extends FieldsInput = FieldsInput,
> {
  readonly kind: "machine";
  readonly thing: Thing;
  /** The states as references, by name (G5). Empty when the declaration is a blank; `declared` holds the blank. */
  readonly states: { readonly [K in S]: State<K, F> };
  /** What the declaration wrote: its array of state names, or the blank (`Blueprint.todo`). The compiler reads this. */
  readonly declared: ReadonlyArray<S>;
  readonly moves: { readonly [K in keyof Mv]: Move<S, ToOf<Mv[K]["to"]> & S, Mv[K]["from"]> };
  readonly notFrom: NotFrom;
  /** A journey check: the instance with this id is in `state` once the step's call has come back. */
  readonly isIn: (id: unknown, state: S) => Assertion;
}

type ToOf<T> = T extends ReadonlyArray<infer X> ? X : T;

export interface MachinesApi {
  readonly machine: <const S extends string, const Mv extends Record<string, MoveSpec<S>>, F extends FieldsInput = FieldsInput>(
    thing: Thing<F>,
    spec: { readonly states: ReadonlyArray<S>; readonly moves: Mv; readonly notFrom: { readonly exit: number } },
  ) => Machine<S, Mv, F>;
}
