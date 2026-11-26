// Scaffolded from blueprint/things/desk/verbs/expire.ts. Yours from now on.
import { Clock, DateTime, Effect } from "effect";
import type { Handler } from "../../generated/api/src/desk/expire.handler.ts";

/** The desk expires now, by the world's clock. */
const expire: Handler = (_payload, { move }) =>
  Effect.gen(function* () {
    const at = DateTime.formatIso(DateTime.makeUnsafe(yield* Clock.currentTimeMillis));
    yield* move("expired");
    return { at };
  });

export default expire;
