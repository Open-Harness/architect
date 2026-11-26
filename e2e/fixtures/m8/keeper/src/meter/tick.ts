// Scaffolded from blueprint/things/meter/verbs/tick.ts. Yours from now on.
import { Clock, DateTime, Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/meter/tick.handler.ts";
import { Meter } from "../../blueprint/things/meter/thing.ts";
import { MeterJammed } from "../../blueprint/things/meter/errors.ts";

/** One more reading, counted, at the world's instant; a jammed meter refuses and writes nothing. */
const tick: Handler = ({ meter }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const found = yield* steps.load(records.find(Meter, meter));
    if (!found) return yield* Effect.die(new Error(`meter ${meter} was checked and then not found`));
    if ((found["jammed"] as bigint) > 0n) {
      yield* Effect.logInfo(`meter ${meter} is jammed: no reading`);
      return yield* new MeterJammed({});
    }
    const ticks = (found["ticks"] as bigint) + 1n;
    const at = DateTime.formatIso(DateTime.makeUnsafe(yield* Clock.currentTimeMillis));
    yield* steps.record(records.update(Meter, meter, { ticks }));
    yield* move("running");
    return { ticks, at };
  });

export default tick;
