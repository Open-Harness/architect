// Scaffolded from blueprint/things/bridge-business/verbs/approve.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/bridge-business/approve.handler.ts";

/**
 * bridge-business.approve: Record that Bridge approved a company's KYB.
 *
 * Who may call, from blueprint/things/bridge-business/verbs/approve.ts:
 *   the system
 *
 * Payload, from blueprint/things/bridge-business/verbs/approve.ts:
 *   business  bridge-business.id
 *
 * Answer, from blueprint/things/bridge-business/verbs/approve.ts:
 *   business  bridge-business.id
 *
 * Refusals:
 *   KybAlreadyStarted         exit 41   KB-001  the runtime's: another bridge business holds this company (bridge-business.oneKybPerCompany); from blueprint/things/bridge-business/invariants.ts
 *   BridgeBusinessNotStarted  exit 40   KB-900  the runtime's, when the bridge-business isn't in started, carrying state; from blueprint/things/bridge-business/machine.ts
 *   BridgeBusinessNotFound    exit 4    KB-901  the runtime's, when no bridge-business has that id, carrying id; from blueprint/things/bridge-business/thing.ts
 *   NotAllowed                exit 3    AR-001  the runtime's, when the caller isn't the system; from blueprint/things/bridge-business/verbs/approve.ts
 *   IdempotencyConflict       exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/bridge-business/verbs/approve.ts
 *
 * Idempotent by request, from blueprint/things/bridge-business/verbs/approve.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/bridge-business/verbs/approve.ts: p95 150ms.
 *
 * The bridge-business's machine, from blueprint/things/bridge-business/machine.ts (▶ marks this call):
 *     from       move     to        emits
 *     (creates)  start    started   KybStarted
 *   ▶ started    approve  approved  KybApproved
 *     started    reject   rejected  KybRejected
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the system;
 *   before it runs, it refuses BridgeBusinessNotStarted unless the bridge-business is in started;
 *   before it runs, it hands in the bridge-business it read as subject, so this handler never reads it again;
 *   each step is its own span: bridge-business.approve.update;
 *   once it answers, it sets the bridge-business's state to approved;
 *   once it answers, it writes KybApproved: business from the answer;
 *   the call is the span bridge-business.approve, and its commit bridge-business.approve.commit.
 */
const approve: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step update: database, span bridge-business.approve.update.
    yield* steps.update(Handlers.blank("update: the work this step does"));

    // The move approve, from started, to approved.
    yield* move();

    return {
      business: yield* Handlers.blank("business, a bridge-business.id"),
    };
  });

export default approve;
