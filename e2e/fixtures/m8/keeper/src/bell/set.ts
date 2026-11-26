// Scaffolded from blueprint/things/bell/verbs/set.ts. Yours from now on.
import { Clock, DateTime, Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/bell/set.handler.ts";
import { Bell } from "../../blueprint/things/bell/thing.ts";

/** Set the bell now, by the world's clock. */
const set: Handler = ({ name }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const setAt = DateTime.formatIso(DateTime.makeUnsafe(yield* Clock.currentTimeMillis));
    const bell = yield* Ids.of(Bell.fields.id);
    yield* steps.insert(records.insert(Bell, { id: bell, name, setAt, chimes: 0n }));
    yield* move("ringing");
    return { bell, setAt };
  });

export default set;
