// Scaffolded from blueprint/things/meter/verbs/start.ts. Yours from now on.
import { Clock, DateTime, Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/meter/start.handler.ts";
import { Meter } from "../../blueprint/things/meter/thing.ts";

/** Start the meter now, by the world's clock. */
const start: Handler = ({ name }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const startedAt = DateTime.formatIso(DateTime.makeUnsafe(yield* Clock.currentTimeMillis));
    const meter = yield* Ids.of(Meter.fields.id);
    yield* steps.insert(records.insert(Meter, { id: meter, name, startedAt, jammed: 0n, ticks: 0n }));
    yield* move("running");
    return { meter, startedAt };
  });

export default start;
