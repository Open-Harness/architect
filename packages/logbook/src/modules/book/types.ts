// The ledger: every verdict posted, and the production releases, in one Durable Object's SQLite (D3 #3).
// Nothing here knows about tokens or HTTP; the worker passes the claims of a token it has already verified.
export type VerdictValue = "pass" | "fail";

export interface JourneyVerdict {
  readonly journey: string;
  readonly modelHash: string;
  readonly handlerHash: string | null;
  readonly verdict: VerdictValue;
}

/** What a caller posts. `revision` is the job's own field, never the token's `sha` (D3 #8). */
export interface VerdictInput {
  readonly revision: string;
  readonly environment: string;
  readonly operation: string;
  readonly verdict: VerdictValue;
  /** Bundle proved by this verdict. Absent or null on legacy rows; never inferred or backfilled. */
  readonly sha256?: string | null;
  readonly journeys?: ReadonlyArray<JourneyVerdict>;
}

/** Where a write came from: the verified token's claims. Stored with it so a pull request's verdict is never taken for main's. */
export interface Provenance {
  readonly repository: string;
  readonly ref: string;
  readonly workflow: string;
  readonly eventName: string | null;
  readonly sha: string | null;
}

/** A verdict as stored and read back. `seq` orders the whole ledger: the larger is the later. */
export interface StoredVerdict extends VerdictInput {
  readonly seq: number;
  readonly repository: string;
  readonly ref: string;
  readonly workflow: string;
  readonly event_name: string | null;
  readonly sha: string | null;
}

/** Every filter is optional; the ones given must all match. `ref` is how a reader asks for `refs/heads/main` verdicts only. */
export interface VerdictFilter {
  readonly revision?: string;
  readonly environment?: string;
  readonly operation?: string;
  readonly ref?: string;
}

export interface Release {
  readonly seq: number;
  readonly version: string;
  readonly revision: string;
  readonly ref: string;
  readonly event_name: string | null;
}

/** The Durable Object's methods, called through its stub. All plain data in and out. */
export interface BookApi {
  /** Add a verdict. Every post is kept: a revision proven twice has two. */
  readonly record: (verdict: VerdictInput, from: Provenance) => StoredVerdict;
  /** Every verdict matching the filter, oldest first. */
  readonly verdicts: (filter: VerdictFilter) => ReadonlyArray<StoredVerdict>;
  /** The latest verdict of each operation in each environment among those matching the filter. */
  readonly latest: (filter: VerdictFilter) => ReadonlyArray<StoredVerdict>;
  /** Record a production release: the release made, or null when that version was released already. A version is released once. */
  readonly release: (version: string, revision: string, from: Provenance) => Release | null;
  /** The last production release, or null when there is none. */
  readonly latestRelease: () => Release | null;
}
