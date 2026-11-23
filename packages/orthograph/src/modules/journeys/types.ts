// Journeys: a story told in declared operations, and the starting worlds it begins from. Pure descriptions: `prove`
// runs them against a real world and checks every step. Nothing here calls anything.
import type { Allowed } from "#modules/roles/types.js";
import type { AnyErrorClass, NotAllowed } from "#modules/errors/types.js";
import type { Event } from "#modules/events/types.js";
import type { NotFrom } from "#modules/machines/types.js";
import type { Operation, PayloadOf, Read } from "#modules/operations/types.js";
import type { Span } from "#modules/time/types.js";
import type { NotFound } from "#modules/things/types.js";
import type { Via } from "#modules/plugins/types.js";

/**
 * A value known only once the world runs: `s.world.organization`, `s.olga.person`, `s.last.allowance`. Its path is
 * read by `prove`; `last` is the answer of the most recent call, so a step's own checks see that step's answer.
 */
export interface Ref {
  readonly path: ReadonlyArray<string>;
}

/** One declared operation or read, called by one cast member. */
export interface Call {
  readonly kind: "call";
  readonly actor: string;
  readonly operation: Operation | Read;
  readonly payload: { readonly [field: string]: unknown };
  /** The request key, for an operation declared `idempotent: "request"`: the same key twice is one call. */
  readonly request: string | undefined;
  /** The way in this call is made by, when the script said (`s.ada.via(Via.key)`): absent, a person's own session. */
  readonly via?: Via | undefined;
  /** The keeper's call only: the instant the move made by time was due, which with the thing and the move is the request key (K23 section 3). */
  readonly due?: string;
}

/** A step that moves the world's clock: `s.clock.advance("1 month")` or `s.clock.moveTo(instant)`. It answers `{ now, fired }` (M8-checks, call 2). */
export interface ClockCall {
  readonly kind: "clock-call";
  readonly move: { readonly advance: string } | { readonly moveTo: string };
}

/**
 * The tools an agent is shown at the MCP door, listed with a cast member's own credential (`s.olga.via(Via.agent).tools()`). It runs no
 * operation, so it has no trace of its own: its answer is `{ tools }`, the wire names the door lists.
 */
export interface ToolsCall {
  readonly kind: "call";
  readonly actor: string;
  readonly tools: true;
  readonly via?: Via | undefined;
  readonly operation?: undefined;
  readonly payload?: undefined;
  readonly request?: undefined;
}

/** A call a step makes: an operation or read, or the tools list. */
export type AnyCall = Call | ToolsCall | ClockCall;

/**
 * What a refusal check names: a declared error class, a machine's own refusal (`machine.notFrom`), a thing's missing
 * instance (`Thing.notFound`), or `NotAllowed`.
 */
export type Refusal = AnyErrorClass | NotFrom | NotFound | typeof NotAllowed;

/** What a step checks once its call has come back. */
export type Assertion =
  | { readonly kind: "expect"; readonly pick: (answer: any) => unknown; readonly match: RegExp }
  | { readonly kind: "expect-equal"; readonly pick: (answer: any) => unknown; readonly value: unknown }
  | { readonly kind: "emits"; readonly event: Event; readonly fields: { readonly [field: string]: unknown } }
  | { readonly kind: "no-events" }
  | { readonly kind: "refuses"; readonly error: Refusal; readonly fields: { readonly [field: string]: unknown } }
  | { readonly kind: "spans"; readonly present: ReadonlyArray<string>; readonly absent: ReadonlyArray<string> }
  | { readonly kind: "is-in"; readonly thing: unknown; readonly id: unknown; readonly state: string }
  | { readonly kind: "lacks"; readonly operations: ReadonlyArray<Operation | Read> }
  | { readonly kind: "has"; readonly operations: ReadonlyArray<Operation | Read> };

export interface Step {
  readonly kind: "step";
  readonly title: string;
  readonly call: AnyCall;
  readonly checks: ReadonlyArray<Assertion>;
}

/**
 * A cast member as a script sees them. `person` is the id the world gave them, once signed up; `email` and `password`
 * are theirs from the start, so a script can sign them up or in itself.
 */
