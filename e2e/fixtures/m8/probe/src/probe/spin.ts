// Scaffolded from blueprint/things/probe/verbs/spin.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/probe/spin.handler.ts";

/** Busy until the check opens its gate: work in flight that no clock move may run past. */
const spin: Handler = ({ origin }, { steps }) =>
  Effect.gen(function* () {
    yield* steps.wait(Effect.promise(() => fetch(`${origin}/gate/spin`).then((r) => r.text())));
    return { done: "opened" };
  });

export default spin;
