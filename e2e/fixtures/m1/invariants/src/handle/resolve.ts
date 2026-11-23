// Scaffolded from blueprint/things/handle/verbs/resolve.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/handle/resolve.handler.ts";
import { oneHolderPerName } from "../../blueprint/things/handle/invariants.ts";
import { HandleNotFound } from "../../blueprint/things/handle/errors.ts";

/** Find the handle that holds a name: the one claimed holder, by the rule's own scope. */
const resolve: Handler = ({ name }, { steps }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const held = yield* steps.look(records.findBy(oneHolderPerName, name));
    if (held === undefined) return yield* new HandleNotFound({});
    return { handle: held.id };
  });

export default resolve;
