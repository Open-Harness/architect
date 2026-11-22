// Scaffolded from blueprint/things/probe/verbs/nap.ts. Yours from now on.
import { Clock, Duration, Effect } from "effect";
import { Timers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/probe/nap.handler.ts";

/** A durable sleep through the world's Timers: it wakes when the world's clock reaches it, and not before. */
const nap: Handler = ({ seconds }, { steps }) =>
  Effect.gen(function* () {
    const timers = yield* Timers;
    const began = BigInt(yield* Clock.currentTimeMillis);
    yield* steps.sleep(timers.sleep("probe.nap", Duration.seconds(Number(seconds))));
    const woke = BigInt(yield* Clock.currentTimeMillis);
    return { began, woke };
  });

export default nap;
