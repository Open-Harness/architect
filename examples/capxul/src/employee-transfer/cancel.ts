// Scaffolded from blueprint/things/employee-transfer/verbs/cancel.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Employee } from "../../blueprint/things/employee/thing.ts";
import type { Handler } from "../../generated/api/src/employee-transfer/cancel.handler.ts";

/**
 * employee-transfer.cancel: Cancel a submitted transfer, putting back the department it replaced.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its employeeTransfer.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/employee-transfer/verbs/cancel.ts:
 *   employeeTransfer  employee-transfer.id
 *
 * Answer, from blueprint/things/employee-transfer/verbs/cancel.ts:
 *   employeeTransfer  employee-transfer.id
 *   employee          employee-transfer.employee
 *   department        employee-transfer.currentDepartment
 *
 * Refusals:
 *   EmployeeAlreadyHired      exit 41   EM-001  the runtime's: another active employee holds this company and person (employee.onePlacePerPerson); from blueprint/things/employee/invariants.ts
 *   EmployeeTransferNotDraft  exit 40   TR-900  the runtime's, when the employee-transfer isn't in submitted, carrying state; from blueprint/things/employee-transfer/machine.ts
 *   NotAllowed                exit 3    AR-001  the runtime's, when the caller isn't the owner of its employeeTransfer.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict       exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/employee-transfer/verbs/cancel.ts
 *
 * Idempotent by request, from blueprint/things/employee-transfer/verbs/cancel.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/employee-transfer/verbs/cancel.ts: p95 150ms.
 *
 * The employee-transfer's machine, from blueprint/things/employee-transfer/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *     (creates)  create  draft      EmployeeTransferDrafted
 *     draft      submit  submitted  EmployeeTransferred
 *   ▶ submitted  cancel  cancelled  EmployeeTransferCancelled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its employeeTransfer.company;
 *   before it runs, it refuses EmployeeTransferNotDraft unless the employee-transfer is in submitted;
 *   before it runs, it hands in the employee-transfer it read as subject, so this handler never reads it again;
 *   each step is its own span: employee-transfer.cancel.update;
 *   once it answers, it sets the employee-transfer's state to cancelled;
 *   once it answers, it writes EmployeeTransferCancelled: employeeTransfer, employee and department from the answer;
 *   the call is the span employee-transfer.cancel, and its commit employee-transfer.cancel.commit.
 */
const cancel: Handler = ({ employeeTransfer }, { steps, move, subject }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // The runtime read the transfer for its role and state checks and hands it in.
    if (!subject) return yield* Effect.die(new Error(`transfer ${employeeTransfer} was checked and then not found`));
    const employee = subject["employee"] as string;
    const currentDepartment = subject["currentDepartment"] as string;

    // Step update: database, in the store employee-transfer, employee, span employee-transfer.cancel.update. The employee
    // gets back the department it held when the transfer was drafted, whatever it holds now, as HRMS's
    // `update_employee_work_history(cancel=True)` writes `current` back without comparing (CX-employee-moves).
    yield* steps.update(records.update(Employee, employee, { department: currentDepartment as never }));

    // The move cancel, from submitted, to cancelled.
    yield* move();

    return {
      employeeTransfer,
      employee: employee as never,
      // EmployeeTransferCancelled needs department, and only the answer can give it.
      department: currentDepartment as never,
    };
  });

export default cancel;
