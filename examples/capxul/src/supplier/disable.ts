// Scaffolded from blueprint/things/supplier/verbs/disable.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/supplier/disable.handler.ts";

/**
 * supplier.disable: Disable a supplier: no payment to it can be submitted until it is enabled again.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its supplier.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/supplier/verbs/disable.ts:
 *   supplier  supplier.id
 *
 * Answer, from blueprint/things/supplier/verbs/disable.ts:
 *   supplier  supplier.id
 *
 * Refusals:
 *   SupplierNotActive    exit 40   SU-900  the runtime's, when the supplier isn't in active, carrying state; from blueprint/things/supplier/machine.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't the owner of its supplier.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/supplier/verbs/disable.ts
 *
 * Idempotent by request, from blueprint/things/supplier/verbs/disable.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/supplier/verbs/disable.ts: p95 100ms.
 *
 * The supplier's machine, from blueprint/things/supplier/machine.ts (▶ marks this call):
 *     from       move     to        emits
 *     (creates)  create   active    SupplierCreated
 *   ▶ active     disable  disabled  SupplierDisabled
 *     disabled   enable   active    SupplierEnabled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its supplier.company;
 *   before it runs, it refuses SupplierNotActive unless the supplier is in active;
 *   before it runs, it hands in the supplier it read as subject, so this handler never reads it again;
 *   each step is its own span: supplier.disable.update;
 *   once it answers, it sets the supplier's state to disabled;
 *   once it answers, it writes SupplierDisabled: supplier from the answer;
 *   the call is the span supplier.disable, and its commit supplier.disable.commit.
 */
const disable: Handler = ({ supplier }, { steps, move }) =>
  Effect.gen(function* () {
    // Step update: database, span supplier.disable.update. The state is the whole change; the runtime refused a supplier
    // already disabled, and sets the new state once this answers.
    yield* steps.update(move());

    return { supplier };
  });

export default disable;
