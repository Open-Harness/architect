// Scaffolded from blueprint/things/supplier/verbs/enable.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/supplier/enable.handler.ts";

/**
 * supplier.enable: Enable a disabled supplier again.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its supplier.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/supplier/verbs/enable.ts:
 *   supplier  supplier.id
 *
 * Answer, from blueprint/things/supplier/verbs/enable.ts:
 *   supplier  supplier.id
 *
 * Refusals:
 *   SupplierNotActive    exit 40   SU-900  the runtime's, when the supplier isn't in disabled, carrying state; from blueprint/things/supplier/machine.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't the owner of its supplier.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/supplier/verbs/enable.ts
 *
 * Idempotent by request, from blueprint/things/supplier/verbs/enable.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/supplier/verbs/enable.ts: p95 100ms.
 *
 * The supplier's machine, from blueprint/things/supplier/machine.ts (▶ marks this call):
 *     from       move     to        emits
 *     (creates)  create   active    SupplierCreated
 *     active     disable  disabled  SupplierDisabled
 *   ▶ disabled   enable   active    SupplierEnabled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its supplier.company;
 *   before it runs, it refuses SupplierNotActive unless the supplier is in disabled;
 *   before it runs, it hands in the supplier it read as subject, so this handler never reads it again;
 *   each step is its own span: supplier.enable.update;
 *   once it answers, it sets the supplier's state to active;
 *   once it answers, it writes SupplierEnabled: supplier from the answer;
 *   the call is the span supplier.enable, and its commit supplier.enable.commit.
 */
const enable: Handler = ({ supplier }, { steps, move }) =>
  Effect.gen(function* () {
    // Step update: database, span supplier.enable.update. The state is the whole change; the runtime refused a supplier
    // already active, and sets the new state once this answers.
    yield* steps.update(move());

    return { supplier };
  });

export default enable;
