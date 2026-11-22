// Scaffolded from blueprint/things/membership/verbs/miss.ts. Yours from now on.
import { Clock, DateTime, Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/membership/miss.handler.ts";
import { Membership } from "../../blueprint/things/membership/thing.ts";

/** The payment is missed now, by the world's clock; the lapse counts from here. */
const miss: Handler = ({ membership }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const overdueAt = DateTime.formatIso(DateTime.makeUnsafe(yield* Clock.currentTimeMillis));
    yield* steps.record(records.update(Membership, membership, { overdueAt }));
    yield* move("overdue");
    return { overdueAt };
  });

export default miss;
