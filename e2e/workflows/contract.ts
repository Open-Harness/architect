// The Worker's contract, in types and literals: what `examples/workflows/src/worker.ts` must export and serve for the
// journeys to drive it (README.md, "The Worker's contract", says the same in words). Every expected value a journey
// uses is written here or in the journey, never read back from the run it judges.

/** Where the world's stepped clock starts (K23's example): 1 November 2026, 09:00 UTC. The harness passes it as `WORLD_START`. */
export const WORLD_START = "2026-11-01T09:00:00.000Z";
export const DAY = 86_400_000;
const START = Date.parse(WORLD_START);
/** The world's instant `days` days after it started, as the world prints it. */
export const day = (days: number): string => new Date(START + days * DAY).toISOString();

/** The Durable Object classes the Worker module must export, and the bindings the harness gives them (all SQLite-backed). */
export const CLASSES = {
  CLUSTER_WORKFLOW: "ClusterWorkflow",
  WORKFLOW_WAITS: "WorkflowWaits",
  WORLD: "World",
  LEDGER: "Ledger",
} as const;

/** What the stand-in operations answer, fixed so a journey can name an event's `match` before the run has reached it. */
export const digestOf = (revision: string): string => `digest-of-${revision}`;
export const proposalOf = (revision: string): string => `proposal-of-${revision}`;

/** The operations the stand-ins stand for, by verb: the ledger is keyed by them. `propose` is the activity that calls `open`. */
export type Operation = "freeze" | "open" | "link" | "withdraw";

/** `POST /workflows/publish/start { revision }`. The same revision twice is one run. */
export interface Started {
  readonly execution: string;
}

/** `GET /runs/<execution>`: `done` once the handler has returned, with what it returned. */
export interface RunState {
  readonly done: boolean;
  readonly value?: unknown;
}

/** `POST /events/emit { event, fields, key }`: writes the journal entry, then calls `WorkflowEvents.deliver` with it. */
export interface Emitted {
  readonly woken: number;
}

/** `GET /_world/clock` (M8-checks, call 9): the world's clock and its pending timers. */
export interface ClockState {
  readonly kind: string;
  readonly now: string;
  readonly timers: ReadonlyArray<{ readonly due: string; readonly owner: string; readonly name: string }>;
}

/** `POST /_world/clock/advance { span }` (M8-checks, call 9): answers once the world is quiet at the target. */
export interface Advanced {
  readonly now: string;
  readonly fired: ReadonlyArray<unknown>;
}

/**
 * `GET /_probe/ledger?revision=<id>`: the outside world the stand-in operations change, for one revision. `calls` counts
 * every run of an operation's body; `applied` counts the effects applied (one per request key); `keys` lists the request
 * key each call carried, in order; `answers` is what the first applied call answered.
 */
export interface Ledger {
  readonly calls: Record<Operation, number>;
  readonly applied: Record<Operation, number>;
  readonly keys: Record<Operation, ReadonlyArray<string>>;
  readonly answers: Partial<Record<Operation, Record<string, unknown>>>;
}

/** Every operation's count, zero for the ones a journey does not name: `calls` and `applied` always list all four. */
export const counts = (some: Partial<Record<Operation, number>>): Record<Operation, number> => ({ freeze: 0, open: 0, link: 0, withdraw: 0, ...some });

/**
 * `GET /_probe/peek?execution=<id>`: which instance of the run's object answered (`born` differs after an eviction or a
 * restart) and the declaration keys of the activities whose results it has stored (`freeze`, `propose`, ...; no attempt
 * suffix). It may list other stored work under keys of its own; the journeys read only `freeze`, `propose`, `link` and `withdraw`.
 */
export interface Peek {
  readonly born: number;
  readonly activities: ReadonlyArray<string>;
}

/** `GET /_probe/waits`: every wait still registered, across runs. */
export interface Waits {
  readonly rows: ReadonlyArray<{ readonly event: string; readonly execution: string; readonly activity: string }>;
}

/*
 * The probes that steer the stand-in operations, all `POST`, all answering `{}`:
 * `/_probe/hold { operation }` blocks the next call after it is counted, until `/_probe/release { operation }`;
 * `/_probe/slow { operation, ms }` makes the next call wait `ms` real milliseconds after it is counted and before its
 * effect is applied; `/_probe/crash { operation }` aborts the run's object in the next call, after its effect.
 */

/** The event the example's `seen` activity waits for (`blueprint/things/proposal/events.ts`). */
export const PROPOSAL_OPENED = "ProposalOpened";
