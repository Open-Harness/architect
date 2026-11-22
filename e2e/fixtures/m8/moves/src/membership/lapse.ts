// Scaffolded from blueprint/things/membership/verbs/lapse.ts. Yours from now on.
import { Clock, DateTime, Effect } from "effect";
import type { Handler } from "../../generated/api/src/membership/lapse.handler.ts";

/** The membership lapses now, by the world's clock. */
const lapse: Handler = (_payload, { move }) =>
  Effect.gen(function* () {
    const at = DateTime.formatIso(DateTime.makeUnsafe(yield* Clock.currentTimeMillis));
    yield* move("lapsed");
    return { at };
  });

export default lapse;
