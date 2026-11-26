// Scaffolded from blueprint/things/watch/verbs/hush.ts. Yours from now on.
// Clearing an optional field this way is what snag #1205 asks the runtime to allow: today the type refuses it and the server dies.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/watch/hush.handler.ts";
import { Watch } from "../../blueprint/things/watch/thing.ts";

/** Clear the next check: the watch stays watching, and nothing is due. */
const hush: Handler = ({ watch }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    yield* steps.record(records.update(Watch, watch, { nextCheckAt: undefined }));
    yield* move("watching");
    return {};
  });

export default hush;
