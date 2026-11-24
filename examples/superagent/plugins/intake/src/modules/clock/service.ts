import type { PauseView } from "./types.ts";

/**
 * The superagent's active clock (GOAL17-pause): the wall clock less every moment it spent paused, so a pause moves an eval's deadline
 * later by its length. While it is paused the active clock stands still at the moment the pause began.
 */
export const activeClock = (superagent: PauseView, now: bigint): bigint =>
  (superagent.state === "paused" && superagent.pausedAt !== undefined ? superagent.pausedAt : now) - superagent.pausedFor;
