// Scaffolded from blueprint/things/handle/verbs/release.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/handle/release.handler.ts";

/** Let a name go. The machine's check already passed. */
const release: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    yield* steps.update(move("released"));
    return {};
  });

export default release;
