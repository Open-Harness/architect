// Refusals on the wire. A handler fails with the blueprint's error classes; the API sends the generated wire classes,
// matched by name, carrying the same fields.
import type { Effect } from "effect";
import type { FieldsInput, Operation, Principal, Read, Role, Thing } from "orthograph";
import type { Store } from "#modules/records/types.js";

/** The generated wire classes, by error name. */
export type WireClasses = { readonly [name: string]: (new (fields: never) => unknown) & {
  /** The refusal's code, `AL-002`: the thing's prefix and a number the model fixed. */
  readonly code: string;
} };

/** What an outcome is cut by: an operation or a read, with its declared answer. */
export type ShownOperation = Operation | Read<Thing, unknown, unknown>;

export interface WireApi {
  /** Turn each declared error into its wire class. An error with no wire class was never declared: it dies. */
  readonly refusals: (classes: WireClasses) => <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, unknown, R>;
  /**
   * What the caller is shown of the call's outcome: the answer cut by the visibility rule (a secret only if the call issued
   * it, a private field only to a holder of its role), and a declared refusal's fields likewise. Undeclared fields never
   * leave. `declared` is each declared refusal's class, by name; any other refusal carries public values only.
   */
  readonly shown: (declared: { readonly [tag: string]: { readonly fields: FieldsInput } }) => (
    served: { readonly operation: ShownOperation },
    payload: object,
    principal: Principal,
  ) => <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<Partial<A>, unknown, R | Store>;
  /** The roles the caller holds in this call, asked only when some field in `groups` is private to roles. */
  readonly held: (op: ShownOperation, payload: object, principal: Principal, ...groups: ReadonlyArray<FieldsInput>) => Effect.Effect<ReadonlyArray<Role>, never, Store>;
}
