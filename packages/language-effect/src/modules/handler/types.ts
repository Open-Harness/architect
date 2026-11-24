// The handler wrapper: what every generated operation runs through. Decode, check who may call, run the handler as
// counted work inside the operation's span, check the answer, give it back.
import { Context, Data, type Effect, type Redacted, type Schema } from "effect";
import type { AnswerOf, ErrorOf, Field, InstanceOf, Move, Operation, PayloadOf, Principal, Read, StepsOf, Thing } from "orthograph";
import type { NotAllowed } from "#modules/access/types.js";
import type { CallRunner, CallWiring, Callable } from "#modules/calls/types.js";
import type { Instance, Records, Store } from "#modules/records/types.js";
import type { Busy } from "#modules/work/types.js";

/** A request key used again with a payload other than the one it was first used with: refused, never answered with the kept answer. It carries no field: the key is never shown. */
export class IdempotencyConflict extends Data.TaggedError("IdempotencyConflict")<{}> {}
/** A read whose derive looks at the problems every plugin declares has no store to list them from yet: it refuses, by name, and never answers as if it had no adds (a pinned or other derived read is served, slice 7 of Goal 17). */
export class ReadNotServed extends Data.TaggedError("ReadNotServed")<{ readonly read: string; readonly message: string }> {}
/** The payload didn't match the operation's declaration. Refused before the handler runs. */
export class InvalidPayload extends Data.TaggedError("InvalidPayload")<{ readonly issues: string }> {}

/**
 * Each declared step, as a function that runs its work in a span named `<thing>.<verb>.<key>`. A call step runs the
 * adapter's callable instead (`steps.price([payload.origin], failure)`), typed by `C[key]`, the callable's own type.
 */
