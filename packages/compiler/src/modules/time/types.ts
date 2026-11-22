// What the model says about time: a move's `by`, `late` and `lazy`, and an environment's clock. Plain data, in the shapes
// `design/milestones.md` M8.09 fixes, so the Solidity machine (M6.21) reads them as they are.
import type { Clock, Move, Thing } from "orthograph";

export type ByModel =
  | {
      readonly kind: "every";
      /** As written: `"1 month"`. */
      readonly span: string;
      /** The thing's own instant field the period counts from. */
      readonly from?: string;
      /** A day on the calendar, worked out in `zone`. */
      readonly on?: { readonly day: number | "last" } | { readonly weekday: string };
      /** A tz database name, or a text field of the thing. */
      readonly zone?: string;
    }
  | { readonly kind: "after"; readonly field: string; readonly span: string };

/** What a move made by time adds to its machine entry, beside `from`, `to` and `emits`. */
export interface MoveTimeModel {
  readonly by: ByModel;
  /** How long after its due instant the move may still run on time. Absent: it must run exactly when due. */
  readonly late?: string;
  /** Worked out at the thing's next use; the keeper never fires it. */
  readonly lazy?: true;
}

/** An environment's clock, its start normalised to ISO 8601 with milliseconds. */
export type ClockModel =
  | { readonly kind: "real" }
  | { readonly kind: "stepped"; readonly starts: string }
  | { readonly kind: "scaled"; readonly starts: string; readonly speed: number };

export interface TimesApi {
  /**
   * A move's time declaration, checked against its thing: every problem is named by the move (`membership.renew`) and its
   * machine file. A move with no `by` has none to check, and `late` or `lazy` beside no `by` is a problem.
   */
  readonly move: (spec: { readonly name: string; readonly thing: Thing; readonly key: string; readonly move: Move }) => {
    readonly time: MoveTimeModel | undefined;
    readonly problems: ReadonlyArray<string>;
  };
  /** `move`, pushing its problems (each led by `file`) onto `problems` and handing back what the model adds to the move. */
  readonly timed: (spec: { readonly name: string; readonly thing: Thing; readonly key: string; readonly move: Move; readonly file: string; readonly problems: Array<string> }) => MoveTimeModel | undefined;
  /** Whether any operation or read lists the keeper, given each one's declared `allowed` (a blank's says nothing). */
  readonly keeperUsed: (declared: ReadonlyArray<unknown>) => boolean;
  /** What is wrong with who an operation or a read allows: the keeper only on a move made by time, and only there. */
  readonly keeper: (spec: {
    readonly file: string;
    readonly name: string;
    readonly kind: "operation" | "read";
    readonly move: Move | undefined;
    readonly allowed: ReadonlyArray<{ readonly kind: string }>;
  }) => ReadonlyArray<string>;
  /** An environment's clock, or the problems with it. */
  readonly clock: (spec: { readonly file: string; readonly clock: Clock }) => {
    readonly clock: ClockModel | undefined;
    readonly problems: ReadonlyArray<string>;
  };
}
