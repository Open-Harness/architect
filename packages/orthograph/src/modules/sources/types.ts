// Sources (GOAL17-source-from): a source is a mapping on an adapter. `Source.from(adapter, spec)` is one value, pure data and
// pure functions, so the compiler can read it and the runtime can run it. A timer is a source with no adapter.
import type { Schema } from "effect";
import type { AnyErrorClass } from "#modules/errors/types.js";
import type { Adapter, AdapterEvent, Call } from "#modules/plugins/types.js";

/** One outside account as a person writes it in a form: the service's stable id, and the name people type. */
export interface AccountRef {
  readonly id: string;
  readonly login: string;
}
export interface Seen extends AccountRef {
  readonly bot: boolean;
}

/** What a source's `githubSource(config)` answers, and `Superagent.declare({ connections })` lists. */
export interface Connection<Cfg = unknown> {
  readonly kind: "connection";
  readonly source: SourceKind<any>;
  readonly config: Cfg;
}

export interface Scope {
  readonly listened: boolean;
  readonly observed: boolean;
  readonly row: string;
}

export type Strength = "explicit" | "inferred" | "none";
export type Cells = Readonly<Record<"listed" | "unlisted" | "unnamed", Strength>>;
export interface AdmissionRow {
  readonly id: string;
  readonly label: string;
  readonly cells: Cells;
}

export interface ContextMessage {
  readonly id: string;
  readonly from: string;
  readonly at: string;
  readonly text: string;
  readonly meta?: Readonly<Record<string, string>>;
}

/** What one event says about a trigger. Pure data: its author is the event's own actor, never a field here. */
export interface Mapped<Addr> {
  /** What a connection's `events` list picks from: `comment`, `review`, `message`. */
  readonly kind: string;
  /** Stable inside the source: `issue/12`. Persisted, so never change it. */
  readonly thread: string;
  /** Untrusted: the gate never reads it. */
  readonly text: string;
  readonly url?: string;
  readonly addressed?: "mention" | "direct";
  readonly also?: ReadonlyArray<string>;
  /** Where a reply goes, in the source's own words, JSON-safe. */
  readonly channel: Addr;
  readonly meta?: Readonly<Record<string, string>>;
}

export interface Ctx<Cfg> {
  readonly config: Cfg;
  readonly me: AccountRef;
}

type EventsOf<A> = A extends { readonly events: infer E } ? E : {};
type PayloadOf<E> = E extends AdapterEvent<infer P> ? P : never;

export interface Reply<Addr> {
  /** A call of the adapter. */
  readonly call: Call;
  readonly args: (m: { readonly address: Addr; readonly text: string; readonly key: string }) => unknown;
  /** Read from history: did a send that "failed" actually land? */
  readonly landed: (message: ContextMessage, key: string) => boolean;
  /** Error classes of `call.errors` that mean never deliverable: dropped, not retried. */
  readonly gone: ReadonlyArray<AnyErrorClass>;
}

export interface History<Addr> {
  readonly call: Call;
  readonly args: (thread: Addr, cursor?: string) => unknown;
  readonly page: (answer: never, cursor?: string) => { readonly messages: ReadonlyArray<ContextMessage>; readonly next?: string | undefined };
}

export interface PolicyPart<Cfg> {
  readonly schema: Schema.Top;
  readonly rows: (config: Cfg) => ReadonlyArray<AdmissionRow>;
  readonly sync?: { readonly call: Call; readonly accounts: (answer: never) => ReadonlyArray<Seen> };
}

export interface Environment<Addr> {
  /** Name to one-line description, shown in Settings even when off. Never a credential. */
  readonly variables: Readonly<Record<string, string>>;
  readonly of: (m: Mapped<Addr>) => Readonly<Record<string, string>>;
}

export interface SourceSpec<A extends Adapter<any, any, any>, Cfg extends { readonly me: AccountRef }, Addr> {
  readonly config: Schema.Codec<Cfg, any>;
  readonly scope: (config: Cfg, m: Mapped<Addr>) => Scope;
  /** Keyed by the adapter's event names: a name that is not one is a type error, and a problem in `ortho check`. `undefined` ignores the event. */
  readonly on: { readonly [K in keyof EventsOf<A>]?: (e: PayloadOf<EventsOf<A>[K]>, ctx: Ctx<Cfg>) => Mapped<Addr> | undefined };
  /** Events that close a thread: its key, or `undefined` for "not a close". */
  readonly closed?: { readonly [K in keyof EventsOf<A>]?: (e: PayloadOf<EventsOf<A>[K]>) => string | undefined };
  readonly reply?: Reply<Addr>;
  readonly history?: History<Addr>;
  readonly policyPart: PolicyPart<Cfg>;
  readonly environment: Environment<Addr>;
}

export interface SourceKind<Cfg = unknown> {
  readonly kind: "source-kind";
  /** The adapter it maps, or null for a timer. */
  readonly adapter: Adapter<any, any, any> | null;
  readonly spec: SourceSpec<any, any, any> | undefined;
  /** A timer's configuration, as its fields. */
  readonly config: Schema.Top;
  (config: Cfg): Connection<Cfg>;
}

export interface TimerConfig {
  /** How often it ticks: `1 week`. */
  readonly every: string;
  /** What each tick says: the trigger's text. */
  readonly says: string;
}

export interface SourcesApi {
  readonly from: <A extends Adapter<any, any, any>, Cfg extends { readonly me: AccountRef }, Addr>(adapter: A, spec: SourceSpec<A, Cfg, Addr>) => SourceKind<Cfg>;
  /** A source with no adapter: each tick of `every` is a trigger saying `says`, on a thread that never closes. */
  readonly timer: SourceKind<TimerConfig>;
}
