// Scaffolded from blueprint/things/profile/verbs/get.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/profile/get.handler.ts";
import { onePagePerHandle } from "../../blueprint/things/profile/invariants.ts";
import { ProfileNotFound } from "../../blueprint/things/profile/errors.ts";

/** Find a handle's page by the rule that makes it one. */
const get: Handler = ({ handle }, { steps }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const page = yield* steps.look(records.findBy(onePagePerHandle, handle));
    if (page === undefined) return yield* new ProfileNotFound({});
    return { profile: page.id };
  });

export default get;
