// Scaffolded from blueprint/things/employee-separation/verbs/begin.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/employee-separation/begin.handler.ts";

/**
 * employee-separation.begin: Mark a separation in process.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its employeeSeparation.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/employee-separation/verbs/begin.ts:
 *   employeeSeparation  employee-separation.id
 *
 * Answer, from blueprint/things/employee-separation/verbs/begin.ts:
 *   employeeSeparation  employee-separation.id
 *
 * Refusals:
 *   SeparationAlreadyOpen         exit 42   SP-002  the runtime's: another pending or inProcess employee separation holds this employee (employee-separation.oneOpenSeparationPerEmployee); from blueprint/things/employee-separation/invariants.ts
 *   EmployeeSeparationNotPending  exit 40   SP-900  the runtime's, when the employee-separation isn't in pending, carrying state; from blueprint/things/employee-separation/machine.ts
 *   NotAllowed                    exit 3    AR-001  the runtime's, when the caller isn't the owner of its employeeSeparation.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict           exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/employee-separation/verbs/begin.ts
 *
 * Idempotent by request, from blueprint/things/employee-separation/verbs/begin.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/employee-separation/verbs/begin.ts: p95 150ms.
 *
 * The employee-separation's machine, from blueprint/things/employee-separation/machine.ts (▶ marks this call):
 *     from       move      to         emits
 *     (creates)  create    pending    EmployeeSeparationStarted
 *   ▶ pending    begin     inProcess  EmployeeSeparationBegun
 *     pending    complete  completed  EmployeeSeparationCompleted
 *     inProcess  complete  completed  EmployeeSeparationCompleted
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its employeeSeparation.company;
 *   before it runs, it refuses EmployeeSeparationNotPending unless the employee-separation is in pending;
 *   before it runs, it hands in the employee-separation it read as subject, so this handler never reads it again;
 *   each step is its own span: employee-separation.begin.update;
 *   once it answers, it sets the employee-separation's state to inProcess;
 *   once it answers, it writes EmployeeSeparationBegun: employeeSeparation from the answer;
 *   the call is the span employee-separation.begin, and its commit employee-separation.begin.commit.
 */
const begin: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step update: database, span employee-separation.begin.update.
    yield* steps.update(Handlers.blank("update: the work this step does"));

    // The move begin, from pending, to inProcess.
    yield* move();

    return {
      employeeSeparation: yield* Handlers.blank("employeeSeparation, an employee-separation.id"),
    };
  });

export default begin;
