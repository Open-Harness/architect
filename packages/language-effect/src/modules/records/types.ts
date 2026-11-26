// Records: a thing's stored instances. Two sides: the host's `Store`, which reads and commits, and the handler's
// `Records`, which reads through the store and holds its writes back until the call commits them with its move.
import { Context, type Effect } from "effect";
import type { AnyErrorClass, InstanceOf, Thing, Unique } from "orthograph";
import type { Entry } from "#modules/journal/types.js";

/** A thing's `Blueprint.optional` fields: those whose schema's key is optional. */
type OptionalKeys<T extends Thing> = {
  [K in keyof T["fields"]]: T["fields"][K]["value"]["schema"]["~type.optionality"] extends "optional" ? K : never;
}[keyof T["fields"]];

/**
 * A thing's fields, decoded: what a handler stores. A `Blueprint.optional` field may be left out, never written as `undefined`
 * (exact optional properties); every other field is required (snag #1044).
 */
export type FieldsOf<T extends Thing> = {
  readonly [K in keyof InstanceOf<T> as K extends "state" | OptionalKeys<T> ? never : K]: InstanceOf<T>[K];
} & { readonly [K in keyof InstanceOf<T> as K extends Exclude<OptionalKeys<T>, "state"> ? K : never]?: InstanceOf<T>[K] };

/** One stored instance: its fields, decoded, and its machine state when it has one. */
export type Instance = { readonly [field: string]: unknown; readonly state?: string };

/** An instance as the store holds it: with the version every update is guarded by. */
export interface Stored {
  readonly instance: Instance;
  readonly version: number;
}

/** One write in a commit. Fields are decoded; the store encodes them with the thing's own schema. */
export type Write =
  | { readonly kind: "insert"; readonly thing: Thing; readonly fields: Instance; readonly state: string | undefined }
  | {
      readonly kind: "update";
      readonly thing: Thing;
      readonly id: string;
      /** The version this call read. The update lands only if the stored version is still this one. */
      readonly version: number;
      readonly changes: Instance;
      readonly state: string | undefined;
    };

/** Everything one call changes: its writes and the events its move emitted, committed together or not at all. */
export interface Commit {
  readonly writes: ReadonlyArray<Write>;
  readonly entries: ReadonlyArray<Entry>;
  /** For an operation declared `idempotent: "request"`: its answer, kept under its request key in the same commit. */
  readonly request?: { readonly key: string; readonly answer: string };
  /** #764: each list the call read. The store answers `conflict` when the rows matching a list's `thing`, `where` and `state` are not these any more. */
  readonly lists?: ReadonlyArray<ListRead>;
  /** #1045: each row the call found, at the version it found it. The store answers `conflict` when one of them moved on. */
  readonly reads?: ReadonlyArray<RowRead>;
}

/** A row one call found (#1045): its thing, its id and the version it was read at. */
export interface RowRead {
  readonly thing: Thing;
  readonly id: string;
  readonly version: number;
}

/** A list one call read (#764): every row then matching its `thing`, `where` and `state`, whatever page the call asked for, at the version the call read it. */
export interface ListRead {
  readonly thing: Thing;
  readonly where: Instance;
  readonly state: string | undefined;
  readonly rows: ReadonlyArray<{ readonly id: string; readonly version: number }>;
}

/** `conflict`: an update's version had moved on, so nothing was written and the call runs again. */
export type Committed = "committed" | "conflict";

/** A page of a thing's instances: those matching every filter, in the order they were made, `limit` at most. */
export interface ListQuery {
  readonly thing: Thing;
  /** Fields that must equal these values (decoded). A filter on `state` is `state`, not here. */
  readonly where: Instance;
  readonly state: string | undefined;
  readonly order: "newest" | "oldest";
  readonly limit: number;
  /** The `next` of the page before: continue after the instance it names. */
  readonly after: string | undefined;
}

/** `next` names the last instance of this page when more follow it, and is null otherwise. */
export interface Listed {
  readonly items: ReadonlyArray<Instance>;
  readonly next: string | null;
}

/** A store's page: `Listed`, with each item's version and its place, the order rows were made in (`rows[i]` is `items[i]`'s). */
export interface Page extends Listed {
  readonly rows: ReadonlyArray<{ readonly version: number; readonly place: number }>;
}

/** A rule a store enforces and a unit looks through: the invariant as declared, and its full name (`handle.oneHolderPerName`), which a defect and a span quote. */
export interface NamedRule {
  readonly name: string;
  readonly rule: Unique;
}

