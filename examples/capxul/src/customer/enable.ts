// Scaffolded from blueprint/things/customer/verbs/enable.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/customer/enable.handler.ts";

/**
 * customer.enable: Enable a disabled customer again.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its customer.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/customer/verbs/enable.ts:
 *   customer  customer.id
 *
 * Answer, from blueprint/things/customer/verbs/enable.ts:
 *   customer  customer.id
 *
 * Refusals:
 *   CustomerNotActive    exit 40   CU-900  the runtime's, when the customer isn't in disabled, carrying state; from blueprint/things/customer/machine.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't the owner of its customer.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/customer/verbs/enable.ts
 *
 * Idempotent by request, from blueprint/things/customer/verbs/enable.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/customer/verbs/enable.ts: p95 100ms.
 *
 * The customer's machine, from blueprint/things/customer/machine.ts (▶ marks this call):
 *     from       move     to        emits
 *     (creates)  create   active    CustomerCreated
 *     active     disable  disabled  CustomerDisabled
 *   ▶ disabled   enable   active    CustomerEnabled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its customer.company;
 *   before it runs, it refuses CustomerNotActive unless the customer is in disabled;
 *   before it runs, it hands in the customer it read as subject, so this handler never reads it again;
 *   each step is its own span: customer.enable.update;
 *   once it answers, it sets the customer's state to active;
 *   once it answers, it writes CustomerEnabled: customer from the answer;
 *   the call is the span customer.enable, and its commit customer.enable.commit.
 */
const enable: Handler = ({ customer }, { steps, move }) =>
  Effect.gen(function* () {
    // Step update: database, span customer.enable.update. The state is the whole change; the runtime refused a customer
    // already active, and sets the new state once this answers.
    yield* steps.update(move());

    return { customer };
  });

export default enable;
