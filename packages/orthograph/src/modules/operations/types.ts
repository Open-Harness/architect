// Operations and reads: what can be called. An operation's name is its path; nothing here carries a name.
import type { Duration, Schema } from "effect";
import type { AnyDerive } from "#modules/derive/types.js";
import type { AnyErrorClass } from "#modules/errors/types.js";
import type { On } from "#modules/events/types.js";
import type { Move } from "#modules/machines/types.js";
import type { Call } from "#modules/plugins/types.js";
import type { Allowed, Builtin, Narrowed, Role, RoleOf, ServiceRole, SignedIn, System } from "#modules/roles/types.js";
import type { FieldsInput, Thing, ValueOf } from "#modules/things/types.js";
import type { TypeOf } from "#modules/values/types.js";

/** A named part of a handler's work, recorded as its own span. Named `<thing>.<verb>.<key>` by the compiler. */
export interface Step<K extends StepKind = StepKind> {
  readonly kind: "step";
  readonly type: K;
  readonly optional?: boolean;
  /** A `database` step: the things it writes, when not just the operation's own. The compiler refuses writes to two stores (K3 item 5). */
  readonly writes?: ReadonlyArray<Thing>;
}
/** A step that calls out through a mounted adapter: `call` is what the mount offers, `<mount>.calls.<name>`. */
export interface CallStep extends Step<"call"> {
  readonly call: Call;
}

/**
 * What a step is. `database`, `wait` and `call` are what the Effect target runs. `sync`, `check` and `prove` are reserved for
 * targets that run on a chain or a client (N1): each is a span with its own budget. The union is open, so a target can
 * add kinds, and nothing here matches on all of them.
 */
export type StepKind = "database" | "wait" | "call" | "sync" | "check" | "prove" | (string & {});

/** Where an operation runs: `server` (every target today), on the caller's `client`, or on a `chain`. */
export type Runs = "client" | "server" | "chain";

/** How a guarantee is tested: `unit` in the target's own test runner, or `network` on a network the target's tests need. */
export type TestKind = "unit" | "network";
export type Steps = { readonly [key: string]: Step };

export interface Budget {
  /** A target for review, never a failure. */
  readonly p95: Duration.Input;
}

type StructOf<F extends FieldsInput> = Schema.Struct<{ readonly [K in keyof F]: ValueOf<F[K]>["schema"] }>;

/** A role may point at the thing a payload field names: `owner.of("organization")`, or deeper, `"allowance.organization"`. */
// `any`: a role's rule takes its own thing's instance, so roles of different things are only comparable as `any`.
type AllowedFor<P> =
  | Role<any> | ServiceRole<any> | Builtin | System
  | RoleOf<any, (keyof P & string) | `${keyof P & string}.${string}`>
  | Narrowed<Role<any> | SignedIn | RoleOf<any, (keyof P & string) | `${keyof P & string}.${string}`>>;

export interface OperationSpec<P extends FieldsInput, A extends FieldsInput, E extends ReadonlyArray<AnyErrorClass>, St extends Steps, M extends Move | undefined = Move | undefined> {
  readonly description: string;
  readonly payload: P;
  readonly answer: A;
  readonly move?: M;
  readonly errors?: E;
  readonly allowed: readonly [AllowedFor<P>, ...Array<AllowedFor<P>>];
  readonly steps?: St;
  readonly idempotent?: "request";
  /** A person must say yes before it runs. `true` is the only value: leave it out for an operation that asks nobody (#466). */
  readonly needsApproval?: true;
  readonly budget?: Budget;
  /** Where it runs. `server` for a thing in a database or actor store; an operation of a chain-stored thing runs on the `chain`, worked out by the compiler, never written (K25 item 6). */
  readonly runs?: Runs;
  /** A target can say a guarantee needs a network test; defaults to `unit`. */
  readonly test?: TestKind;
  /** The events that call it, each as an outbox hop (`Blueprint.on`). The model records them; the outbox is Goal 11's. */
  readonly on?: ReadonlyArray<On>;
}

export interface Operation<
  T extends Thing = Thing,
  P extends FieldsInput = FieldsInput,
  A extends FieldsInput = FieldsInput,
  E extends ReadonlyArray<AnyErrorClass> = ReadonlyArray<AnyErrorClass>,
  St extends Steps = Steps,
  M extends Move | undefined = Move | undefined,
> {
  readonly kind: "operation";
  readonly thing: T;
  readonly description: string;
  readonly payload: P;
  readonly answer: A;
  readonly payloadSchema: StructOf<P>;
  readonly answerSchema: StructOf<A>;
  /** Its move, keeping the machine's literal states: a handler's `move` takes only the move's own outcomes (K16). */
  readonly move: M;
  readonly errors: E;
  readonly allowed: ReadonlyArray<Allowed>;
  readonly steps: St;
  readonly idempotent: "request" | undefined;
  /** Present only when declared; the compiler refuses any value but `true`. */
  readonly needsApproval?: true;
  readonly budget: Budget | undefined;
  readonly runs: Runs;
  /** Whether the author wrote `runs`, and what: the compiler refuses it on an operation of a chain-stored thing, where it is worked out. */
  readonly runsDeclared: Runs | undefined;
  readonly test: TestKind;
  readonly on: ReadonlyArray<On>;
}

