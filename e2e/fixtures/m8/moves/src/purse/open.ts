// Scaffolded from blueprint/things/purse/verbs/open.ts. Yours from now on.
import { Clock, DateTime, Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/purse/open.handler.ts";
import { Purse } from "../../blueprint/things/purse/thing.ts";

/** Open a purse now, by the world's clock: its months count from here. */
const open: Handler = ({ limit }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const openedAt = DateTime.formatIso(DateTime.makeUnsafe(yield* Clock.currentTimeMillis));
    const purse = yield* Ids.of(Purse.fields.id);
    yield* steps.insert(records.insert(Purse, { id: purse, limit, spent: 0n, openedAt, period: 1n }));
    yield* move("active");
    return { purse };
  });

export default open;
