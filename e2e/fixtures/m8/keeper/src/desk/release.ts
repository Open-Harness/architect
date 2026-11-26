// Scaffolded from blueprint/things/desk/verbs/release.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/desk/release.handler.ts";

/** Release the desk. */
const release: Handler = (_payload, { move }) =>
  Effect.gen(function* () {
    yield* move("free");
    return {};
  });

export default release;
