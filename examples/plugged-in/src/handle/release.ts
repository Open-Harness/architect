// Scaffolded from blueprint/things/handle/verbs/release.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/handle/release.handler.ts";

/**
 * handle.release: Free your name and take its public page offline. Anyone may claim the name afterwards.
 *
 * Who may call, from blueprint/things/handle/roles.ts:
 *   the handleOwner of the handle: (handle, caller) => handle.owner === caller.person
 *
 * Payload, from blueprint/things/handle/verbs/release.ts:
 *   handle  handle.id
 *
 * Answer: nothing.
 *
 * Refusals:
 *   HandleNotClaimed  exit 11  HN-900  the runtime's, when the handle isn't in claimed, carrying state; from blueprint/things/handle/machine.ts
 *   NotAllowed        exit 3   AR-001  the runtime's, when the caller isn't the handleOwner of the handle; from blueprint/things/handle/roles.ts
 *
 * Budget, from blueprint/things/handle/verbs/release.ts: p95 150ms.
 *
 * The handle's machine, from blueprint/things/handle/machine.ts (▶ marks this call):
 *     from       move     to        emits
 *     (creates)  claim    claimed   HandleClaimed
 *   ▶ claimed    release  released  HandleReleased
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the handleOwner of the handle;
 *   before it runs, it refuses HandleNotClaimed unless the handle is in claimed;
 *   before it runs, it hands in the handle it read as subject, so this handler never reads it again;
 *   each step is its own span: handle.release.record;
 *   once it answers, it sets the handle's state to released;
 *   once it answers, it writes HandleReleased: handle from the payload, name from the handle as the call left it;
 *   the call is the span handle.release, and its commit handle.release.commit.
 */
const release: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // The move release is the whole change: the name is freed, the page and its links stay as they were.
    // Step record: database, span handle.release.record.
    yield* steps.record(move());

    return {};
  });

export default release;
