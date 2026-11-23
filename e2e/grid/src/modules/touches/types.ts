// Which building blocks did a journey touch? Goal 3: "a cell is switched on by the first journey that touches it", and a
// journey's cells are checked "when every step of a journey is green". The answer is a function of two things the climb
// already has: the compiled model (what each step calls, expects and refuses) and prove's own report (did the journey go green).
import type { BlockId, SwitchedOn } from "../grid/types.ts";

export interface StepCheck { readonly kind: string; readonly error?: string; readonly event?: string; readonly thing?: string }
/** A starting world: the calls that make it, and the world it grows from. */
export interface WorldView {
  readonly name: string;
  readonly from: string | null;
  readonly cast?: Readonly<Record<string, { readonly kind: string; readonly role?: string }>>;
  /** A call whose operation is outside the model (a plugin's mount omits it) is `null`, as the compiler writes it. */
  readonly makes: ReadonlyArray<{ readonly actor: string; readonly operation: string } | null>;
}
/**
 * A compiled step: a call with its checks, or `{ title, skipped }` when its operation is outside the model. The checks the
 * compiler writes are `expect`, `expect-equal`, `emits`, `refuses`, `is-in`, `no-events` and `spans`; only `refuses` and `emits` name a block.
 */
export type StepView =
  | { readonly title: string; readonly skipped: string; readonly call?: undefined; readonly checks?: undefined }
  | { readonly title: string; readonly skipped?: undefined; readonly call: { readonly actor: string; readonly operation: string }; readonly checks: ReadonlyArray<StepCheck> };

export interface JourneyView {
  readonly name: string;
  readonly starts?: string | null;
  readonly cast?: Readonly<Record<string, { readonly kind: string; readonly role?: string }>>;
  readonly steps: ReadonlyArray<StepView>;
}
/** What the model says that touching reads. `generated/model/model.json` has all of it. */
export interface TouchModel {
  readonly journeys?: Readonly<Record<string, JourneyView>>;
  readonly startingWorlds?: Readonly<Record<string, WorldView>>;
  readonly operations: Readonly<Record<string, {
    readonly name: string;
    readonly thing: string;
    readonly move?: null | { readonly emits: string };
    readonly steps?: Readonly<Record<string, { readonly name: string }>>;
    readonly payload?: Readonly<Record<string, { readonly visibility?: unknown }>>;
    readonly answer?: Readonly<Record<string, { readonly visibility?: unknown }>>;
    /** From each refusal a rule owns, the rule that gives it (`HandleTaken` to `handle.oneHolderPerName`). */
    readonly invariants?: Readonly<Record<string, string>>;
  }>>;
  readonly things: Readonly<Record<string, {
    readonly machine?: null | { readonly notFrom: { readonly error: string } };
    /** The refusal for an id that names no such thing, when the thing can be missed (`PersonNotFound`). */
    readonly notFound?: { readonly error: string };
    readonly fields?: Readonly<Record<string, { readonly visibility?: unknown }>>;
    /** The thing's rules by their own name; a rule's subject is `<thing>.<rule>`. */
    readonly invariants?: Readonly<Record<string, unknown>>;
  }>>;
}

/** One building block used, by name: `error` `HandleTaken`, `operation` `handle.claim`. */
export interface Row { readonly block: BlockId; readonly subject: string }

export interface Touched {
  /** Did prove report every step of the journey green. Nothing is touched by a journey that is not. */
  readonly green: boolean;
  readonly rows: ReadonlyArray<Row>;
  /** Why it is not green or not known, when that is the case. */
  readonly problems: ReadonlyArray<string>;
}

export interface TouchesApi {
  /** The rows a journey used, from the model, once prove's report (`journey <name> ✔ n/n steps`) says it went green. */
  readonly of: (options: { readonly model: TouchModel; readonly journey: string; readonly report: ReadonlyArray<string> }) => Touched;
  /**
   * The list entries that switch these rows on: each touched block in all nine outputs, with or without an eval (a cell with
   * none is red, which is the work for a framework builder), the journey recorded as what switched it on. Feed them to `Grid.switchOn`.
   */
  readonly entries: (touched: Touched, journey: string) => ReadonlyArray<SwitchedOn>;
}
