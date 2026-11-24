// The gate's views (GOAL17-stage-one, call 8): what it reads, all of it values. Pure: no store, no clock.
export type Strength = "explicit" | "inferred" | "none";

/** One outside account as the gate reads it. `external` is the outside id, as `policy.bots` lists it. */
export interface Account {
  readonly state: "seen" | "listed" | "unlisted";
  readonly bot: boolean;
  readonly external: string;
}

export interface TriggerView {
  /** The payload's, from the mapping. */
  readonly addressed: "mention" | "direct" | undefined;
  /** Null: no sender. */
  readonly author: Account | null;
  /** The admission row, from the source's `scope`. */
  readonly row: string;
  /** The source receives every message there (`scope.observed`). */
  readonly observed: boolean;
}

/** The thread's own; the gate reads only the tickets below. Kept because the brief's `Gate.of` takes it. */
export interface ThreadView {
  readonly key: string;
}

/** One ticket that has the thread, as its subscription says. */
export interface TicketView {
  readonly state: "open" | "ended" | "stopped";
  /** `context` grants no follow-up strength. */
  readonly mode: "own" | "attached" | "context" | "bound";
  /** A stop by a person ends follow-up for good. */
  readonly stoppedBy: "person" | undefined;
}

export interface PolicyView {
  readonly mode: "off" | "observe" | "auto";
  /** This source's bot list, outside ids. */
  readonly bots: ReadonlySet<string>;
  /** By row; an unset cell is its default (`listed` inferred, `unlisted` none, `unnamed` none). */
  readonly admission: Readonly<Record<string, Partial<Record<"listed" | "unlisted" | "unnamed", Strength>>>>;
}

export interface Out {
  readonly strength: Strength;
  readonly basis: "addressed" | "followup" | "admission" | "bot";
}

export interface Gate {
  readonly of: (trigger: TriggerView, thread: ThreadView, tickets: ReadonlyArray<TicketView>, policy: PolicyView) => Out;
}
