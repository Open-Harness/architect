// What a change to the blueprint unproves. prove records, per operation that passed every eval, the hashes its proof
// rests on; impact compares today's model with them, so only what a change touches has to be proven again.
import type { Effect } from "effect";
import type { Change, Depends, Model, Versioned } from "@orthograph/compiler";
import type { JourneyVerdict, Result } from "#modules/verdicts/types.js";
import type { Verdict } from "#modules/evals/types.js";

/** `.ortho/evidence/proven.json`: the model last proven, and each proven operation's dependencies then. */
export interface Ledger {
  readonly model: Model;
  readonly proven: Readonly<Record<string, Depends>>;
  readonly verdicts?: Readonly<Record<string, {
    readonly storyHash: string;
    readonly journeys: ReadonlyArray<JourneyVerdict>;
  }>>;
  /** What `prove --changed` measures from: see `Proof`. */
  readonly changed?: Proof;
}

/** What a journey or an operation rested on when it was last judged, and whether it passed. */
export interface Judged {
  readonly inputs: string;
  readonly passed: boolean;
}

/**
 * The record of the last proof that `prove --changed` reads: a content hash, by relative path, of every file that can
 * change a proof (blueprint/, src/, journeys/, the config, package.json, the lockfile, tsconfig, .env), and per journey
 * and per operation the hash of the files it rests on with its last verdict.
 */
export interface Proof {
  readonly files: Readonly<Record<string, string>>;
  readonly journeys: Readonly<Record<string, Judged>>;
  readonly operations: Readonly<Record<string, Judged>>;
}

/**
 * What a proof rests on, read once when the run begins: a hash of every file that can change a proof, the files the model
 * places (reached by importing from an operation, a journey or a starting world), and each operation's and journey's inputs.
 */
export interface Stamp {
  readonly files: Readonly<Record<string, string>>;
  readonly placed: ReadonlySet<string>;
  readonly operations: Readonly<Record<string, string>>;
  /** By the journey's file (names may repeat). */
  readonly journeys: Readonly<Record<string, string>>;
}

/** What `prove --changed` will do, from the record and today's files. */
export interface Selection {
  /** The journeys to run, by file (the key of `model.journeys`: names may repeat). */
  readonly rerun: ReadonlyArray<string>;
  readonly skipped: ReadonlyArray<string>;
  /** The operations whose evals are judged again. */
  readonly judge: ReadonlyArray<string>;
  /** Set when it could not tell: every journey and every operation is then in `rerun` and `judge`. */
  readonly fellBack: null | { readonly reason: string; readonly files: ReadonlyArray<string> };
}

/** What a run judged: each journey it ran and each operation whose evals it judged. */
export interface Ran {
  readonly journeys: ReadonlyArray<{ readonly file: string; readonly passed: boolean }>;
  readonly operations: ReadonlyArray<{ readonly operation: string; readonly passed: boolean }>;
}

export interface Impact {
  /** What each mount provides and needs, printed first (M1-plugins section 7). */
  readonly edges?: ReadonlyArray<string>;
  /** What changed since the ledger's model. */
  readonly changes: ReadonlyArray<Change>;
  /** Proven once, but something its proof rests on has changed since. */
  readonly stale: ReadonlyArray<string>;
  /** Proven, and nothing it rests on has changed. */
  readonly proven: ReadonlyArray<string>;
  /** Never proven: new, or failing when last proven. */
  readonly unproven: ReadonlyArray<string>;
}

/** What the logbook adds: the changes since the last release, the version they make, and what is proven and stale in staging and production. */
export interface Shipped {
  /** The last production release's version, or null when there is none. */
  readonly from: string | null;
  readonly version: string;
  readonly changes: ReadonlyArray<Versioned>;
  readonly proven: ReadonlyArray<string>;
  readonly stale: ReadonlyArray<{ readonly operation: string; readonly environments: ReadonlyArray<string> }>;
}

export interface ImpactApi {
  /** After a prove: operations whose evals all passed become proven at today's hashes; failing ones are dropped. */
  readonly record: (root: string, model: Model, verdicts: ReadonlyArray<Verdict>, results?: ReadonlyArray<Result>) => Effect.Effect<void>;
  /** Read what a proof rests on, once, before a run: `select` and `settle` both take it, so what is recorded is what the run began with. */
  readonly stamp: (root: string, model: Model) => Effect.Effect<Stamp>;
  /** Which journeys and evals `prove --changed` runs: what changed since the last proof's record, or everything with the reason. */
  readonly select: (root: string, model: Model, stamp: Stamp) => Effect.Effect<Selection>;
  /** After a prove: the record `--changed` measures from, with what the run judged as it judged it and the rest as it was. */
  readonly settle: (root: string, model: Model, ran: Ran, stamp: Stamp) => Effect.Effect<void>;
  /** Today's model against the ledger. With no ledger every operation is unproven. */
  readonly of: (root: string, model: Model) => Effect.Effect<Impact>;
  /**
   * `changed operation allowance.spend: budget`, then `stale …`, `proven …` and `unproven …`, from the local ledger.
   * With the logbook's word (`shipped`) it is the release's that is printed instead: `changes since 1.0.0` and a line per
   * change (`added allowance.list minor`), `next <version>`, `stale <ops> in <envs>` (or `stale none`), `proven …`, and
   * `unproven …` for what no shipped environment has a passing `main` verdict for. What the local ledger finds stale is
   * then `locally stale …`, and only when there is some.
   */
  readonly lines: (impact: Impact, shipped?: Shipped) => ReadonlyArray<string>;
}
