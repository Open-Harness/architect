// Scaffolded from blueprint/things/handle/verbs/rename-two.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/handle/rename-two.handler.ts";
import { Handle } from "../../blueprint/things/handle/thing.ts";

/** Rename two handles in the order the caller names them. The names may move between them: the order the writes reach the store is the unit's to settle. */
const renameTwo: Handler = ({ first, second, firstTo, secondTo }, { steps }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    yield* steps.one(records.update(Handle, first, { name: firstTo }));
    yield* steps.two(records.update(Handle, second, { name: secondTo }));
    return {};
  });

export default renameTwo;
