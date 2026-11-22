// Scaffolded from blueprint/things/membership/verbs/renew.ts. Yours from now on.
import { Clock, DateTime, Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/membership/renew.handler.ts";
import { Membership } from "../../blueprint/things/membership/thing.ts";

/** Renew a membership for one more month: one more period, counted. */
const renew: Handler = ({ membership }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const found = yield* steps.load(records.find(Membership, membership));
    if (!found) return yield* Effect.die(new Error(`membership ${membership} was checked and then not found`));
    const period = (found["period"] as bigint) + 1n;
    const at = DateTime.formatIso(DateTime.makeUnsafe(yield* Clock.currentTimeMillis));
    yield* steps.record(records.update(Membership, membership, { period, renewals: (found["renewals"] as bigint) + 1n }));
    yield* move("active");
    return { period, at };
  });

export default renew;
