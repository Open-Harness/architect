// Scaffolded from blueprint/things/handle/verbs/rename.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/handle/rename.handler.ts";
import { Handle } from "../../blueprint/things/handle/thing.ts";

/** Change a handle's name. Its step declares no `writes`, so the compiler cannot see that it may break a rule: the runtime does, loudly. */
const rename: Handler = ({ handle, name }, { steps }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    yield* steps.update(records.update(Handle, handle, { name }));
    return {};
  });

export default rename;
