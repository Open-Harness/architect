// What the environment is doing now, read from the snapshot's `telemetry` (the server derived and scrubbed it). Every reader says `not yet` when
// there is no live source and gives the source's reason when it failed: a number the portal could not read is never a zero.
import type { TelemetryCall } from "@orthograph/portal";
import type { PortalData } from "../data/types.ts";

/** The words a number has when the portal has no source for it. */
export const NOT_YET = "not yet";

/** How many calls the rail lists. Check 21 K counts home's `last-call` elements and wants exactly 2 where the window holds 4 calls with spans. */
export const RAIL_CALLS = 2;

export interface Tally {
  readonly calls: string;
  readonly answered: string;
  readonly refused: string;
  readonly defects: string;
}

export interface LiveApi {
  /** The environment this portal is, and the window it counts over; `not yet` where there is no live source. */
  readonly environmentOf: (data: PortalData) => { readonly name: string; readonly windowMs: string };
  /** The window's counts for one operation, several, or every operation (`undefined`). */
  readonly tallyOf: (data: PortalData, operations?: string | ReadonlyArray<string>) => Tally;
  /** The newest calls of some operations (or all), a retry being one call, at most `RAIL_CALLS`. */
  readonly lastCalls: (data: PortalData, operations?: ReadonlyArray<string>) => ReadonlyArray<TelemetryCall>;
  /** Why a source has nothing to draw: no source at all, or the reason its read failed. `undefined` when it is there. */
  readonly whyNot: (data: PortalData, source: "metrics" | "calls") => string | undefined;
}
