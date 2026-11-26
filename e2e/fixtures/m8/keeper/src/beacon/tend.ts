// Scaffolded from blueprint/things/beacon/verbs/tend.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/beacon/tend.handler.ts";

/** Tend the beacon: it stays lit. */
const tend: Handler = (_payload, { move }) =>
  Effect.gen(function* () {
    yield* move("lit");
    return {};
  });

export default tend;
