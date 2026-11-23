// Scaffolded from blueprint/things/superagent/verbs/reap.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/superagent/reap.handler.ts";

/**
 * superagent.reap: Close the running Assignments whose executor is idle, so their seats come back once the Agent has said it closed.
 *
 * Who may call, from blueprint/things/superagent/verbs/reap.ts:
 *   the system
 *
 * Payload, from blueprint/things/superagent/verbs/reap.ts:
 *   superagent  superagent.id
 *
 * Answer, from blueprint/things/superagent/verbs/reap.ts:
 *   reaped  uint
 *
 * Refusals:
 *   SuperagentNotFound  exit 4  SU-901  the runtime's, when no superagent has that id, carrying id; from @orthograph/superagent/blueprint/things/superagent/thing.js
 *   NotAllowed          exit 3  AR-001  the runtime's, when the caller isn't the system; from blueprint/things/superagent/verbs/reap.ts
 *
 * The superagent's machine, from @orthograph/superagent/blueprint/things/superagent/machine.js (this call makes no move):
 *     from       move    to         emits
 *     (creates)  create  observing  SuperagentCreated
 *     observing  goLive  live       SuperagentWentLive
 *     observing  pause   paused     SuperagentPaused
 *     live       pause   paused     SuperagentPaused
 *     paused     resume  observing  SuperagentResumed
 *     paused     resume  live       SuperagentResumed
 *     observing  retire  retired    SuperagentRetired
 *     live       retire  retired    SuperagentRetired
 *     paused     retire  retired    SuperagentRetired
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the system;
 *   before it runs, it hands in the superagent it read as subject, so this handler never reads it again;
 *   the call is the span superagent.reap, and its commit superagent.reap.commit.
 */
const reap: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    return {
      reaped: yield* Handlers.blank("reaped, an uint"),
    };
  });

export default reap;