/** The host's side. A failing store dies: it is never the caller's refusal. */
export class Store extends Context.Service<Store, {
  /** The rules this store enforces at commit (G5), as the model carries them; a unit made over it looks through the same ones. Absent when the project declares none. */
  readonly rules?: ReadonlyArray<NamedRule>;
  readonly find: (thing: Thing, id: string) => Effect.Effect<Stored | undefined>;
  /** One page of a thing's instances, in the order they were made (never a clock). A thing that lives as actors has none to list. */
  readonly list: (query: ListQuery) => Effect.Effect<Page>;
  /** Where a row sits in the order rows were made, as `list` gives it; undefined when there is none. */
  readonly place: (thing: Thing, id: string) => Effect.Effect<number | undefined>;
  /** `conflict` too when another call committed the same request key first: the retry then finds its answer. */
  readonly commit: (commit: Commit) => Effect.Effect<Committed>;
  /** The answer already committed under a request key, as wire JSON, if there is one. */
  readonly answered: (key: string) => Effect.Effect<string | undefined>;
}>()("@orthograph/language-effect/Store") {}

/** The handler's side, during one attempt at a call. */
export class Records extends Context.Service<Records, {
  /** The instance of `thing` with this id, or undefined: what this call's own writes left it as, else the store's. */
  readonly find: (thing: Thing, id: string) => Effect.Effect<Instance | undefined>;
  /** The one instance holding `value` under a unique rule, within its scope: what this call's own writes left it as, else the store's. The store enforces the same rule at commit. */
  readonly findBy: {
    /** G5: the one instance holding `value` under the unique `rule`, within the rule's scope. The value is the key's own type, or an object of the fields for a composite key. */
    <R extends Unique<any, any>>(rule: R, value: NonNullable<R["~key"]>): Effect.Effect<Instance | undefined>;
  };
  /**
   * #764: a page of `thing`'s instances matching `where` and `state`, as this call's own writes leave them: a row it moved out drops, a stored row it moved in
   * keeps its place, and the rows it made come after every stored row, in the order made. Every matching row counts as read: the commit is a `conflict` when
   * another call changed which rows match, or one of them. A thing that lives as actors has none to list.
   */
  readonly list: (query: ListQuery) => Effect.Effect<Listed>;
  /** A new instance, in `state` when the thing has a machine (a move sets it otherwise). */
  readonly insert: <T extends Thing>(thing: T, fields: FieldsOf<T>, state?: string) => Effect.Effect<void>;
  /** Change some fields of an instance. Guarded by the version this call read it at. */
  /** `state` moves the instance with no event of its own: only for work a sweep does on instances other than the one its move is about (it journals nothing). */
  readonly update: <T extends Thing>(thing: T, id: string, changes: Partial<FieldsOf<T>>, state?: string) => Effect.Effect<void>;
}>()("@orthograph/language-effect/Records") {}

export interface UnitApi {
  /** A fresh attempt's `Records` over `store`, and what it holds back. `rules` default to the store's own. */
  readonly make: (store: Store["Service"], rules?: ReadonlyArray<NamedRule>) => Effect.Effect<Unit>;
}

/** A rule this call's rows would break, found before the commit: the rule's name, its refusal, and the row as the call leaves it (the refusal is filled from it, never from the holder's). */
export interface Violation {
  readonly rule: string;
  /** The thing's own error the runtime refuses with; absent when no caller can break the rule. */
  readonly refuse: AnyErrorClass | undefined;
  readonly row: Instance;
  /** The other holder is a row this call wrote too: the handler's own bug, never a refusal or a race. */
  readonly own: boolean;
  /** The rule says breaking it is a lost race: the call runs again and meets what the winner made. */
  readonly retry?: boolean;
}

export interface Unit {
  readonly records: Records["Service"];
  /** Read an instance and remember its version, so the move's update is guarded by it. */
  readonly read: (thing: Thing, id: string) => Effect.Effect<Instance | undefined>;
  /** Set the state of `id`: on its held-back insert, or as an update guarded by the version read. */
  readonly setState: (thing: Thing, id: string, state: string) => Effect.Effect<void>;
  readonly writes: Effect.Effect<ReadonlyArray<Write>>;
  /** #764: each list this call read, for the commit to guard. */
  readonly lists: Effect.Effect<ReadonlyArray<ListRead>>;
  /** #1045: each row this call found by its id, for the commit to guard. A row only a list found is guarded by that list. */
  readonly reads: Effect.Effect<ReadonlyArray<RowRead>>;
  /** G5: the first rule one of this call's rows breaks by taking a key another instance holds, or undefined. Run after the move, before `writes`. */
  readonly check: Effect.Effect<Violation | undefined>;
}
