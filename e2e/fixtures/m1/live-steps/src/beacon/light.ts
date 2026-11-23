// Scaffolded from blueprint/things/beacon/verbs/light.ts. Yours from now on.
// A handler with two slow steps: each asks the check's HTTP service, which answers only when the check lets it.
import { Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/beacon/light.handler.ts";
import { Beacon } from "../../blueprint/things/beacon/thing.ts";
import { BeaconDark } from "../../blueprint/things/beacon/errors.ts";

const ask = (origin: string, gate: string) => Effect.promise(() => fetch(`${origin}/gate/${gate}`).then((response) => response.text()));

/** Light a beacon once the slow service has answered, or refuse when it says dark. */
const light: Handler = ({ origin, mode }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    yield* steps.load(ask(origin, "load"));
    if (mode === "refuse") return yield* new BeaconDark({});
    const beacon = yield* Ids.of(Beacon.fields.id);
    yield* steps.record(ask(origin, "record").pipe(Effect.andThen(records.insert(Beacon, { id: beacon, label: "lit" }))));
    yield* move("lit");
    return { beacon };
  });

export default light;
