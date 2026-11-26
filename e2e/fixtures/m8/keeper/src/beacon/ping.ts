// Scaffolded from blueprint/things/beacon/verbs/ping.ts. Yours from now on.
import { Clock, DateTime, Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/beacon/ping.handler.ts";
import { Beacon } from "../../blueprint/things/beacon/thing.ts";

/** One more ping, counted, at the world's instant. */
const ping: Handler = ({ beacon }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const found = yield* steps.load(records.find(Beacon, beacon));
    if (!found) return yield* Effect.die(new Error(`beacon ${beacon} was checked and then not found`));
    const pings = (found["pings"] as bigint) + 1n;
    const at = DateTime.formatIso(DateTime.makeUnsafe(yield* Clock.currentTimeMillis));
    yield* steps.record(records.update(Beacon, beacon, { pings, lastPingAt: at }));
    yield* move("lit");
    return { pings, at };
  });

export default ping;
