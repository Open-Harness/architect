// Events: what a move emits. An event is named by its export, `export const AllowanceGranted = Blueprint.event({...})`.
import type { Schema } from "effect";
import type { AnyErrorClass } from "#modules/errors/types.js";
import type { FieldsInput, ValueOf } from "#modules/things/types.js";

export interface Event<F extends FieldsInput = FieldsInput> {
  readonly kind: "event";
  readonly fields: F;
  readonly schema: Schema.Struct<{ readonly [K in keyof F]: ValueOf<F[K]>["schema"] }>;
}

/**
 * One delivery: an operation that runs, as the `to` of an outbox hop, for each commit that emits `event`. `map` says what
 * the call is given from the event's fields. A hop that fails with `onRefused.error` is done, and `onRefused.then` runs
 * in its place (GOAL17-executor-slots, section 5). The runtime that drains the outbox is Goal 11's; the model records what is declared.
 */
export interface On<E extends Event = Event> {
  readonly kind: "on";
  readonly event: E;
  readonly map: (event: never) => unknown;
  readonly onRefused: { readonly error: AnyErrorClass; readonly then: unknown } | undefined;
}

export interface EventsApi {
  readonly event: <const F extends FieldsInput>(fields: F) => Event<F>;
  /** An operation's `on:` entry, and a mount's `on` verb: `Blueprint.on(InputStored, (e) => ({ ticket: e.ticket }))`. */
  readonly on: <E extends Event>(
    event: E,
    map: (event: { readonly [K in keyof E["fields"]]: ValueOf<E["fields"][K]>["schema"]["Type"] }) => unknown,
    options?: { readonly onRefused?: { readonly error: AnyErrorClass; readonly then: unknown } },
  ) => On<E>;
}

/** Called only by generated code and the compiler: gives an event the name of its export. */
export interface EventNaming {
  readonly name: (event: Event, name: string) => void;
  readonly nameOf: (event: Event) => string | undefined;
}
