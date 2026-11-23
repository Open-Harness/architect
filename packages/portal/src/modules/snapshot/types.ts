// What the portal knows about proof right now, per operation and environment (F1 §1). Plain data: this is what
// `GET /_portal/v1/snapshot` answers, and what any face renders.
import type { Effect } from "effect";
import type { LogbookReader, Release, Verdict } from "#modules/reader/types.js";
import type { Availability, BlueprintWire } from "#modules/wire/types.js";

/**
 * `recorded-pass`: the newest `main` verdict is a pass and its contract still matches the current one; it is not a fresh run of the
 * candidate. `failed`: the newest verdict is a failure, whatever came before. `stale`: a pass whose contract has since changed.
 * `unproven`: no verdict. `unavailable`: the portal could not tell, and says why. Only `recorded-pass` is ever shown as a tick.
 */
export type ProofState = "recorded-pass" | "failed" | "stale" | "unproven" | "unavailable";

export interface ChangedDependency {
  readonly key: string;
  readonly was: string;
  /** Null when the declaration is gone. */
  readonly now: string | null;
}

export interface PortalProof {
  readonly operation: string;
  readonly environment: string;
  readonly state: ProofState;
  /** Why the state is what it is, when it is not a plain pass or fail. */
  readonly reason: string | null;
  /** The exact logbook row, provenance intact. */
  readonly evidence: Availability<Verdict>;
  /** The logbook does not say whether journeys ran or a verdict was carried, so every legacy row is `unknown`. */
  readonly execution: "unknown" | "executed" | "carried";
  readonly changedDependencies: ReadonlyArray<ChangedDependency>;
  /** The evidence is for another revision than the candidate, and the contract is unchanged: "contract unchanged; candidate not rerun". */
  readonly candidateNotRerun: boolean;
  readonly evals: Availability<ReadonlyArray<unknown>>;
}

export interface PortalSnapshot {
  readonly schemaVersion: 1;
  /** The blueprint this snapshot is for; a reader holding another one reloads. */
  readonly blueprintDigest: string;
  /** The adapter's clock, never a ledger sequence. */
  readonly observedAt: string;
  /** `checked`: the ledger read the same before and after its models were fetched. Not an atomic read of storage. */
  readonly consistency: "checked" | "unavailable";
  /** The revision this environment's bundle is, when it says. */
  readonly bundleRevision: string | null;
  /** What proofs are judged against: the newest revision proven in `test` that the logbook holds the model of, else this bundle. */
  readonly candidate: { readonly revision: string | null; readonly source: "logbook" | "bundle" };
  readonly environments: ReadonlyArray<string>;
  readonly operations: ReadonlyArray<string>;
  /** Every current operation in every declared environment. */
  readonly proofs: ReadonlyArray<PortalProof>;
  readonly release: Availability<Release | null>;
  readonly comparison: Availability<never>;
}

export interface SnapshotApi {
  /** Never fails: every failure is a value inside the snapshot, and none of them is green. A `null` reader is a portal with no logbook. */
  readonly take: (options: {
    readonly blueprint: BlueprintWire;
    readonly reader: LogbookReader | null;
    readonly bundleRevision: string | null;
    /** Default `refs/heads/main`. */
    readonly ref?: string;
    /** When given, `observedAt` is this instant (the portal's `now`) and no clock is read. */
    readonly now?: number;
  }) => Effect.Effect<PortalSnapshot>;
}
