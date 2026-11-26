# src/handle/claim.ts
// Scaffolded from blueprint/things/handle/verbs/claim.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/handle/claim.handler.ts";

/**
 * handle.claim: Claim a free name and make it the address of your public page, with its profile.
 *
 * Who may call, from blueprint/things/handle/verbs/claim.ts:
 *   anyone signed in
 *
 * Payload, from blueprint/things/handle/verbs/claim.ts:
 *   name  handle.name
 *
 * Answer, from blueprint/things/handle/verbs/claim.ts:
 *   handle  handle.id
 *
 * Refusals:
 *   HandleTaken          exit 10   HN-001  the runtime's: another claimed handle holds this name (handle.oneHolderPerName); from blueprint/things/handle/invariants.ts
 *   HandleAlreadyOwned   exit 12   HN-002  the runtime's: you already hold a name (handle.oneNamePerPerson); from blueprint/things/handle/invariants.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't anyone signed in; from blueprint/things/handle/verbs/claim.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/handle/verbs/claim.ts
 *
 * Idempotent by request, from blueprint/things/handle/verbs/claim.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/handle/verbs/claim.ts: p95 150ms.
 *
 * The handle's machine, from blueprint/things/handle/machine.ts (▶ marks this call):
 *     from       move     to        emits
 *   ▶ (creates)  claim    claimed   HandleClaimed
 *     claimed    release  released  HandleReleased
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is signed in;
 *   before it runs, it mints the handle's new id and hands it in as id;
 *   each step is its own span: handle.claim.record;
 *   once it answers, it sets the handle's state to claimed;
 *   once it answers, it writes HandleClaimed: handle from the answer, name from the payload;
 *   the call is the span handle.claim, and its commit handle.claim.commit.
 */
const claim: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step record: database, in the store profile, span handle.claim.record.
    yield* steps.record(Handlers.blank("record: the work this step does"));

    // The move claim, to claimed.
    yield* move();

    return {
      // HandleClaimed needs handle, and only the answer can give it.
      handle: id,
    };
  });

export default claim;
