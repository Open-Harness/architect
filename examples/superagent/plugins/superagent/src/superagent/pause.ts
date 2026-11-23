import { Clock, Effect } from "effect";
import { Records, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/superagent/verbs/pause.ts";
import { Superagent } from "../../blueprint/things/superagent/thing.ts";

/**
 * The one switch (GOAL17-pause): held work waits where it waits while the superagent is paused. The state it was in and the moment are kept
 * on the superagent, so a resume goes back to the one and says how long it was away. The machine refuses a pause of one that is paused or retired.
 */
const pause: Handler<typeof declaration, Records> = ({ superagent }, { subject, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const from = subject?.["state"] === "live" ? "live" : "observing";
    const at = BigInt(yield* Clock.currentTimeMillis);
    yield* records.update(Superagent, superagent, { pausedFrom: from, pausedAt: at });
    yield* move();
    return { from, at };
  });

export default pause;
