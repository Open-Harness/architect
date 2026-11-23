// `ortho env up staging --run <id>` and `ortho env destroy staging --run <id>`: the infra projection of one environment on Cloudflare (M7.03, M7.04).
// The plan is what both commands print (`--plan`) and what both then do: one function, made from the model, the app's name and the run.
import { Data, type Effect } from "effect";

/** What a command prints and how it exits; only `main.ts` writes it out. */
export interface Said {
  readonly out: string;
  readonly err: string;
  readonly exit: number;
}

export type Kind = "worker" | "d1" | "durable-object-namespace";
export interface Resource {
  readonly kind: Kind;
  /** A Worker's or a database's name, under the run's prefix. */
  readonly name?: string;
  /** A database's binding in the Worker. */
  readonly binding?: string;
  /** A namespace's Worker, under the run's prefix. */
  readonly script?: string;
  /** A namespace's class. */
  readonly class?: string;
}
/** The one plan: what a staging deploy makes and what a destroy deletes. Printed as one JSON document. */
export interface Plan {
  readonly app: string;
  readonly environment: string;
  readonly run: string;
  readonly prefix: string;
  readonly resources: ReadonlyArray<Resource>;
}

/** A request the plan turns away (a bad run id, a name too long, an environment that is not declared, no credential): exit 2, nothing made. */
export class StagingRefused extends Data.TaggedError("StagingRefused")<{ readonly message: string }> {}
/** The cloud said no, or answered something unreadable: exit 1. What it says never holds a credential. */
export class StagingFailed extends Data.TaggedError("StagingFailed")<{ readonly message: string }> {}

/** What a Cloudflare account is asked, by the REST calls the spike proved (`spikes/staging-pass`): the listings the destroy sweep reads, its deletes, and the address. Every method acts on one account. */
export interface Account {
  readonly workers: Effect.Effect<ReadonlyArray<string>, StagingFailed>;
  readonly databases: Effect.Effect<ReadonlyArray<{ readonly id: string; readonly name: string }>, StagingFailed>;
  /** Deletes a Worker and, with it, its Durable Object namespaces. */
  readonly deleteWorker: (name: string) => Effect.Effect<void, StagingFailed>;
  readonly deleteDatabase: (id: string) => Effect.Effect<void, StagingFailed>;
  /** The account's `workers.dev` subdomain. */
  readonly subdomain: Effect.Effect<string, StagingFailed>;
}

export interface Credentials {
  readonly token: string;
  readonly account: string;
}

/** The world `up` and `destroy` act through, handed in: the cloud, Alchemy (which makes and removes what the stack declares), the address's first answers, and waiting. */
export interface Tools {
  readonly account: (credentials: Credentials) => Account;
  /** Runs the Alchemy CLI in `cwd`, where its state lives, with the credentials and `env` in its environment; only its status and its words come back. */
  readonly alchemy: (options: { readonly args: ReadonlyArray<string>; readonly cwd: string; readonly credentials: Credentials; readonly env: Readonly<Record<string, string>> }) => Effect.Effect<{ readonly status: number; readonly output: string }, StagingFailed>;
  /** The HTTP status of one GET, or 0 when nothing answered. */
  readonly probe: (url: string) => Effect.Effect<number>;
  /** Waits; the only place a wait is made. */
  readonly pause: (millis: number) => Effect.Effect<void>;
  /** A fresh random secret for the Worker, never printed. */
  readonly secret: () => string;
  /** The bundle of the revision, once (`Build.build`, with no credential). */
  readonly build: (root: string) => Effect.Effect<{ readonly main: string; readonly revision: string; readonly sha256: string }, StagingFailed>;
}

export interface Options {
  readonly root: string;
  readonly environment: string;
  /** `--run`, as typed; absent when not given. */
  readonly run: string | undefined;
  /** What `main.ts` read from the process. Absent or empty is "not set". */
  readonly credentials: { readonly token: string | undefined; readonly account: string | undefined };
}

export interface StagingApi {
  /** `ortho env up <env> --plan`: the plan as one JSON document, byte for byte the same each time; nothing is written and nothing is read from the cloud. */
  readonly plan: (options: Options) => Effect.Effect<Said>;
  /** `ortho env up <env>`: makes what the plan lists. Without credentials it says so and makes no connection. */
  readonly up: (options: Options) => Effect.Effect<Said>;
  /** `ortho env destroy <env>`: deletes every Worker and database whose name carries the run's prefix, matched at a dash, and nothing else. */
  readonly destroy: (options: Options) => Effect.Effect<Said>;
  /** The prefix every name of a run carries: formed here and nowhere else. */
  readonly prefix: (app: string, short: string, run: string) => string;
  /** The `workers.dev` address of a run's deployed Worker. */
  readonly url: (prefix: string, subdomain: string) => string;
}
