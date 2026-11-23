// Scaffolded from blueprint/things/locker/verbs/install.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/locker/install.handler.ts";
import { Locker } from "../../blueprint/things/locker/thing.ts";
import { sentinels } from "../sentinels.ts";

/** Put a locker in an organisation, holding the planted note and code. */
const install: Handler = ({ organization, label }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const locker = yield* Ids.of(Locker.fields.id);
    yield* steps.insert(records.insert(Locker, { id: locker, organization, label, note: sentinels.note, code: sentinels.code, seal: sentinels.seal }));
    yield* move("closed");
    return { locker };
  });

export default install;
