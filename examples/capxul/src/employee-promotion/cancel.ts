// Scaffolded from blueprint/things/employee-promotion/verbs/cancel.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Employee } from "../../blueprint/things/employee/thing.ts";
import type { Handler } from "../../generated/api/src/employee-promotion/cancel.handler.ts";

/**
 * employee-promotion.cancel: Cancel a submitted promotion, putting back the job title it replaced.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its employeePromotion.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/employee-promotion/verbs/cancel.ts:
 *   employeePromotion  employee-promotion.id
 *
 * Answer, from blueprint/things/employee-promotion/verbs/cancel.ts:
 *   employeePromotion  employee-promotion.id
 *   employee           employee-promotion.employee
 *   designation        employee-promotion.currentDesignation
 *
 * Refusals:
 *   EmployeeAlreadyHired       exit 41   EM-001  the runtime's: another active employee holds this company and person (employee.onePlacePerPerson); from blueprint/things/employee/invariants.ts
 *   EmployeePromotionNotDraft  exit 40   PM-900  the runtime's, when the employee-promotion isn't in submitted, carrying state; from blueprint/things/employee-promotion/machine.ts
 *   NotAllowed                 exit 3    AR-001  the runtime's, when the caller isn't the owner of its employeePromotion.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict        exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/employee-promotion/verbs/cancel.ts
 *
 * Idempotent by request, from blueprint/things/employee-promotion/verbs/cancel.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/employee-promotion/verbs/cancel.ts: p95 150ms.
 *
 * The employee-promotion's machine, from blueprint/things/employee-promotion/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *     (creates)  create  draft      EmployeePromotionDrafted
 *     draft      submit  submitted  EmployeePromoted
 *   ▶ submitted  cancel  cancelled  EmployeePromotionCancelled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its employeePromotion.company;
 *   before it runs, it refuses EmployeePromotionNotDraft unless the employee-promotion is in submitted;
 *   before it runs, it hands in the employee-promotion it read as subject, so this handler never reads it again;
 *   each step is its own span: employee-promotion.cancel.update;
 *   once it answers, it sets the employee-promotion's state to cancelled;
 *   once it answers, it writes EmployeePromotionCancelled: employeePromotion, employee and designation from the answer;
 *   the call is the span employee-promotion.cancel, and its commit employee-promotion.cancel.commit.
 */
const cancel: Handler = ({ employeePromotion }, { steps, move, subject }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // The runtime read the promotion for its role and state checks and hands it in.
    if (!subject) return yield* Effect.die(new Error(`promotion ${employeePromotion} was checked and then not found`));
    const employee = subject["employee"] as string;
    const currentDesignation = subject["currentDesignation"] as string;

    // Step update: database, in the store employee-promotion, employee, span employee-promotion.cancel.update. The employee
    // gets back the designation it held when the promotion was drafted, whatever it holds now, as HRMS's
    // `update_employee_work_history(cancel=True)` writes `current` back without comparing (CX-employee-moves).
    yield* steps.update(records.update(Employee, employee, { designation: currentDesignation as never }));

    // The move cancel, from submitted, to cancelled.
    yield* move();

    return {
      employeePromotion,
      employee: employee as never,
      // EmployeePromotionCancelled needs designation, and only the answer can give it.
      designation: currentDesignation as never,
    };
  });

export default cancel;
