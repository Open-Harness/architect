// Scaffolded from blueprint/things/handle/verbs/claim.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/handle/claim.handler.ts";
import { Handle } from "../../blueprint/things/handle/thing.ts";
import { oneHolderPerName } from "../../blueprint/things/handle/invariants.ts";
import { HandleTaken } from "../../blueprint/things/handle/errors.ts";

/** Claim a name, unless someone holds it. Two claims at once: the store refuses the second commit, and its retry lands here as `held`. */
const claim: Handler = ({ name }, { steps, move, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const held = yield* steps.look(records.findBy(oneHolderPerName, name));
    if (held) return yield* new HandleTaken({});
    yield* steps.save(records.insert(Handle, { id, name }));
    yield* move("claimed");
    return { handle: id };
  });

export default claim;
