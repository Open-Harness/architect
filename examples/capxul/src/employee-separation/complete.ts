// Scaffolded from blueprint/things/employee-separation/verbs/complete.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/employee-separation/complete.handler.ts";

/**
 * employee-separation.complete: Mark a separation completed. The employee is relieved by its own call.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its employeeSeparation.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/employee-separation/verbs/complete.ts:
 *   employeeSeparation  employee-separation.id
 *
 * Answer, from blueprint/things/employee-separation/verbs/complete.ts:
 *   employeeSeparation  employee-separation.id
 *
 * Refusals:
 *   EmployeeSeparationNotPending  exit 40   SP-900  the runtime's, when the employee-separation isn't in pending or inProcess, carrying state; from blueprint/things/employee-separation/machine.ts
 *   NotAllowed                    exit 3    AR-001  the runtime's, when the caller isn't the owner of its employeeSeparation.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict           exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/employee-separation/verbs/complete.ts
 *
 * Idempotent by request, from blueprint/things/employee-separation/verbs/complete.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/employee-separation/verbs/complete.ts: p95 150ms.
 *
 * The employee-separation's machine, from blueprint/things/employee-separation/machine.ts (▶ marks this call):
 *     from       move      to         emits
 *     (creates)  create    pending    EmployeeSeparationStarted
 *     pending    begin     inProcess  EmployeeSeparationBegun
 *   ▶ pending    complete  completed  EmployeeSeparationCompleted
 *   ▶ inProcess  complete  completed  EmployeeSeparationCompleted
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its employeeSeparation.company;
 *   before it runs, it refuses EmployeeSeparationNotPending unless the employee-separation is in pending or inProcess;
 *   before it runs, it hands in the employee-separation it read as subject, so this handler never reads it again;
 *   each step is its own span: employee-separation.complete.update;
 *   once it answers, it sets the employee-separation's state to completed;
 *   once it answers, it writes EmployeeSeparationCompleted: employeeSeparation from the answer;
 *   the call is the span employee-separation.complete, and its commit employee-separation.complete.commit.
 */
const complete: Handler = ({ employeeSeparation }, { steps, move }) =>
  Effect.gen(function* () {
    // Step update: database, span employee-separation.complete.update. No field changes, only the state, which the
    // runtime sets once this answers. It doesn't relieve the employee: `employee.relieve` stays its own call
    // (CX-employee-moves).
    yield* steps.update(Effect.void);

    // The move complete, from pending or inProcess, to completed.
    yield* move();

    return { employeeSeparation };
  });

export default complete;
