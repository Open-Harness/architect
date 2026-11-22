// Scaffolded from blueprint/things/probe/verbs/read.ts. Yours from now on.
import { Clock, Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/probe/read.handler.ts";
import { Probe } from "../../blueprint/things/probe/thing.ts";

/** The server's clock, passed to the database as a parameter, and read back: never the database's own now(). */
const read: Handler = (_payload, { steps }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const clock = BigInt(yield* Clock.currentTimeMillis);
    const probe = yield* Ids.of(Probe.fields.id);
    yield* steps.store(records.insert(Probe, { id: probe, clock, stored: clock }));
    const found = yield* steps.load(records.find(Probe, probe));
    return { probe, clock, stored: found?.["stored"] as bigint };
  });

export default read;
