// Scaffolded from blueprint/things/settings/verbs/save.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/settings/save.handler.ts";

const { StaleRevision } = Errors.declared;

/**
 * settings.save: Save a new version of the settings. A save made from an older version is refused, with the current one. A main agent may only propose it.
 *
 * Who may call, from blueprint/things/settings/verbs/save.ts:
 *   anyone signed in
 *
 * Payload, from blueprint/things/settings/verbs/save.ts:
 *   base       uint
 *   variables  settings.variables
 *   blocked    settings.blocked
 *
 * Answer, from blueprint/things/settings/verbs/save.ts:
 *   settings  settings.id
 *   revision  settings.revision
 *
 * Refusals:
 *   StaleRevision  exit 62  SU-002  yours to refuse below, carrying current; from @orthograph/superagent/blueprint/things/superagent/errors.js
 *   NotAllowed     exit 3   AR-001  the runtime's, when the caller isn't anyone signed in; from blueprint/things/settings/verbs/save.ts
 *
 * The settings's machine, from blueprint/things/settings/machine.ts (▶ marks this call):
 *     from       move  to       emits
 *   ▶ (creates)  save  current  SettingsSaved
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is signed in;
 *   before it runs, it mints the settings's new id and hands it in as id;
 *   once it answers, it sets the settings's state to current;
 *   once it answers, it writes SettingsSaved: settings and revision from the answer;
 *   the call is the span settings.save, and its commit settings.save.commit.
 */
const save: Handler = (_payload, { move, id }) =>
  Effect.gen(function* () {
    // StaleRevision: exit 62, SU-002.
    if (yield* Handlers.blank<boolean>("refuse StaleRevision when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why StaleRevision was refused"));
      return yield* new StaleRevision({
        current: yield* Handlers.blank("StaleRevision.current, an uint"),
      });
    }

    // The move save, to current.
    yield* move();

    return {
      // SettingsSaved needs settings, and only the answer can give it.
      settings: id,
      revision: yield* Handlers.blank("revision, a settings.revision"),
    };
  });

export default save;
