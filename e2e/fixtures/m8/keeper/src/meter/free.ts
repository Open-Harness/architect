// Scaffolded from blueprint/things/meter/verbs/free.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/meter/free.handler.ts";
import { Meter } from "../../blueprint/things/meter/thing.ts";

/** Mark the meter free. */
const free: Handler = ({ meter }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    yield* steps.record(records.update(Meter, meter, { jammed: 0n }));
    yield* move("running");
    return {};
  });

export default free;
