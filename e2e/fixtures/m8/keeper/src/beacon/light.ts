// Scaffolded from blueprint/things/beacon/verbs/light.ts. Yours from now on.
import { Clock, DateTime, Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/beacon/light.handler.ts";
import { Beacon } from "../../blueprint/things/beacon/thing.ts";

/** Light the beacon now, by the world's clock. */
const light: Handler = ({ name }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const litAt = DateTime.formatIso(DateTime.makeUnsafe(yield* Clock.currentTimeMillis));
    const beacon = yield* Ids.of(Beacon.fields.id);
    yield* steps.insert(records.insert(Beacon, { id: beacon, name, litAt, lastPingAt: litAt, pings: 0n }));
    yield* move("lit");
    return { beacon, litAt };
  });

export default light;
