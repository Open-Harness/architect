// The world's clock: what an environment declares (K23 section 1), the instant a world keeps, and the lookup that makes
// `Date` and Effect's `Clock` read it for the request that is running (M8.05, M8.06). Real time is the default and is
// never patched.
import type { Effect } from "effect";
import type { BusyBox } from "@orthograph/language-effect";

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

/** A row of the world's timer table as the door shows it. */
export interface ClockTimer {
  readonly due: string;
  readonly owner: string;
  readonly name: string;
}

/** What `GET /_world/clock` answers: the clock's kind and instant, and the world's timer table in firing order (M8.07). */
export interface ClockReading {
  readonly kind: ClockDeclaration["kind"];
  readonly now: string;
  readonly timers: ReadonlyArray<ClockTimer>;
}

/** Where a move would land, or why it cannot: nothing is changed. */
export type Planned = { readonly ok: true; readonly target: number } | Extract<Moved, { readonly ok: false }>;

/** Why a move did not settle (M8.07): a process stayed busy past the real-time limit, or a durable timer's wake failed. */
export type Unsettled =
  | { readonly _tag: "NeverQuiet"; readonly busy: ReadonlyArray<string> }
  | { readonly _tag: "WakeFailed"; readonly owner: string; readonly name: string; readonly message: string }
  /** The move itself was refused when it came to be planned (a real clock, a bad span, a move back). */
  | { readonly _tag: "Refused"; readonly status: 400 | 409; readonly body: { readonly _tag: string; readonly message: string } };

/**
 * What settles a stepped world's move (the timers module builds it): walks the clock to the target, firing what is due
 * on the way, and answers once the world is quiet there. `fired` lists the durable timers that ran on the way.
 */
export interface Controller {
  /**
   * `plan` is made inside the controller's lock, so a move relative to the instant (`"1 month"`) starts from where the move
   * before it ended, not from where the world stood when the request arrived.
   */
  readonly settle: (plan: () => Planned) => Effect.Effect<{ readonly now: string; readonly fired: ReadonlyArray<ClockTimer> }, Unsettled>;
  readonly timers: () => ReadonlyArray<ClockTimer>;
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
  /** Where a move would land, without making it: a span (`"1 month"`) or an instant. A real clock refuses; so does a move back. */
  readonly plan: (move: { readonly span: string } | { readonly to: string }) => Planned;
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
  readonly door: (state: ClockState, request: Request, controller?: Controller) => Promise<Response> | undefined;
  /**
   * Run `f` with `Date` and Effect's `Clock` reading `source`, through every await, timer and `waitUntil` it starts. The
   * `Date` proxy is installed once, here, the first time it is asked; the source is per async context
   * (`AsyncLocalStorage`), never a global assignment. A scaled source is read live: each read works out the instant now.
   * Callers ask only for a world that is not real.
   */
  readonly within: <A>(source: ClockSource, f: () => A) => A;
  /**
   * `within` for an entry that holds a token of the world's count for its request (`box`): `end` gives it back when the entry
   * ends, whatever way it ends.
   */
  readonly entered: <A>(source: ClockSource, box: BusyBox, f: () => Promise<A>, end: (box: BusyBox) => Promise<unknown>) => Promise<A>;
  /** The running request's token box; nothing outside a request. */
  readonly box: () => BusyBox | undefined;
  /**
   * Point the request that is running at a fresh source: a durable sleep's wake does it, because the request outlived a move
   * of the world's clock (M8.06 call 4). Only this request's own cell changes. False outside a request.
   */
  readonly refresh: (source: ClockSource) => boolean;
  /** The wall clock, for the world's own lifetime and for a scaled clock to anchor against. Never patched. */
  readonly wall: () => number;
}
