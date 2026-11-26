// Scaffolded from blueprint/things/bridge-individual/verbs/reject.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/bridge-individual/reject.handler.ts";

/**
 * bridge-individual.reject: Record that Bridge turned down a person's KYC, and why.
 *
 * Who may call, from blueprint/things/bridge-individual/verbs/reject.ts:
 *   the system
 *
 * Payload, from blueprint/things/bridge-individual/verbs/reject.ts:
 *   individual  bridge-individual.id
 *   reason      RejectionReason
 *
 * Answer, from blueprint/things/bridge-individual/verbs/reject.ts:
 *   individual  bridge-individual.id
 *
 * Refusals:
 *   KycAlreadyStarted           exit 41   KC-001  the runtime's: another bridge individual holds this person (bridge-individual.oneKycPerPerson); from blueprint/things/bridge-individual/invariants.ts
 *   BridgeIndividualNotStarted  exit 40   KC-900  the runtime's, when the bridge-individual isn't in started, carrying state; from blueprint/things/bridge-individual/machine.ts
 *   BridgeIndividualNotFound    exit 4    KC-901  the runtime's, when no bridge-individual has that id, carrying id; from blueprint/things/bridge-individual/thing.ts
 *   NotAllowed                  exit 3    AR-001  the runtime's, when the caller isn't the system; from blueprint/things/bridge-individual/verbs/reject.ts
 *   IdempotencyConflict         exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/bridge-individual/verbs/reject.ts
 *
 * Idempotent by request, from blueprint/things/bridge-individual/verbs/reject.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/bridge-individual/verbs/reject.ts: p95 150ms.
 *
 * The bridge-individual's machine, from blueprint/things/bridge-individual/machine.ts (▶ marks this call):
 *     from       move     to        emits
 *     (creates)  start    started   KycStarted
 *     started    approve  approved  KycApproved
 *   ▶ started    reject   rejected  KycRejected
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the system;
 *   before it runs, it refuses BridgeIndividualNotStarted unless the bridge-individual is in started;
 *   before it runs, it hands in the bridge-individual it read as subject, so this handler never reads it again;
 *   each step is its own span: bridge-individual.reject.update;
 *   once it answers, it sets the bridge-individual's state to rejected;
 *   once it answers, it writes KycRejected: individual from the answer, reason from the payload;
 *   the call is the span bridge-individual.reject, and its commit bridge-individual.reject.commit.
 */
const reject: Handler = ({ individual }, { steps, move }) =>
  Effect.gen(function* () {
    // Step update: database, span bridge-individual.reject.update. Bridge's decision changes the state and nothing else; the
    // reason travels in the event alone.
    // The move reject, from started, to rejected.
    yield* steps.update(move());

    return { individual };
  });

export default reject;
