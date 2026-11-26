// Scaffolded from blueprint/things/watch/verbs/snooze.ts. Yours from now on.
import { Clock, DateTime, Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/watch/snooze.handler.ts";
import { Watch } from "../../blueprint/things/watch/thing.ts";

const FORTY_MINUTES = 40 * 60 * 1000;

/** The next check is forty minutes from now, by the world's clock. */
const snooze: Handler = ({ watch }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const nextCheckAt = DateTime.formatIso(DateTime.makeUnsafe((yield* Clock.currentTimeMillis) + FORTY_MINUTES));
    yield* steps.record(records.update(Watch, watch, { nextCheckAt }));
    yield* move("watching");
    return { nextCheckAt };
  });

export default snooze;