export interface Actor {
  readonly person: any;
  /** The CAIP-10 account of the key the world made and funded for them, when the app is on a chain (M6-chain item 10). */
  readonly account: any;
  readonly email: any;
  readonly password: any;
  readonly run: {
    <O extends Operation>(
      operation: O,
      payload: { readonly [K in keyof PayloadOf<O>]: PayloadOf<O>[K] | Ref },
      options?: { readonly request?: string; readonly due?: string },
    ): Call;
    /** A read: one instance by its id, or a page of them by the filters it names. */
    <R extends Read<any, any, any>>(read: R, payload: { readonly [K in keyof PayloadOf<R>]: PayloadOf<R>[K] | Ref }): Call;
  };
  /** The same cast member, called with the credential the world mints for this way in: a key, or an agent's key. Default: their session. */
  readonly via: (way: Via) => Actor;
  /** The MCP door's tool list, asked with this cast member's credential: answers `{ tools }`. Check it with `lacks` and `has`. */
  readonly tools: () => ToolsCall;
}

export type Cast = { readonly [name: string]: Allowed };

export type Script<C extends Cast> = { readonly [K in keyof C]: Actor } & {
  /** What the starting world gave. */
  readonly world: any;
  /** The answer of the most recent call. */
  readonly last: any;
  /** The world's clock: a step that moves it by a span in words, or to an instant (K23 section 2). */
  readonly clock: {
    readonly advance: (span: Span) => ClockCall;
    readonly moveTo: (instant: string) => ClockCall;
  };
  readonly step: (title: string, call: AnyCall, ...checks: ReadonlyArray<Assertion>) => Step;
};

export interface Journey<C extends Cast = Cast> {
  readonly kind: "journey";
  readonly name: string;
  readonly cast: C;
  readonly starts: string | undefined;
  readonly steps: (s: Script<C>) => ReadonlyArray<Step>;
}

export interface StartingWorld<C extends Cast = Cast> {
  readonly kind: "starting-world";
  readonly name: string;
  /** Another starting world this one begins from: its cast and what it gave are this one's too. */
  readonly from: string | undefined;
  readonly cast: C;
  readonly makes: (s: Script<C>) => ReadonlyArray<Call | ClockCall>;
  readonly gives: (s: Script<C>) => { readonly [key: string]: unknown };
}

export interface JourneysApi {
  readonly journey: <const C extends Cast>(name: string, spec: {
    readonly cast: C;
    readonly starts?: string;
    readonly steps: (s: Script<C>) => ReadonlyArray<Step>;
  }) => Journey<C>;
  readonly startingWorld: <const C extends Cast>(name: string, spec: {
    readonly from?: string;
    readonly cast: C;
    readonly makes: (s: Script<C>) => ReadonlyArray<Call | ClockCall>;
    readonly gives: (s: Script<C>) => { readonly [key: string]: unknown };
  }) => StartingWorld<C>;
}

/** The checks a step can make, imported by name: `import { emits, expect } from "orthograph"`. */
export interface ChecksApi {
  readonly expect: (pick: (answer: any) => unknown) => {
    readonly toMatch: (match: RegExp) => Assertion;
    /** Equal by value: bigints, strings, arrays and objects compared as data. */
    readonly toBe: (value: unknown) => Assertion;
    readonly toEqual: (value: unknown) => Assertion;
  };
  readonly emits: <E extends Event>(event: E, fields: { readonly [K in keyof E["fields"]]?: unknown }) => Assertion;
  readonly noEvents: () => Assertion;
  readonly refuses: (error: Refusal, fields?: { readonly [field: string]: unknown }) => Assertion;
  readonly spans: (spec: { readonly present?: ReadonlyArray<string>; readonly absent?: ReadonlyArray<string> }) => Assertion;
  /** On a `.tools()` call: none of these operations is a tool. It fails when the call listed no tools, or names an operation the project does not declare. */
  readonly lacks: (...operations: ReadonlyArray<Operation | Read>) => Assertion;
  /** On a `.tools()` call: every one of these operations is a tool. */
  readonly has: (...operations: ReadonlyArray<Operation | Read>) => Assertion;
}

/** What `prove` uses to run a script: the refs in it, read against what the world has said so far. */
export interface Scripts {
  readonly script: <C extends Cast>(cast: C) => Script<C>;
  readonly pathOf: (ref: Ref) => ReadonlyArray<string>;
  readonly isRef: (x: unknown) => x is Ref;
  /** Every ref inside `value` replaced by what `env` holds at its path; paths the world never gave are `missing`. */
  readonly resolve: (value: unknown, env: { readonly [root: string]: unknown }) => { readonly value: unknown; readonly missing: ReadonlyArray<string> };
}
