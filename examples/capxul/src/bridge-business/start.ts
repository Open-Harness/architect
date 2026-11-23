// Scaffolded from blueprint/things/bridge-business/verbs/start.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/bridge-business/start.handler.ts";

/**
 * bridge-business.start: Start a company's KYB with Bridge: answers the form the business fills in, and Bridge's terms.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/bridge-business/verbs/start.ts:
 *   company    bridge-business.company
 *   legalName  bridge-business.legalName
 *   email      bridge-business.email
 *
 * Answer, from blueprint/things/bridge-business/verbs/start.ts:
 *   business  bridge-business.id
 *   kybLink   bridge-business.kybLink
 *   tosLink   bridge-business.tosLink
 *
 * Refusals:
 *   KybAlreadyStarted    exit 41   KB-001  the runtime's: another bridge business holds this company (bridge-business.oneKybPerCompany); from blueprint/things/bridge-business/invariants.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/bridge-business/verbs/start.ts
 *
 * Idempotent by request, from blueprint/things/bridge-business/verbs/start.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/bridge-business/verbs/start.ts: p95 800ms.
 *
 * The bridge-business's machine, from blueprint/things/bridge-business/machine.ts (▶ marks this call):
 *     from       move   to       emits
 *   ▶ (creates)  start  started  KybStarted
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it mints the bridge-business's new id and hands it in as id;
 *   each step is its own span: bridge-business.start.insert;
 *   once it answers, it sets the bridge-business's state to started;
 *   once it answers, it writes KybStarted: business from the answer, company from the payload;
 *   the call is the span bridge-business.start, and its commit bridge-business.start.commit.
 */
const start: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step insert: database, span bridge-business.start.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move start, to started.
    yield* move();

    return {
      // KybStarted needs business, and only the answer can give it.
      business: id,
      kybLink: yield* Handlers.blank("kybLink, a bridge-business.kybLink"),
      tosLink: yield* Handlers.blank("tosLink, a bridge-business.tosLink"),
    };
  });

export default start;
