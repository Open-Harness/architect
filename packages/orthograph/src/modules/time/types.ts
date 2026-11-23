// Time in the language: how a move made by time is declared (`by`), and how an environment's clock is.
export type Unit =
  | "second" | "seconds" | "minute" | "minutes" | "hour" | "hours" | "day" | "days" | "week" | "weeks" | "month" | "months" | "year" | "years";

/** A span in words, calendar words included: `"1 month"`, `"14 days"`: a whole number of a unit (the compiler refuses `"1.5 months"`). Months and years are worked out on the calendar, in an anchor's zone. */
export type Span = `${number} ${Unit}`;

export type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

/** A day on the calendar: the Nth of the month, the month's last day, or a day of the week. Worked out in the move's zone. */
export type OnCalendar = { readonly day: number | "last" } | { readonly weekday: Weekday };

/** How often a move happens, or when it falls due. Plain data, read by the compiler and written as is into the model. */
export type TimeBy =
  | {
      readonly kind: "every";
      readonly span: Span;
      /** The thing's own instant field the period counts from: the same day each month, a short month's last day. */
      readonly from?: string;
      /** Or a day on the calendar. It must name its `zone`. */
      readonly on?: OnCalendar;
      /** A fixed zone (`"Europe/London"`) or a text field of the thing. Only a calendar anchor needs one. */
      readonly zone?: string;
    }
  | { readonly kind: "after"; readonly span: Span; readonly field: string };

export interface TimeApi {
  /** Every `span`, from a field of the thing or on a day of the calendar. */
  readonly every: (span: Span, anchor?: { readonly from?: string; readonly on?: OnCalendar; readonly zone?: string }) => TimeBy;
  /** `span` after the thing's own instant `field`. Leaving the state the move starts from clears it. */
  readonly after: (field: string, span: Span) => TimeBy;
}

/** An environment's clock: the wall clock, one that stands still until it is moved, or one that runs at a speed. */
export type Clock =
  | { readonly kind: "clock"; readonly which: "real" }
  | { readonly kind: "clock"; readonly which: "stepped"; readonly starts: string }
  | { readonly kind: "clock"; readonly which: "scaled"; readonly starts: string; readonly speed: number };

export interface ClockApi {
  /** The wall clock: staging, production and any public chain. Nothing can move it. */
  readonly real: () => Clock;
  /** Time stands still until it is moved: journeys, local and test worlds. `starts` is an ISO 8601 instant. */
  readonly stepped: (spec: { readonly starts: string }) => Clock;
  /** Time flows at `speed` seconds per second (default 1), and can also be jumped forward. */
  readonly scaled: (spec: { readonly starts: string; readonly speed?: number }) => Clock;
}

/** A span read back from its words: `"14 days"` is 14 of `day`. */
export interface ReadSpan {
  readonly count: number;
  readonly unit: "second" | "minute" | "hour" | "day" | "week" | "month" | "year";
}

export interface SpansApi {
  /** A span's count and singular unit, or nothing when it isn't written as `"<n> <unit>"`. */
  readonly read: (span: string) => ReadSpan | undefined;
}
