// Scaffolded from blueprint/things/employee-transfer/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/employee-transfer/create.handler.ts";

const { TransferredEmployeeNotInCompany, TransferredEmployeeHasLeft, NewDepartmentNotInCompany, DepartmentUnchanged } = Errors.declared;

/**
 * employee-transfer.create: Draft a transfer: an employee's new department, from a day.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/employee-transfer/verbs/create.ts:
 *   company        employee-transfer.company
 *   employee       employee-transfer.employee
 *   transferDate   employee-transfer.transferDate
 *   newDepartment  employee-transfer.newDepartment
 *
 * Answer, from blueprint/things/employee-transfer/verbs/create.ts:
 *   employeeTransfer  employee-transfer.id
 *
 * Refusals:
 *   TransferredEmployeeNotInCompany  exit 41   TR-001  yours to refuse below; from blueprint/things/employee-transfer/errors.ts
 *   TransferredEmployeeHasLeft       exit 42   TR-002  yours to refuse below; from blueprint/things/employee-transfer/errors.ts
 *   NewDepartmentNotInCompany        exit 43   TR-003  yours to refuse below; from blueprint/things/employee-transfer/errors.ts
 *   DepartmentUnchanged              exit 44   TR-004  yours to refuse below; from blueprint/things/employee-transfer/errors.ts
 *   EmployeeNotFound                 exit 4    EM-901  the runtime's, when no employee has that id, carrying id; from blueprint/things/employee/thing.ts
 *   DepartmentNotFound               exit 4    DE-901  the runtime's, when no department has that id, carrying id; from blueprint/things/department/thing.ts
 *   NotAllowed                       exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict              exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/employee-transfer/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/employee-transfer/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/employee-transfer/verbs/create.ts: p95 150ms.
 *
 * The employee-transfer's machine, from blueprint/things/employee-transfer/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *   ▶ (creates)  create  draft      EmployeeTransferDrafted
 *     draft      submit  submitted  EmployeeTransferred
 *     submitted  cancel  cancelled  EmployeeTransferCancelled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it reads the employee and hands it in as refs.employee, refusing EmployeeNotFound if there is none;
 *   before it runs, it reads the newDepartment and hands it in as refs.newDepartment, refusing DepartmentNotFound if there is none;
 *   before it runs, it mints the employee-transfer's new id and hands it in as id;
 *   each step is its own span: employee-transfer.create.load, employee-transfer.create.insert;
 *   once it answers, it sets the employee-transfer's state to draft;
 *   once it answers, it writes EmployeeTransferDrafted: employeeTransfer from the answer, employee from the payload;
 *   the call is the span employee-transfer.create, and its commit employee-transfer.create.commit.
 */
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span employee-transfer.create.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // TransferredEmployeeNotInCompany: exit 41, TR-001.
    if (yield* Handlers.blank<boolean>("refuse TransferredEmployeeNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why TransferredEmployeeNotInCompany was refused"));
      return yield* new TransferredEmployeeNotInCompany({});
    }

    // TransferredEmployeeHasLeft: exit 42, TR-002.
    if (yield* Handlers.blank<boolean>("refuse TransferredEmployeeHasLeft when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why TransferredEmployeeHasLeft was refused"));
      return yield* new TransferredEmployeeHasLeft({});
    }

    // NewDepartmentNotInCompany: exit 43, TR-003.
    if (yield* Handlers.blank<boolean>("refuse NewDepartmentNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why NewDepartmentNotInCompany was refused"));
      return yield* new NewDepartmentNotInCompany({});
    }

    // DepartmentUnchanged: exit 44, TR-004.
    if (yield* Handlers.blank<boolean>("refuse DepartmentUnchanged when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why DepartmentUnchanged was refused"));
      return yield* new DepartmentUnchanged({});
    }

    // Step insert: database, span employee-transfer.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to draft.
    yield* move();

    return {
      // EmployeeTransferDrafted needs employeeTransfer, and only the answer can give it.
      employeeTransfer: id,
    };
  });

export default create;
