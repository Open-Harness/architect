// Scaffolded from blueprint/things/membership/verbs/join.ts. Yours from now on.
import { Clock, DateTime, Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/membership/join.handler.ts";
import { Membership } from "../../blueprint/things/membership/thing.ts";

/** Join the club. The membership starts now, by the world's clock. */
const join: Handler = ({ name }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const startedAt = DateTime.formatIso(DateTime.makeUnsafe(yield* Clock.currentTimeMillis));
    const membership = yield* Ids.of(Membership.fields.id);
    yield* steps.insert(records.insert(Membership, { id: membership, name, startedAt, period: 1n, renewals: 0n }));
    yield* move("active");
    return { membership, startedAt };
  });

export default join;
