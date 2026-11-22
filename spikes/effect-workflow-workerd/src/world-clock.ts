// The world's instant as Effect's `Clock`, for the workflow's own code (its activities). One world per isolate in this
// spike, so a module variable holds the last instant read from the World object; every entry refreshes it first.
// (K23 section 6 and spikes/world-time-in-worker show the per-request lookup a real build needs.) Throwaway.
import type { Clock } from "effect/Clock";
import { Effect } from "effect";

let instant: number | undefined;

export const setInstant = (t: number) => {
  instant = t;
};

const millis = () => {
  if (instant === undefined) throw new Error("world clock read before the world's instant was loaded");
  return instant;
};

export const worldClock: Clock = {
  currentTimeMillisUnsafe: millis,
  currentTimeMillis: Effect.sync(millis),
  currentTimeNanosUnsafe: () => BigInt(millis()) * 1_000_000n,
  currentTimeNanos: Effect.sync(() => BigInt(millis()) * 1_000_000n),
  monotonicTimeNanosUnsafe: () => BigInt(millis()) * 1_000_000n,
  monotonicTimeNanos: Effect.sync(() => BigInt(millis()) * 1_000_000n),
  // A sleep on this clock never fires by itself: the world's timer table is the only way to wait on world time.
  sleep: () => Effect.die("raw sleep on the world clock: wait through Timers"),
} as unknown as Clock;
