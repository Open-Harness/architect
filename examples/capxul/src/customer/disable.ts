// Scaffolded from blueprint/things/customer/verbs/disable.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/customer/disable.handler.ts";

/**
 * customer.disable: Disable a customer: no payment from it can be submitted until it is enabled again.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its customer.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/customer/verbs/disable.ts:
 *   customer  customer.id
 *
 * Answer, from blueprint/things/customer/verbs/disable.ts:
 *   customer  customer.id
 *
 * Refusals:
 *   CustomerNotActive    exit 40   CU-900  the runtime's, when the customer isn't in active, carrying state; from blueprint/things/customer/machine.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't the owner of its customer.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/customer/verbs/disable.ts
 *
 * Idempotent by request, from blueprint/things/customer/verbs/disable.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/customer/verbs/disable.ts: p95 100ms.
 *
 * The customer's machine, from blueprint/things/customer/machine.ts (▶ marks this call):
 *     from       move     to        emits
 *     (creates)  create   active    CustomerCreated
 *   ▶ active     disable  disabled  CustomerDisabled
 *     disabled   enable   active    CustomerEnabled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its customer.company;
 *   before it runs, it refuses CustomerNotActive unless the customer is in active;
 *   before it runs, it hands in the customer it read as subject, so this handler never reads it again;
 *   each step is its own span: customer.disable.update;
 *   once it answers, it sets the customer's state to disabled;
 *   once it answers, it writes CustomerDisabled: customer from the answer;
 *   the call is the span customer.disable, and its commit customer.disable.commit.
 */
const disable: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step update: database, span customer.disable.update.
    yield* steps.update(Handlers.blank("update: the work this step does"));

    // The move disable, from active, to disabled.
    yield* move();

    return {
      customer: yield* Handlers.blank("customer, a customer.id"),
    };
  });

export default disable;
