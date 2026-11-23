// Scaffolded from blueprint/things/handle/verbs/resolve.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/handle/resolve.handler.ts";
import { oneHolderPerName } from "../../blueprint/things/handle/invariants.ts";

const { HandleNotFound } = Errors.declared;

/**
 * handle.resolve: Find the handle that holds a claimed name. A released or unclaimed name has none.
 *
 * Who may call, from blueprint/things/handle/verbs/resolve.ts:
 *   anyone
 *
 * Payload, from blueprint/things/handle/verbs/resolve.ts:
 *   name  handle.name
 *
 * Answer, from blueprint/things/handle/verbs/resolve.ts:
 *   handle  handle.id
 *
 * Refusals:
 *   HandleNotFound  exit 13  HN-003  yours to refuse below; from blueprint/things/handle/errors.ts
 *
 * Budget, from blueprint/things/handle/verbs/resolve.ts: p95 150ms.
 *
 * The handle's machine, from blueprint/things/handle/machine.ts (this call makes no move):
 *     from       move     to        emits
 *     (creates)  claim    claimed   HandleClaimed
 *     claimed    release  released  HandleReleased
 *
 * What the runtime does, so this handler doesn't:
 *   each step is its own span: handle.resolve.load;
 *   the call is the span handle.resolve, and its commit handle.resolve.commit.
 */
const resolve: Handler = ({ name }, { steps }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const held = yield* steps.load(records.findBy(oneHolderPerName, name));

    // HandleNotFound: exit 13, HN-003. A released or unclaimed name has no holder.
    if (!held) {
      yield* Effect.logInfo("no claimed handle holds this name");
      return yield* new HandleNotFound({});
    }

    return { handle: held["id"] as never };
  });

export default resolve;
