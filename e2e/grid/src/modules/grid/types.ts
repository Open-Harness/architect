// The grid runner's contract (K14, `design/decisions/K14-the-grid.md`; Goal 3, "What the guardrail checks"). A cell is a
// building block in an output, and an eval judges it for one subject (the refusal `HandleTaken`, the operation
// `handle.claim`). The checked-in list holds the cells switched on; the runner judges each and writes one verdict per
// (cell, subject). Nothing here reads a file or prints: `src/main.ts` does, and hands values in.

/** The fourteen building blocks (K14, and invariants from G5), as `design/grid/types.ts` writes them. */
export const BLOCKS = ["thing", "operation", "step", "machine", "event", "error", "roles", "visibility", "environment", "store", "mount", "device", "journey", "invariant"] as const;
/** The nine outputs. */
export const OUTPUTS = ["model", "api", "server", "sdk", "cli", "mcp", "docs", "portal", "telemetry"] as const;
export type BlockId = (typeof BLOCKS)[number];
export type OutputId = (typeof OUTPUTS)[number];
/** `<block>.<output>`, e.g. `error.cli`: the id K14's `grid.json` gives each of the 126 cells. */
export type CellId = `${BlockId}.${OutputId}`;

/** One line of the checked-in list: a cell, the subjects it is switched on for, and the first journey that touched them. */
export interface SwitchedOn {
  readonly cell: CellId;
  /** What the cell is judged on: a refusal's name for the error row, an operation's name for the operation row. */
  readonly subjects: ReadonlyArray<string>;
  /** The journey whose green run touched it first: a cell is switched on by the first journey that touches it. */
  readonly switchedBy: string;
}
export interface List { readonly cells: ReadonlyArray<SwitchedOn> }

/** What an eval says about one subject: a pass or a fail, and the lines that show why (what was expected, what was seen). */
export interface Finding { readonly ok: boolean; readonly why: ReadonlyArray<string> }

/** An eval: a pure judgement of one subject over the evidence gathered for it. */
export interface Eval<Evidence> {
  readonly cell: CellId;
  readonly judge: (subject: string, evidence: Evidence) => Finding;
}

export interface Verdict {
  readonly cell: CellId;
  readonly subject: string;
  readonly verdict: "pass" | "fail";
  readonly switchedBy: string;
  readonly why: ReadonlyArray<string>;
}

/**
 * What a run writes. The shape is the logbook's `VerdictInput` (`packages/logbook/src/modules/book/types.ts`) with the cell
 * in the `operation` slot as `<cell>:<subject>`, so the CI job that holds the OIDC token can post each one as it is.
 */
export interface Report {
  readonly revision: string;
  readonly environment: string;
  readonly verdicts: ReadonlyArray<Verdict>;
  readonly passed: boolean;
}

/** A value or the problems that kept it from being one: errors are values here, never thrown. */
export type Parsed<A> = { readonly ok: true; readonly value: A } | { readonly ok: false; readonly problems: ReadonlyArray<string> };

/** A pair that is red today and allowed to be: why, and the slice or package file whose change turns it green (G7). */
export interface ExpectedRed {
  readonly cell: CellId;
  readonly subject: string;
  readonly reason: string;
  readonly waitsOn: string;
}

/** What comparing a run with the expected-red list found. A pair fixed must come off the list in the same change. */
export interface RatchetResult {
  /** Red now and not on the list: a new failure. */
  readonly unexpected: ReadonlyArray<string>;
  /** On the list but not switched on (or its cell has no such subject): the list holds a pair nothing judges. */
  readonly unjudged: ReadonlyArray<string>;
  /** On the list and green now: fixed, so it comes off the list. */
  readonly fixed: ReadonlyArray<string>;
  readonly expectedRed: number;
  readonly ok: boolean;
}

export interface GridApi {
  /** Read the expected-red list from its parsed JSON, naming every problem. */
  readonly parseExpected: (json: unknown) => Parsed<ReadonlyArray<ExpectedRed>>;
  /** Compare a run with the list: fails on a red pair not listed, a listed pair not judged, and a listed pair that is green. */
  readonly ratchet: (report: Report, expected: ReadonlyArray<ExpectedRed>) => RatchetResult;
  /** The lines to say about a ratchet result. */
  readonly ratchetLines: (result: RatchetResult) => ReadonlyArray<string>;
  /** Read the checked-in list from its parsed JSON. Every problem is named, with its place in the list. */
  readonly parse: (json: unknown) => Parsed<List>;
  /** Judge every switched-on (cell, subject). A cell with no eval is red: switched on, and nothing proves it. */
  readonly run: <Evidence>(options: {
    readonly list: List;
    readonly evals: ReadonlyArray<Eval<Evidence>>;
    /** Evidence for one cell's subject; the runner asks once per (cell, subject). */
    readonly evidence: (cell: CellId, subject: string) => Evidence;
    readonly revision: string;
    readonly environment: string;
  }) => Report;
  /** The lines to say: one per verdict, red ones with their reasons, then the count. */
  readonly lines: (report: Report) => ReadonlyArray<string>;
  /** One report from several: the verdicts in order, passed only when every one passed. */
  readonly combine: (reports: ReadonlyArray<Report>, revision: string, environment: string) => Report;
  /** The list with `entries` added: a cell already on keeps its first journey and gains any new subjects. Never switches one off. */
  readonly switchOn: (list: List, entries: ReadonlyArray<SwitchedOn>) => List;
}
