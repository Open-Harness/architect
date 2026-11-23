// The seats of an executor pool, as pure rules (GOAL17-executor-slots, section 2): who is next in line, and which seat is theirs. No store, no clock.
export const RESERVE = 255n;

/** Why an Assignment waits: a launch, a person's message, or an input (a CI result). */
export type Why = "launch" | "person" | "input";

/** One waiting Assignment, in the order the rows were made. */
export interface Waiting {
  readonly assignment: string;
  readonly why: Why;
}

export interface Slots {
  /** The next in line: every person's message, then every other, each oldest first. */
  readonly line: (waiting: ReadonlyArray<Waiting>) => ReadonlyArray<Waiting>;
  /** A seat for this one, or none: the pool first (the lowest free), the reserve only for a person. `held` is the seats of the running and closing Assignments. */
  readonly seatFor: (size: bigint, held: ReadonlySet<bigint>, why: Why) => bigint | undefined;
}