export type StepRunners<St, C = {}> = {
  readonly [K in keyof St]: St[K] extends { readonly type: "call" }
    ? CallRunner<K extends keyof C ? (C[K] extends Callable ? C[K] : Callable) : Callable>
    : <A, E, R>(work: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
};

export interface HandlerContext<O, C = {}> {
  readonly principal: Principal;
  readonly steps: StepRunners<StepsOf<O>, C>;
  /**
   * Make the operation's move, ending in `to` (or its only outcome). Applied once the handler answers: the instance's
   * state is set and the move's event journalled. A handler that never calls it makes no move and emits nothing.
   */
  readonly move: (to?: MoveTo<O>) => Effect.Effect<void>;
  /**
   * Another thing's move, made in this same commit (GOAL17-slice9-build, call 8): a creating move makes its instance (its id minted and answered), any other
   * moves the instance `id` names, from a state it declares. Its event is journalled with the operation's own; the commit carries both or neither.
   */
  readonly also: (move: Move, spec: { readonly id?: string; readonly fields: Readonly<Record<string, unknown>>; readonly to?: string; readonly event?: Readonly<Record<string, unknown>> }) => Effect.Effect<string>;
  /**
   * The instance this call is about, read before the handler ran (the from-check and the commit's version guard read the
   * same one), so a handler never reads it again. Undefined when the payload names none, and for a creating move.
   */
  readonly subject: InstanceOf<ThingOf<O>> | undefined;
  /**
   * Each thing a payload field names by its id, read before the handler ran and keyed by that field (`refs.member`). A
   * missing one never reaches the handler: it is refused `<Thing>NotFound`, or `NotAllowed` when a role check reads it.
   */
  readonly refs: { readonly [K in RefKeys<O>]?: Instance };
  /** A creating move's new id, minted before the handler ran: answer with it (`allowance: id`). Undefined otherwise. */
  readonly id: CreatedId<O>;
}

type ThingOf<O> = O extends { readonly thing: infer T extends Thing } ? T : Thing;
/** The value a thing's own id holds. */
type IdOf<T extends Thing> = T["fields"] extends { readonly id: Field<infer V> } ? V["schema"]["Type"] : string;
/** Payload fields taken from some thing's field: those that may name an instance by its id. */
type RefKeys<O> = O extends Operation<any, infer P, any, any, any> ? { [K in keyof P]: P[K] extends Field ? K : never }[keyof P] & string : never;
/**
 * A move from no state makes its instance and has an id minted; a move from a state is given none. A machine keeps each
 * move's `from` as the literal tuple it was written as, so `[]` is told apart from `["active"]` in the type.
 */
type CreatedId<O> = O extends { readonly move: infer M }
  ? [NonNullable<M>] extends [never] ? undefined
  : NonNullable<M> extends { readonly from: infer F extends ReadonlyArray<string> }
    ? F extends readonly [] ? IdOf<ThingOf<O>> : undefined
    : undefined
  : undefined;

type MoveTo<O> = O extends { readonly move: infer M } ? (NonNullable<M> extends { readonly to: ReadonlyArray<infer S> } ? S : never) : never;

/** What a project writes in `<verb>.handler.ts`: the declared payload in, the declared answer or a declared error out. */
export type Handler<O, R = never, C = {}> = (payload: PayloadOf<O>, context: HandlerContext<O, C>) => Effect.Effect<AnswerOf<O>, ErrorOf<O>, R>;

export interface Served<O, R> {
  readonly name: string;
  /** The declaration this serves: what the visibility rule reads to cut an outcome for its caller. */
  readonly operation: O;
  // A `<Thing>NotFound` (M1.46) is refused by tag like `NotFrom`; the generated wire classes carry it to every surface.
  /** From the outside: decode first, refusing with `InvalidPayload`. */
  readonly call: (payload: unknown, principal: Principal) => Effect.Effect<AnswerOf<O>, ErrorOf<O> | InvalidPayload | NotAllowed | NotFrom, Exclude<R, Records> | Busy | Store>;
  /**
   * From a server that has already decoded the payload against the same declaration. `request` is the caller's
   * idempotency key: for an operation declared `idempotent: "request"`, the same key from the same caller is one call.
   */
  /** `delivery`: the outbox's call, keyed by its event (`on|<event id>|<operation>`) whatever `idempotent` says, so a redelivery answers what the first answered and changes nothing (M5-reach-out Q3.2). */
  readonly run: (payload: PayloadOf<O>, principal: Principal, request?: string, delivery?: string) => Effect.Effect<AnswerOf<O>, ErrorOf<O> | NotAllowed | NotFrom, Exclude<R, Records> | Busy | Store>;
}

/** Nothing has the id a payload field names, and no role check read it. Named `<Thing>NotFound`; refused before the handler. */
export class NotFound extends Data.Error<{ readonly _tag: string; readonly id: string }> {}

/** The machine's own refusal: the instance is in a state the move can't start from. Named `<Thing>Not<State>`. */
export class NotFrom extends Data.Error<{ readonly _tag: string; readonly state: string }> {}

/** A scaffolded handler not written yet. Reaching it is a defect that names what's missing. */
export class BlankReached extends Data.TaggedError("BlankReached")<{ readonly what: string }> {
  override get message() { return this.what; }
}

/** Where an operation on the device sends its spans: the collector's OTLP/HTTP base URL, when there is one, and the service they say they are from. */
export interface DeviceWhere {
  readonly otlp: string | undefined;
  readonly service: string;
}

/**
 * What a world gives a plugin's `world` entry (the code prove runs in place of a device): the chain it stood, one funded
 * key per host (`node`, `browser`, `keystore`, `world`), a folder of its own, and a place to keep what a call leaves
 * for the next. A real device has none of this and its entries never ask for it.
 */
export interface DeviceWorldOf {
  readonly chain: undefined | {
    readonly rpcUrl: string;
    readonly chainId: number;
    /** The funded key the world made for each host, redacted: it prints as `<redacted>`. */
    readonly keys: Readonly<Record<string, Redacted.Redacted<string>>>;
    /** How many blocks count before a send is `confirmed`, the including block as 1 (M1.38). Absent: the local chain's 1. */
    readonly depth?: number;
  };
  /** A fresh folder the world made and will remove: for state an entry keeps on disk (a keystore file). */
  readonly directory: string;
  /** The value kept under `key` for this world, made by `make` the first time it is asked for. */
  readonly remember: <A>(key: string, make: () => A) => A;
}

export class DeviceWorld extends Context.Service<DeviceWorld, DeviceWorldOf>()("@orthograph/language-effect/DeviceWorld") {}

export interface Device<O, R> {
  readonly name: string;
  /** Run the operation in this process. The payload is already what the declaration says; nothing is stored or journalled. */
  readonly run: (payload: PayloadOf<O>, where: DeviceWhere) => Effect.Effect<AnswerOf<O>, ErrorOf<O>, R>;
}

export interface DeviceApi {
  /** `name` comes from the generated code, which got it from the operation's path. */
  readonly serve: <O, R>(spec: { readonly name: string; readonly operation: O; readonly handler: Handler<O, R, any> }) => Device<O, R>;
}

export interface HandlerApi {
  /** `name` comes from the generated code, which got it from the operation's path. */
  readonly serve: <O, R>(spec: {
    readonly name: string;
    readonly operation: O;
    readonly handler: Handler<O, R, any>;
    /** What each call step runs: the adapter's callable, and its layer when it has one. Wired by the generated server. */
    readonly calls?: Readonly<Record<string, CallWiring>>;
    /** The machine's refusal for this operation's move, `<Thing>Not<State>`, named by the generated code. */
    readonly notFrom?: string;
    /** Each payload field whose missing instance is refused before the handler, and its `<Thing>NotFound`, named by the generated code. */
    readonly notFound?: Readonly<Record<string, string>>;
    /** Each refusal's code by tag (`Errors.codes`), so a refused call's span says `refusal.code`. */
    readonly codes?: Readonly<Record<string, string>>;
    /** Each refusal the runtime makes for a rule this operation can break (G5), by the error's tag, and the full name of the rule (`handle.oneHolderPerName`). */
    readonly invariants?: Readonly<Record<string, string>>;
    /** Each adapter's mount by the name it is mounted under, when some `allowed` entry is a `service` role: what that role is read against. */
    readonly mounts?: ReadonlyMap<unknown, string>;
  }) => Served<O, R>;
  readonly blank: {
    /** What a scaffold returns until it is written: dies with `BlankReached`, typed as anything. */
    <A = never>(what: string): Effect.Effect<A>;
    /** In the place of a call's failure mapping: the call that reaches it is a defect that names what's missing. */
    (what: string, kind: "failure"): (failure: unknown) => never;
  };
}

// Reads: a thing's instance by its id, or a page of them, answered from the store with no handler (L1.23, L2.04).

/** What a read answers: the fields it names, decoded, with `state` as text; or a list's `{ items, next }`. */
export type ReadAnswer = { readonly [field: string]: unknown };

/** What a read is called with: `{ id }`, or a list's filters and cursor. */
export type ReadPayload = { readonly [field: string]: unknown };

export interface ServedRead {
  readonly name: string;
  /** The declaration this serves. */
  readonly operation: Read<any, any, any>;
  /** From the outside: the payload decoded first. */
  readonly call: (payload: unknown, principal: Principal) => Effect.Effect<ReadAnswer, NotAllowed | ReadNotServed | Schema.SchemaError, Store>;
  /** From a server that already decoded the payload. */
  readonly run: (payload: ReadPayload, principal: Principal) => Effect.Effect<ReadAnswer, NotAllowed | ReadNotServed, Store>;
}

export interface ReadsApi {
  /**
   * Serve a read: who may read is checked first (on the instance itself for a read by id, on the thing a filter names
   * for a list), then its answer is made. A missing id is refused `NotAllowed`, so a read never tells an outsider what
   * exists; a list answers `{ items, next }`, and `next` goes back as the `cursor` of the page after it.
   */
  readonly serve: <R extends Read<any, any, any>>(spec: { readonly name: string; readonly read: R; readonly mounts?: ReadonlyMap<unknown, string> }) => ServedRead;
}
