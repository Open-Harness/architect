// Scaffolded from blueprint/things/bridge-individual/verbs/start.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/bridge-individual/start.handler.ts";

/**
 * bridge-individual.start: Start your own KYC with Bridge: answers the form you fill in, and Bridge's terms.
 *
 * Who may call, from blueprint/things/bridge-individual/verbs/start.ts:
 *   anyone signed in
 *
 * Payload, from blueprint/things/bridge-individual/verbs/start.ts:
 *   fullName  bridge-individual.fullName
 *   email     bridge-individual.email
 *
 * Answer, from blueprint/things/bridge-individual/verbs/start.ts:
 *   individual  bridge-individual.id
 *   kycLink     bridge-individual.kycLink
 *   tosLink     bridge-individual.tosLink
 *
 * Refusals:
 *   KycAlreadyStarted    exit 41   KC-001  the runtime's: another bridge individual holds this person (bridge-individual.oneKycPerPerson); from blueprint/things/bridge-individual/invariants.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't anyone signed in; from blueprint/things/bridge-individual/verbs/start.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/bridge-individual/verbs/start.ts
 *
 * Idempotent by request, from blueprint/things/bridge-individual/verbs/start.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/bridge-individual/verbs/start.ts: p95 800ms.
 *
 * The bridge-individual's machine, from blueprint/things/bridge-individual/machine.ts (▶ marks this call):
 *     from       move     to        emits
 *   ▶ (creates)  start    started   KycStarted
 *     started    approve  approved  KycApproved
 *     started    reject   rejected  KycRejected
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is signed in;
 *   before it runs, it mints the bridge-individual's new id and hands it in as id;
 *   each step is its own span: bridge-individual.start.insert;
 *   once it answers, it sets the bridge-individual's state to started;
 *   once it answers, it writes KycStarted: individual from the answer, person from the bridge-individual as the call left it;
 *   the call is the span bridge-individual.start, and its commit bridge-individual.start.commit.
 */
const start: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step insert: database, span bridge-individual.start.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move start, to started.
    yield* move();

    return {
      // KycStarted needs individual, and only the answer can give it.
      individual: id,
      kycLink: yield* Handlers.blank("kycLink, a bridge-individual.kycLink"),
      tosLink: yield* Handlers.blank("tosLink, a bridge-individual.tosLink"),
    };
  });

export default start;
