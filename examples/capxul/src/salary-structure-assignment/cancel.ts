// Scaffolded from blueprint/things/salary-structure-assignment/verbs/cancel.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/salary-structure-assignment/cancel.handler.ts";

/**
 * salary-structure-assignment.cancel: Cancel a submitted assignment, so payroll no longer counts it.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its salaryStructureAssignment.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/salary-structure-assignment/verbs/cancel.ts:
 *   salaryStructureAssignment  salary-structure-assignment.id
 *
 * Answer, from blueprint/things/salary-structure-assignment/verbs/cancel.ts:
 *   salaryStructureAssignment  salary-structure-assignment.id
 *   salaryStructure            salary-structure-assignment.salaryStructure
 *
 * Refusals:
 *   SalaryStructureAssignmentNotDraft  exit 40   SA-900  the runtime's, when the salary-structure-assignment isn't in submitted, carrying state; from blueprint/things/salary-structure-assignment/machine.ts
 *   NotAllowed                         exit 3    AR-001  the runtime's, when the caller isn't the owner of its salaryStructureAssignment.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict                exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/salary-structure-assignment/verbs/cancel.ts
 *
 * Idempotent by request, from blueprint/things/salary-structure-assignment/verbs/cancel.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/salary-structure-assignment/verbs/cancel.ts: p95 150ms.
 *
 * The salary-structure-assignment's machine, from blueprint/things/salary-structure-assignment/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *     (creates)  create  draft      SalaryStructureAssigned
 *     draft      submit  submitted  SalaryStructureAssignmentSubmitted
 *   ▶ submitted  cancel  cancelled  SalaryStructureAssignmentCancelled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its salaryStructureAssignment.company;
 *   before it runs, it refuses SalaryStructureAssignmentNotDraft unless the salary-structure-assignment is in submitted;
 *   before it runs, it hands in the salary-structure-assignment it read as subject, so this handler never reads it again;
 *   each step is its own span: salary-structure-assignment.cancel.update;
 *   once it answers, it sets the salary-structure-assignment's state to cancelled;
 *   once it answers, it writes SalaryStructureAssignmentCancelled: salaryStructureAssignment from the answer;
 *   the call is the span salary-structure-assignment.cancel, and its commit salary-structure-assignment.cancel.commit.
 */
const cancel: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step update: database, span salary-structure-assignment.cancel.update.
    yield* steps.update(Handlers.blank("update: the work this step does"));

    // The move cancel, from submitted, to cancelled.
    yield* move();

    return {
      salaryStructureAssignment: yield* Handlers.blank("salaryStructureAssignment, a salary-structure-assignment.id"),
      salaryStructure: yield* Handlers.blank("salaryStructure, a salary-structure-assignment.salaryStructure"),
    };
  });

export default cancel;
