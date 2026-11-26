// Scaffolded from blueprint/things/beacon/verbs/douse.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/beacon/douse.handler.ts";

/** Douse the beacon. */
const douse: Handler = (_payload, { move }) =>
  Effect.gen(function* () {
    yield* move("dark");
    return {};
  });

export default douse;
