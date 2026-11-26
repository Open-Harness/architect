// Scaffolded from blueprint/things/meter/verbs/jam.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/meter/jam.handler.ts";
import { Meter } from "../../blueprint/things/meter/thing.ts";

/** Mark the meter jammed. */
const jam: Handler = ({ meter }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    yield* steps.record(records.update(Meter, meter, { jammed: 1n }));
    yield* move("running");
    return {};
  });

export default jam;
