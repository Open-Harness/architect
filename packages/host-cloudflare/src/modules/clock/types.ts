// The world's clock: what an environment declares (K23 section 1), the instant a world keeps, and the lookup that makes
// `Date` and Effect's `Clock` read it for the request that is running (M8.05, M8.06). Real time is the default and is
// never patched.

/** An environment's clock as the model writes it (`environments.<e>.clock`), instants in ISO 8601 with milliseconds. */
export type ClockDeclaration =
  | { readonly kind: "real" }
  | { readonly kind: "stepped"; readonly starts: string }
  | { readonly kind: "scaled"; readonly starts: string; readonly speed: number };

/**
 * What a request reads the world's time from (kept in the async-local store, so it is per request): a fixed instant for a
 * stepped world, or the anchors of a scaled one, from which every read works out the instant now, with no lookup.
 */
export type ClockSource =
  | { readonly kind: "stepped"; readonly instant: number }
  | { readonly kind: "scaled"; readonly realAnchor: number; readonly worldAnchor: number; readonly speed: number };

/** The Worker's bindings that say how this world tells time. The generated config sets `ORTHO_CLOCKS`, only when some environment is not real. */
export interface ClockEnv {
  /** JSON: each environment's declared clock, by the environment's name. Absent: every world is real. */
  readonly ORTHO_CLOCKS?: string;
  readonly ORTHO_ENVIRONMENT?: string;
}

/** What `GET /_world/clock` answers. `timers` is the world's timer table (M8.07); until it exists it is always empty. */
export interface ClockReading {
  readonly kind: ClockDeclaration["kind"];
  readonly now: string;
  readonly timers: ReadonlyArray<{ readonly due: string; readonly owner: string; readonly name: string }>;
}

/** A move of the world's clock: where it landed, or why it could not go. */
export type Moved =
  | { readonly ok: true; readonly now: number }
  | { readonly ok: false; readonly status: 400 | 409; readonly body: { readonly _tag: "ClockNotMovable" | "BadMove"; readonly message: string } };

/** The instant a world keeps, in its own Durable Object's SQLite storage. */
export interface ClockState {
  readonly kind: ClockDeclaration["kind"];
  /** The world's instant now, in epoch milliseconds. Real: the wall clock. Stepped: where it stands. Scaled: it flows at its speed. */
  readonly now: () => number;
  /** What a request runs inside to read this clock: `undefined` for a real clock, which is never patched. */
  readonly source: () => ClockSource | undefined;
  /**
   * Back to the declared `starts`, a scaled clock re-anchored at the real now: the one sanctioned way back, for the warm
   * reset between runs (ST1.24). The door's `move-to` still refuses an earlier instant. A real clock has nothing to reset.
   */
  readonly reset: () => void;
  /** Move by a span in words (`"1 month"`; months and years on the calendar, in UTC). A real clock refuses. */
  readonly advance: (span: string) => Moved;
  /** Move to an instant (ISO 8601). It never goes back. A real clock refuses. */
  readonly moveTo: (to: string) => Moved;
}

export interface WorldClockApi {
  /** The clock this environment declares; real when nothing says otherwise. */
  readonly declared: (env: ClockEnv) => ClockDeclaration;
  /** The world's own state over its SQLite storage; `starts` is read once, when the world is made. */
  readonly state: (sql: SqlStorage, declaration: ClockDeclaration) => ClockState;
  /** `/_world/clock` (GET), `/_world/clock/advance` and `/_world/clock/move-to` (POST); nothing for any other request. */
  readonly door: (state: ClockState, request: Request) => Promise<Response> | undefined;
  /**
   * Run `f` with `Date` and Effect's `Clock` reading `source`, through every await, timer and `waitUntil` it starts. The
   * `Date` proxy is installed once, here, the first time it is asked; the source is per async context
   * (`AsyncLocalStorage`), never a global assignment. A scaled source is read live: each read works out the instant now.
   * Callers ask only for a world that is not real.
   */
  readonly within: <A>(source: ClockSource, f: () => A) => A;
  /** The wall clock, for the world's own lifetime and for a scaled clock to anchor against. Never patched. */
  readonly wall: () => number;
}
