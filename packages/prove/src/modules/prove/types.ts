// `ortho prove --env local`: a fresh local world and a real collector, every journey run, the nine evals judged.
// `ortho prove --env test`: the same, in a world of the long-lived test environment, with a signed verdict per operation.
import { Data, type Effect, type Scope } from "effect";
import type { Result, TokenSource } from "#modules/verdicts/types.js";
import type { D1Access } from "#modules/journeys/types.js";
import type { ProveReport } from "./internal/structured.ts";

export type { ChangedDetail, FailureDetail, JourneyDetail, ProveReport, StepDetail } from "./internal/structured.ts";

export class ProveFailed extends Data.TaggedError("ProveFailed")<{ readonly message: string }> {}

export interface Report {
  /** What prove says, line by line: journeys, then each operation's evals, then coverage, then the verdict. */
  readonly lines: ReadonlyArray<string>;
  readonly passed: boolean;
  /** The same run as data (`ortho prove --json`, `--report <file>`): per journey, per step, totals and timings. */
  readonly structured: ProveReport;
  /** How many leading `lines` were already said through `say` as they became true: a caller that printed them prints the rest. */
  readonly said?: number;
}

export interface ProveApi {
  /**
   * Prove the project at `root` on a local world served on `port` (0: any free port). Nothing is left running when the scope closes:
   * wrangler is stopped and the collector is closed. A project that runs and fails its journeys or evals is a
   * report with `passed: false`.
   */
  readonly run: (options: {
    readonly root: string;
    readonly port: number;
    /** Run journey calls on scaffolds and print results without recording proof verdicts. */
    readonly empty?: boolean;
    /** Run one journey by its declared name, without recording proof verdicts. */
    readonly only?: string;
    /**
     * Run only the journeys a change since the last proof's record touches (and judge the evals of what changed), naming each
     * it skipped; run everything, saying why, when it cannot tell. The proof it leaves is recorded as a full run's is.
     */
    readonly changed?: boolean;
    /** Said as it is true, ahead of the report: `--changed` says what it will run before a world that cannot start can hide it. */
    readonly say?: (line: string) => Effect.Effect<void>;
    /** The process environment, for the sinks' tokens (`AXIOM_TOKEN`): only an entry file reads it. */
    readonly env?: Readonly<Record<string, string | undefined>>;
  }) => Effect.Effect<Report, ProveFailed, Scope.Scope>;

  /**
   * `ortho dev`: a local world on `port` and a collector (writing `.ortho/dev-telemetry`) that stay up while the scope is open; the
   * local environment's sinks get what they are named for. A `prove` that finds them uses them (`warm`, ST1.24).
   */
  readonly dev: (options: {
    readonly root: string;
    readonly port: number;
    /** This process's id, which `ortho prove` reads to tell a live `ortho dev` from a record one left behind. */
    readonly pid: number;
    readonly env?: Readonly<Record<string, string | undefined>>;
  }) => Effect.Effect<{ readonly url: string; readonly log: string; readonly notes: ReadonlyArray<string> }, ProveFailed, Scope.Scope>;

  /**
   * Prove the project in a world of the test environment, which it starts if it is down, on the revision it was asked
   * to prove (the git commit). Each line is `say`d as it is true, so a run that dies part-way has said where it was:
   * `world test-<id> · expires in <lifetime>` once the world exists, the journeys and evals, `verdicts <op> ✔ …
   * (revision <rev>)` once the logbook holds them, and `world destroyed` last. The world is destroyed whether the run
   * passes, fails or is interrupted; only a killed process leaves it, for its alarm and `worlds reap`.
   * `lifetime` overrides the environment's own (`20s`, `2 hours`).
   */
  readonly test: (options: {
    readonly root: string;
    readonly lifetime?: string;
    /** The process environment, for the telemetry sinks' tokens (`AXIOM_TOKEN`): only an entry file reads it. */
    readonly env?: Readonly<Record<string, string | undefined>>;
    readonly logbook: string;
    readonly token: TokenSource;
    readonly say: (line: string) => Effect.Effect<void>;
  }) => Effect.Effect<{ readonly passed: boolean }, ProveFailed>;

  /**
   * Prove the journeys against a deployed Worker at `url` (`ortho prove --env staging --run <id>`, M7.04), in no world of its
   * own. The Worker's `/_world` is closed, so each journey's people sign up through Better Auth's routes. There is no
   * collector, so the journeys are judged and the nine evals are not (`totals.evalsFailed` is 0). `url` that nothing answers,
   * or that answers 404 to everything (a Worker never deployed), is a `ProveFailed` naming it, before any journey runs.
   */
  readonly staged: (options: {
    readonly root: string;
    readonly url: string;
    /** What the address is called in a refusal, e.g. `run r4417`. */
    readonly label: string;
    readonly only?: string;
    /** The deployed environment's database, read through Cloudflare's API with the operator's credential. Without it the journeys' facts come from the Worker's own `/_world`, which only a local world has. */
    readonly d1?: D1Access;
  }) => Effect.Effect<Report, ProveFailed>;

  /**
   * Prove the project against an environment that is already running (staging), and post nothing. A real environment has
   * no `/_world/cast`, so each journey's people sign up for real through Better Auth's own routes, with credentials of
   * their own; the journeys and the nine evals are otherwise the same, judged from the environment's own collector
   * (`telemetry`, the folder it writes). Each line is `say`d as it is true. Returns the verdict of each operation, which the
   * caller records: a failing one too.
   */
  readonly against: (options: {
    readonly root: string;
    readonly url: string;
    readonly telemetry: string;
    /**
     * The environment's state folder (`.ortho/environments/<env>/state`). Its `/_world/*` is closed, so the rows and
     * journal the evals read come from its database file instead (D3 #127). Without it, from the world's own front door.
     */
    readonly state?: string;
    readonly say: (line: string) => Effect.Effect<void>;
  }) => Effect.Effect<{ readonly passed: boolean; readonly results: ReadonlyArray<Result> }, ProveFailed>;
}
