// Scaffolded from blueprint/things/employee-promotion/verbs/submit.ts. Yours from now on.
import { Clock, Effect } from "effect";
import { Days } from "orthograph";
import { Records } from "@orthograph/language-effect";
import { Employee } from "../../blueprint/things/employee/thing.ts";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/employee-promotion/submit.handler.ts";

const { PromotionNotYetDue } = Errors.declared;

const DAY_MS = 86_400_000;

/**
 * employee-promotion.submit: Submit a promotion on or after its day, giving the employee the new job title.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its employeePromotion.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/employee-promotion/verbs/submit.ts:
 *   employeePromotion  employee-promotion.id
 *
 * Answer, from blueprint/things/employee-promotion/verbs/submit.ts:
 *   employeePromotion  employee-promotion.id
 *   employee           employee-promotion.employee
 *   designation        employee-promotion.newDesignation
 *
 * Refusals:
 *   PromotionNotYetDue         exit 45   PM-005  yours to refuse below, carrying promotionDate; from blueprint/things/employee-promotion/errors.ts
 *   EmployeeAlreadyHired       exit 41   EM-001  the runtime's: another active employee holds this company and person (employee.onePlacePerPerson); from blueprint/things/employee/invariants.ts
 *   EmployeePromotionNotDraft  exit 40   PM-900  the runtime's, when the employee-promotion isn't in draft, carrying state; from blueprint/things/employee-promotion/machine.ts
 *   NotAllowed                 exit 3    AR-001  the runtime's, when the caller isn't the owner of its employeePromotion.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict        exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/employee-promotion/verbs/submit.ts
 *
 * Idempotent by request, from blueprint/things/employee-promotion/verbs/submit.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/employee-promotion/verbs/submit.ts: p95 150ms.
 *
 * The employee-promotion's machine, from blueprint/things/employee-promotion/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *     (creates)  create  draft      EmployeePromotionDrafted
 *   ▶ draft      submit  submitted  EmployeePromoted
 *     submitted  cancel  cancelled  EmployeePromotionCancelled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its employeePromotion.company;
 *   before it runs, it refuses EmployeePromotionNotDraft unless the employee-promotion is in draft;
 *   before it runs, it hands in the employee-promotion it read as subject, so this handler never reads it again;
 *   each step is its own span: employee-promotion.submit.update;
 *   once it answers, it sets the employee-promotion's state to submitted;
 *   once it answers, it writes EmployeePromoted: employeePromotion, employee and designation from the answer;
 *   the call is the span employee-promotion.submit, and its commit employee-promotion.submit.commit.
 */
const submit: Handler = ({ employeePromotion }, { steps, move, subject }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // The runtime read the promotion for its role and state checks and hands it in. The employee isn't judged again: one
    // drafted before they left can still be submitted (CX-expense-leavers).
    if (!subject) return yield* Effect.die(new Error(`promotion ${employeePromotion} was checked and then not found`));
    const promotionDate = subject["promotionDate"] as string;
    const employee = subject["employee"] as string;
    const newDesignation = subject["newDesignation"] as string;

    // PromotionNotYetDue: exit 45, PM-005. HRMS's `before_submit`, by the world's clock: Effect's Clock reads it,
    // stepped in the local world. Today is its UTC day; the promotion's day itself is allowed.
    const today = Days.add("1970-01-01", Math.floor((yield* Clock.currentTimeMillis) / DAY_MS));
    if (today < promotionDate) {
      yield* Effect.logInfo("the promotion's day hasn't come yet");
      return yield* new PromotionNotYetDue({ promotionDate: promotionDate as never });
    }

    // Step update: database, in the store employee-promotion, employee, span employee-promotion.submit.update. The employee
    // takes the new designation, as HRMS's `on_submit` does through `update_employee_work_history`. The promotion's own
    // change is only its state, which the runtime sets once this answers.
    yield* steps.update(records.update(Employee, employee, { designation: newDesignation as never }));

    // The move submit, from draft, to submitted.
    yield* move();

    return {
      employeePromotion,
      employee: employee as never,
      // EmployeePromoted needs designation, and only the answer can give it.
      designation: newDesignation as never,
    };
  });

export default submit;
