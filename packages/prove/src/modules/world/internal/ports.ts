import { randomInt } from "node:crypto";
import { createServer } from "node:net";
import { Effect } from "effect";
import { WorldFailed } from "../types.ts";

/** Listen on `port` (0 for the system's pick) at 127.0.0.1, then let go: the port, or what stopped the listen. */
const tryListen = (port: number) =>
  Effect.callback<number, WorldFailed>((resume) => {
    const server = createServer();
    server.once("error", (e) => resume(Effect.fail(new WorldFailed({ message: `no free port: ${e.message}` }))));
    server.listen(port, "127.0.0.1", () => {
      const got = (server.address() as { port: number }).port;
      server.close(() => resume(Effect.succeed(got)));
    });
  });

/** Below the range the system hands out to outgoing connections and to wrangler's own sockets (32768 up on Linux, 49152 up on macOS). */
const LOW = 20_000;
const SPAN = 10_000;
const TRIES = 20;

/**
 * A port that is free on 127.0.0.1 now, which is what `port: 0` means. It is picked at random below the system's own range,
 * where an outgoing connection or a worker's socket cannot take it in the seconds before the world binds it; the system's
 * pick is the last resort. A failed listen on the last resort fails the effect.
 */
export const anyPort = Effect.gen(function* () {
  for (let i = 0; i < TRIES; i++) {
    const found = yield* tryListen(LOW + randomInt(SPAN)).pipe(Effect.option);
    if (found._tag === "Some") return found.value;
  }
  return yield* tryListen(0);
});
