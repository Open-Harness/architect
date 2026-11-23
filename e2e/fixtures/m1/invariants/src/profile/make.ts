// Scaffolded from blueprint/things/profile/verbs/make.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/profile/make.handler.ts";
import { Profile } from "../../blueprint/things/profile/thing.ts";

/** Make a handle's page. A second page for the same handle breaks onePagePerHandle, which has no refusal: that is a defect naming the rule. */
const make: Handler = ({ handle }, { steps, move, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    yield* steps.save(records.insert(Profile, { id, handle }));
    yield* move("made");
    return { profile: id };
  });

export default make;