/** What a read by id answers: the fields it names, decoded, with `state` as text. */
export type ReadAnswer = { readonly [field: string]: unknown };

/** `newest` is the last inserted first, `oldest` the first inserted first: the order rows were made in, never a clock. */
export type Order = "newest" | "oldest";

/** A page of a list read: the items, and the cursor for the page after them (null on the last page). */
export interface Page<I> {
  readonly items: ReadonlyArray<I>;
  readonly next: string | null;
}

/** The payload of a list read: each `where` field, and the cursor, all optional (an omitted filter filters nothing). */
export type ListPayload<T extends Thing, W extends ReadonlyArray<string>> = {
  readonly [K in W[number] as K extends "state" ? never : K]?: K extends keyof T["fields"] ? TypeOf<T["fields"][K]["value"]> : string;
} & { readonly state?: string; readonly cursor?: string };

export type ListItem<T extends Thing> = { readonly [K in keyof T["fields"]]: TypeOf<T["fields"][K]["value"]> } & { readonly state: string };

/**
 * A read answers from the thing's records with no handler: one instance by its id (`by: "id"`), or a page of them
 * (`by: "list"`) filtered by `where` and ordered by `order`.
 */
export interface Read<T extends Thing = Thing, P = { readonly id: string }, A = ReadAnswer> {
  readonly kind: "read";
  readonly thing: T;
  readonly by: "id" | "list";
  /** What it answers: the fields it names (by id), or every field of the thing and its `state` (a list's items). */
  readonly fields: ReadonlyArray<string>;
  /** A list's filters: the fields a caller may narrow it by. Empty for a read by id. */
  readonly where: ReadonlyArray<string>;
  readonly order: Order | undefined;
  /** A list's page size. */
  readonly page: number | undefined;
  readonly allowed: ReadonlyArray<Allowed>;
  readonly budget: Budget | undefined;
  /** `{ id }`, the thing's own id field; or a list's `where` fields and its `cursor`. */
  readonly payload: FieldsInput;
  /** The payload fields a caller may leave out. */
  readonly optional: ReadonlyArray<string>;
  /** The fields it names, with `state` as text; or a list's `items` and `next`. */
  readonly answer: FieldsInput;
  /** What it works out from other records and adds to each answer (GOAL17-derived-reads). */
  readonly derive: AnyDerive | undefined;
  /** Fields pinned to one value, taken out of the payload: a caller can't set them. */
  readonly only: { readonly [field: string]: unknown } | undefined;
  readonly payloadSchema: Schema.Codec<P, unknown>;
  readonly answerSchema: Schema.Codec<A, unknown>;
}

export type PayloadOf<O> =
  O extends Operation<any, infer P, any, any, any> ? StructOf<P>["Type"] : O extends Read<any, infer P, any> ? P : never;
export type AnswerOf<O> =
  O extends Operation<any, any, infer A, any, any> ? StructOf<A>["Type"] : O extends Read<any, any, infer A> ? A : never;
export type ErrorOf<O> = O extends Operation<any, any, any, infer E, any> ? InstanceType<E[number]> : never;
export type StepsOf<O> = O extends Operation<any, any, any, any, infer St> ? St : never;

export interface OperationsApi {
  readonly operation: <
    T extends Thing,
    const P extends FieldsInput,
    const A extends FieldsInput,
    const E extends ReadonlyArray<AnyErrorClass> = readonly [],
    const St extends Steps = {},
    M extends Move | undefined = undefined,
  >(thing: T, spec: OperationSpec<P, A, E, St, M>) => Operation<T, P, A, E, St, M>;
  readonly read: {
    /** One instance by its id, answering the fields it names. */
    <T extends Thing>(thing: T, spec: {
      readonly by: "id";
      readonly fields: ReadonlyArray<keyof T["fields"] | "state">;
      readonly allowed: readonly [Allowed, ...Array<Allowed>];
      readonly budget?: Budget;
      /** Worked out from other records and added to the answer. */
      readonly derive?: AnyDerive;
    }): Read<T>;
    /**
     * A page of instances: filtered by `where` (a derived field too), in `order`, `page` to a page. Answers `{ items, next }`.
     * `only` pins a field to one value and takes it out of the payload.
     */
    <T extends Thing, const W extends ReadonlyArray<string>>(thing: T, spec: {
      readonly where: W;
      readonly order: Order;
      readonly page: number;
      readonly allowed: readonly [Allowed, ...Array<Allowed>];
      readonly budget?: Budget;
      readonly derive?: AnyDerive;
      readonly only?: { readonly [field: string]: unknown };
    }): Read<T, ListPayload<T, W>, Page<ListItem<T>>>;
  };
  readonly step: {
    /** Writes the operation's thing, or the things named: all of them must live in one store. */
    readonly database: (spec?: { readonly writes?: ReadonlyArray<Thing>; readonly optional?: boolean }) => Step<"database">;
    readonly wait: (spec?: { readonly optional?: boolean }) => Step<"wait">;
    /** A call out through an adapter the app mounted and `include`d the call of (M1-plugins section 9). */
    readonly call: (call: Call) => CallStep;
  };
}
