import { Effect } from "effect";
import type { OwnedApi } from "./types.ts";
import { all, alive, runDir, stillTheSame } from "./internal/markers.ts";
import { freePort, start, stop } from "./internal/process.ts";

export { ProcessFailed } from "./types.ts";

export const Owned: OwnedApi = {
  freePort,
  start,
  leaks: (dir = runDir()) => all(dir).filter((marker) => alive(marker.pid) && stillTheSame(marker)),
  sweep: (dir = runDir()) =>
    Effect.gen(function* () {
      const found = all(dir).filter((marker) => alive(marker.pid) && stillTheSame(marker));
      for (const marker of found) yield* stop(marker, dir);
      return found;
    }),
};
