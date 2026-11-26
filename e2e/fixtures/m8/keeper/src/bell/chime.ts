// Scaffolded from blueprint/things/bell/verbs/chime.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/bell/chime.handler.ts";
import { Bell } from "../../blueprint/things/bell/thing.ts";

/** One more chime, counted; `setAt` is left as it was. */
const chime: Handler = ({ bell }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const found = yield* steps.load(records.find(Bell, bell));
    if (!found) return yield* Effect.die(new Error(`bell ${bell} was checked and then not found`));
    const chimes = (found["chimes"] as bigint) + 1n;
    yield* steps.record(records.update(Bell, bell, { chimes }));
    yield* move("ringing");
    return { chimes };
  });

export default chime;
