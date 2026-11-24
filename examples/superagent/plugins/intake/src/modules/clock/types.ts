/** What the clock reads of a superagent: whether it is paused, since when, and how long it has been paused in all (GOAL17-pause). */
export interface PauseView {
  readonly state: string;
  readonly pausedAt: bigint | undefined;
  readonly pausedFor: bigint;
}
