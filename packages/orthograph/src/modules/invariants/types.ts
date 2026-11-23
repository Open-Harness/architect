// Invariants: what stays true among many records of one thing (G5). A rule is one named export of a thing's `invariants.ts`.
import type { AnyErrorClass, ErrorClass } from "#modules/errors/types.js";
import type { State } from "#modules/machines/types.js";
import type { Field, FieldsInput } from "#modules/things/types.js";
import type { Value } from "#modules/values/types.js";

/** The decoded type a field holds. */
type TypeOfField<Fl extends Field<any, any, any>> = Fl["value"]["schema"]["Type"];

/** The fields of the thing a field belongs to, from its type. */
type ThingOf<Fl extends Field<any, any, any>> = Fl extends Field<any, any, infer F> ? F : never;

/** What `Records.findBy(rule, value)` takes: the field's own type, or an object of the fields for a composite key. */
export type KeyOf<Fs extends ReadonlyArray<Field<any, any, any>>> = Fs extends readonly [infer Only extends Field<any, any, any>]
  ? TypeOfField<Only>
  : { readonly [Fl in Fs[number] as Fl["key"]]: TypeOfField<Fl> };

/** Every rule: its form, and what the compiler needs to read it. `~thing` and `~key` are type only. */
export interface Invariant<F extends FieldsInput = FieldsInput> {
  readonly kind: "invariant";
  readonly form: string;
  readonly "~thing"?: F;
}

/** One value held by at most one instance of the thing, within the states it is `while`; every state when it has none. */
export interface Unique<F extends FieldsInput = FieldsInput, Key = unknown> extends Invariant<F> {
  readonly form: "unique";
  /** The key: one field, or the fields of a composite key, in the order written. */
  readonly fields: readonly [Field, ...Array<Field>];
  readonly while: ReadonlyArray<State> | undefined;
  /** The thing's own error the runtime refuses with; absent when no caller can break the rule. */
  readonly refuse: AnyErrorClass | undefined;
  /** Words that replace the sentence generated from the rule. */
  readonly description: string | undefined;
  /** Breaking it means the call lost a race (a second save of a version, a second eval on a thread): the call runs again and meets what the winner made, never a defect. `refuse` is then not needed. */
  readonly retry?: true;
  readonly "~key"?: Key;
}

/** What may follow the key. The refusal's fields must all be among the key's (`Ks`). */
export interface UniqueOptions<F extends FieldsInput, Ks extends string, E extends FieldsInput> {
  readonly while?: ReadonlyArray<State<string, F>>;
  readonly refuse?: ErrorClass<E> & ([Exclude<keyof E & string, Ks>] extends [never] ? unknown : never);
  readonly description?: string;
  /** Breaking it means a lost race: the call runs again and meets what the winner made. For a rule no caller names a refusal for. */
  readonly retry?: true;
}

export interface InvariantsApi {
  readonly invariant: {
    readonly unique: {
      <V extends Value, K extends string, F extends FieldsInput, E extends FieldsInput = {}>(
        key: Field<V, K, F>,
        options?: UniqueOptions<F, K, E>,
      ): Unique<F, V["schema"]["Type"]>;
      <const Fs extends readonly [Field<any, any, any>, ...Array<Field<any, any, any>>], E extends FieldsInput = {}>(
        key: Fs & readonly [Field<any, any, ThingOf<Fs[0]>>, ...Array<Field<any, any, ThingOf<Fs[0]>>>],
        options?: UniqueOptions<ThingOf<Fs[0]>, Fs[number]["key"], E>,
      ): Unique<ThingOf<Fs[0]>, KeyOf<Fs>>;
    };
  };
}
