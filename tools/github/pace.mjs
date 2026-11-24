// Pacing for the sync's writes. GitHub's secondary rate limit refuses a burst of writes (a first board run is about a
// hundred creates and as many field writes), so each write is followed by a short pause, and a refusal waits and tries
// again. Rows are found again by their marker, so a run that stops anyway is mended by the next one.

/** Waits, blocking, for `ms` milliseconds. The sync is a script that runs one write at a time. */
export const pause = (ms) => {
  if (ms > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

export const PAUSE_CREATE_MS = 2000; // issues and comments are the writes GitHub limits hardest
export const PAUSE_WRITE_MS = 400;
export const PAUSE_PROJECT_MS = 150;

const isLimit = (e) => /secondary rate limit|rate limit|too quickly|abuse|HTTP 429|retry-after/i.test(`${e?.stderr ?? ""}${e?.message ?? ""}`);

/** Runs `call`; on a rate-limit refusal waits waitMs, then twice that, and so on, up to `tries` calls. Any other error is thrown at once. */
export const withRetry = (call, { sleep = pause, tries = 5, waitMs = 60_000 } = {}) => {
  for (let n = 1; ; n++) {
    try {
      return call();
    } catch (e) {
      if (!isLimit(e) || n >= tries) throw e;
      sleep(waitMs * n);
    }
  }
};
