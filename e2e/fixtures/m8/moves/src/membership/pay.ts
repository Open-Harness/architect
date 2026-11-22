// Scaffolded from blueprint/things/membership/verbs/pay.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/membership/pay.handler.ts";

/** Paid: the membership is active again. */
const pay: Handler = (_payload, { move }) =>
  Effect.gen(function* () {
    yield* move("active");
    return {};
  });

export default pay;
