// Scaffolded from blueprint/things/desk/verbs/hold.ts. Yours from now on.
import { Clock, DateTime, Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/desk/hold.handler.ts";
import { Desk } from "../../blueprint/things/desk/thing.ts";

/** Hold a desk now, by the world's clock. */
const hold: Handler = ({ name }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const heldAt = DateTime.formatIso(DateTime.makeUnsafe(yield* Clock.currentTimeMillis));
    const desk = yield* Ids.of(Desk.fields.id);
    yield* steps.insert(records.insert(Desk, { id: desk, name, heldAt }));
    yield* move("held");
    return { desk, heldAt };
  });

export default hold;
