// Scaffolded from blueprint/things/employee-transfer/verbs/submit.ts. Yours from now on.
import { Clock, Effect } from "effect";
import { Days } from "orthograph";
import { Records } from "@orthograph/language-effect";
import { Employee } from "../../blueprint/things/employee/thing.ts";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/employee-transfer/submit.handler.ts";

const { TransferNotYetDue } = Errors.declared;

const DAY_MS = 86_400_000;

/**
 * employee-transfer.submit: Submit a transfer on or after its day, giving the employee the new department.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its employeeTransfer.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/employee-transfer/verbs/submit.ts:
 *   employeeTransfer  employee-transfer.id
 *
 * Answer, from blueprint/things/employee-transfer/verbs/submit.ts:
 *   employeeTransfer  employee-transfer.id
 *   employee          employee-transfer.employee
 *   department        employee-transfer.newDepartment
 *
 * Refusals:
 *   TransferNotYetDue         exit 45   TR-005  yours to refuse below, carrying transferDate; from blueprint/things/employee-transfer/errors.ts
 *   EmployeeAlreadyHired      exit 41   EM-001  the runtime's: another active employee holds this company and person (employee.onePlacePerPerson); from blueprint/things/employee/invariants.ts
 *   EmployeeTransferNotDraft  exit 40   TR-900  the runtime's, when the employee-transfer isn't in draft, carrying state; from blueprint/things/employee-transfer/machine.ts
 *   NotAllowed                exit 3    AR-001  the runtime's, when the caller isn't the owner of its employeeTransfer.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict       exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/employee-transfer/verbs/submit.ts
 *
 * Idempotent by request, from blueprint/things/employee-transfer/verbs/submit.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/employee-transfer/verbs/submit.ts: p95 150ms.
 *
 * The employee-transfer's machine, from blueprint/things/employee-transfer/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *     (creates)  create  draft      EmployeeTransferDrafted
 *   ▶ draft      submit  submitted  EmployeeTransferred
 *     submitted  cancel  cancelled  EmployeeTransferCancelled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its employeeTransfer.company;
 *   before it runs, it refuses EmployeeTransferNotDraft unless the employee-transfer is in draft;
 *   before it runs, it hands in the employee-transfer it read as subject, so this handler never reads it again;
 *   each step is its own span: employee-transfer.submit.update;
 *   once it answers, it sets the employee-transfer's state to submitted;
 *   once it answers, it writes EmployeeTransferred: employeeTransfer, employee and department from the answer;
 *   the call is the span employee-transfer.submit, and its commit employee-transfer.submit.commit.
 */
const submit: Handler = ({ employeeTransfer }, { steps, move, subject }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // The runtime read the transfer for its role and state checks and hands it in. The employee isn't judged again: one
    // drafted before they left can still be submitted (CX-expense-leavers).
    if (!subject) return yield* Effect.die(new Error(`transfer ${employeeTransfer} was checked and then not found`));
    const transferDate = subject["transferDate"] as string;
    const employee = subject["employee"] as string;
    const newDepartment = subject["newDepartment"] as string;

    // TransferNotYetDue: exit 45, TR-005. HRMS's `before_submit`, by the world's clock: Effect's Clock reads it,
    // stepped in the local world. Today is its UTC day; the transfer's day itself is allowed.
    const today = Days.add("1970-01-01", Math.floor((yield* Clock.currentTimeMillis) / DAY_MS));
    if (today < transferDate) {
      yield* Effect.logInfo("the transfer's day hasn't come yet");
      return yield* new TransferNotYetDue({ transferDate: transferDate as never });
    }

    // Step update: database, in the store employee-transfer, employee, span employee-transfer.submit.update. The employee
    // takes the new department, as HRMS's `on_submit` does through `update_employee_work_history`. The transfer's own
    // change is only its state, which the runtime sets once this answers.
    yield* steps.update(records.update(Employee, employee, { department: newDepartment as never }));

    // The move submit, from draft, to submitted.
    yield* move();

    return {
      employeeTransfer,
      employee: employee as never,
      // EmployeeTransferred needs department, and only the answer can give it.
      department: newDepartment as never,
    };
  });

export default submit;
