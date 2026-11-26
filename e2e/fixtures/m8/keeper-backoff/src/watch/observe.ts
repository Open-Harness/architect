// Scaffolded from blueprint/things/watch/verbs/observe.ts. Yours from now on.
import { Clock, DateTime, Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/watch/observe.handler.ts";
import { Watch } from "../../blueprint/things/watch/thing.ts";

const HOUR = 60 * 60 * 1000;

/** One more check: back off two hours after the first, four after the second, and park a day out after the third. */
const observe: Handler = ({ watch }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const found = yield* steps.load(records.find(Watch, watch));
    if (!found) return yield* Effect.die(new Error(`watch ${watch} was checked and then not found`));
    const checks = (found["checks"] as bigint) + 1n;
    const now = yield* Clock.currentTimeMillis;
    const parks = checks >= 3n;
    const nextCheckAt = DateTime.formatIso(DateTime.makeUnsafe(now + (parks ? 24 * HOUR : 2 ** Number(checks) * HOUR)));
    yield* steps.record(records.update(Watch, watch, { checks, nextCheckAt }));
    yield* move(parks ? "parked" : "watching");
    return { checks, nextCheckAt };
  });

export default observe;
