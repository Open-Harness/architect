// What the cut costs, made visible. Without a fee bump a transaction sent too cheap during a fee spike stays stuck, and everything behind it
// waits: this names each nonce pending past the deadline, with the row and how long it has been pending.
import type { RelayerHealth } from "../types.ts";
import type { Store } from "./store.ts";

export const STUCK_AFTER_MS = 600_000;

/** The open submissions older than the deadline at `now` (epoch milliseconds on the Clock), lowest nonce first. */
export const health = (store: Store, now: number): RelayerHealth => {
  const stuckAfterMs = store.config()?.stuckAfterMs ?? STUCK_AFTER_MS;
  const stuck = store.open().filter((row) => now - row.createdAt > stuckAfterMs).map((row) => ({ id: row.id, nonce: row.nonce, pendingMs: now - row.createdAt }));
  return { stuckAfterMs, stuck };
};
