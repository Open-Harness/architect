// Scaffolded from blueprint/things/watch/verbs/start.ts. Yours from now on.
import { Clock, DateTime, Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/watch/start.handler.ts";
import { Watch } from "../../blueprint/things/watch/thing.ts";

const HOUR = 60 * 60 * 1000;

/** Start watching: the first check is an hour from now, by the world's clock. */
const start: Handler = ({ name }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const nextCheckAt = DateTime.formatIso(DateTime.makeUnsafe((yield* Clock.currentTimeMillis) + HOUR));
    const watch = yield* Ids.of(Watch.fields.id);
    yield* steps.insert(records.insert(Watch, { id: watch, name, nextCheckAt, checks: 0n }));
    yield* move("watching");
    return { watch, nextCheckAt };
  });

export default start;
