// The portal's monitor (M1.49, K18): the alert rules the compiler derived, evaluated over the window at the portal's `now`, and the issues the window's
// defects open, kept past the window in a ledger the portal is handed. Plain data: this is what `GET /_portal/v1/monitor` answers. Nothing here sends
// anything or reads a clock; a firing alert is shown, never delivered (K18 decision 4: local shows and never sends).
import type { Effect } from "effect";
import type { BlueprintWire } from "#modules/wire/types.js";
import type { PortalLive } from "#modules/telemetry/types.js";

/** What a Worker keeps across requests, as the portal is handed it: opaque JSON by key. Where it lives is the Worker's (`portal.md` hole 7). */
export interface MonitorLedger {
  readonly get: (key: string) => Effect.Effect<unknown>;
  readonly put: (key: string, value: unknown) => Effect.Effect<void>;
}

/** What one window of a burn alert counted: the calls that started within `ms` of `now`, and how many were bad for its objective. */
export interface WindowCount { readonly ms: number; readonly calls: number; readonly bad: number }

/**
 * One (rule, alert) the environment evaluates. A burn alert is `firing` or `ok` with what each window counted (long, then short); a rule with no burn
 * alerts (an anomaly, a verdict) is one row named for its kind, `unknown` for now: nothing judges it yet, and the portal never says ok for what it did not read.
 */
export interface AlertRow {
  readonly rule: string;
  readonly alert: string;
  readonly state: "firing" | "ok" | "unknown";
  readonly severity: string;
  readonly windows?: ReadonlyArray<WindowCount>;
}

/** A call's start and the operation's declaration hash in the wire in force when the portal saw it. */
export interface Seen { readonly at: number; readonly hash: string }

/** One (operation, step, error tag): a group of defects. `regressed` is the operation's declaration having changed between first and last seen. */
export interface IssueRow {
  readonly key: string;
  readonly operation: string;
  readonly step: string;
  readonly tag: string;
  readonly owner: string;
  /** Calls, never evaluations. */
  readonly occurrences: number;
  readonly firstSeen: Seen;
  readonly lastSeen: Seen;
  readonly regressed: boolean;
}

export interface MonitorView {
  readonly environment: string;
  /** The window's end: the only clock a page may show. */
  readonly now: number;
  readonly alerts: ReadonlyArray<AlertRow>;
  readonly issues: ReadonlyArray<IssueRow>;
}

export interface MonitorApi {
  /** Never fails: a source that cannot be read leaves its alerts `unknown` and the issues the ledger already holds. Reads and writes the ledger, nothing else; no clock, no network. */
  readonly read: (blueprint: BlueprintWire, live: PortalLive, ledger: MonitorLedger | undefined) => Effect.Effect<MonitorView>;
}
