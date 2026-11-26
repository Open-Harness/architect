// Scaffolded from blueprint/things/salary-structure-assignment/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/salary-structure-assignment/create.handler.ts";

const { AssignedEmployeeNotInCompany, AssignedEmployeeHasLeft, AssignmentExists, AssignmentBeforeJoining, AssignedStructureNotInCompany, AssignedStructureNotSubmitted } = Errors.declared;

/**
 * salary-structure-assignment.create: Assign a salary structure to an employee from a day on.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/salary-structure-assignment/verbs/create.ts:
 *   company          salary-structure-assignment.company
 *   employee         salary-structure-assignment.employee
 *   salaryStructure  salary-structure-assignment.salaryStructure
 *   fromDate         salary-structure-assignment.fromDate
 *
 * Answer, from blueprint/things/salary-structure-assignment/verbs/create.ts:
 *   salaryStructureAssignment  salary-structure-assignment.id
 *
 * Refusals:
 *   AssignedEmployeeNotInCompany   exit 41   SA-001  yours to refuse below; from blueprint/things/salary-structure-assignment/errors.ts
 *   AssignedEmployeeHasLeft        exit 42   SA-002  yours to refuse below; from blueprint/things/salary-structure-assignment/errors.ts
 *   AssignmentExists               exit 43   SA-003  yours to refuse below, carrying fromDate; from blueprint/things/salary-structure-assignment/errors.ts
 *   AssignmentBeforeJoining        exit 44   SA-004  yours to refuse below, carrying dateOfJoining; from blueprint/things/salary-structure-assignment/errors.ts
 *   AssignedStructureNotInCompany  exit 45   SA-005  yours to refuse below; from blueprint/things/salary-structure-assignment/errors.ts
 *   AssignedStructureNotSubmitted  exit 46   SA-006  yours to refuse below; from blueprint/things/salary-structure-assignment/errors.ts
 *   EmployeeNotFound               exit 4    EM-901  the runtime's, when no employee has that id, carrying id; from blueprint/things/employee/thing.ts
 *   SalaryStructureNotFound        exit 4    SS-901  the runtime's, when no salary-structure has that id, carrying id; from blueprint/things/salary-structure/thing.ts
 *   NotAllowed                     exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict            exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/salary-structure-assignment/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/salary-structure-assignment/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/salary-structure-assignment/verbs/create.ts: p95 150ms.
 *
 * The salary-structure-assignment's machine, from blueprint/things/salary-structure-assignment/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *   ▶ (creates)  create  draft      SalaryStructureAssigned
 *     draft      submit  submitted  SalaryStructureAssignmentSubmitted
 *     submitted  cancel  cancelled  SalaryStructureAssignmentCancelled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it reads the employee and hands it in as refs.employee, refusing EmployeeNotFound if there is none;
 *   before it runs, it reads the salaryStructure and hands it in as refs.salaryStructure, refusing SalaryStructureNotFound if there is none;
 *   before it runs, it mints the salary-structure-assignment's new id and hands it in as id;
 *   each step is its own span: salary-structure-assignment.create.load, salary-structure-assignment.create.insert;
 *   once it answers, it sets the salary-structure-assignment's state to draft;
 *   once it answers, it writes SalaryStructureAssigned: salaryStructureAssignment from the answer, employee, salaryStructure and fromDate from the payload;
 *   the call is the span salary-structure-assignment.create, and its commit salary-structure-assignment.create.commit.
 */
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span salary-structure-assignment.create.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // AssignedEmployeeNotInCompany: exit 41, SA-001.
    if (yield* Handlers.blank<boolean>("refuse AssignedEmployeeNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AssignedEmployeeNotInCompany was refused"));
      return yield* new AssignedEmployeeNotInCompany({});
    }

    // AssignedEmployeeHasLeft: exit 42, SA-002.
    if (yield* Handlers.blank<boolean>("refuse AssignedEmployeeHasLeft when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AssignedEmployeeHasLeft was refused"));
      return yield* new AssignedEmployeeHasLeft({});
    }

    // AssignmentExists: exit 43, SA-003.
    if (yield* Handlers.blank<boolean>("refuse AssignmentExists when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AssignmentExists was refused"));
      return yield* new AssignmentExists({
        fromDate: yield* Handlers.blank("AssignmentExists.fromDate, a Day"),
      });
    }

    // AssignmentBeforeJoining: exit 44, SA-004.
    if (yield* Handlers.blank<boolean>("refuse AssignmentBeforeJoining when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AssignmentBeforeJoining was refused"));
      return yield* new AssignmentBeforeJoining({
        dateOfJoining: yield* Handlers.blank("AssignmentBeforeJoining.dateOfJoining, a Day"),
      });
    }

    // AssignedStructureNotInCompany: exit 45, SA-005.
    if (yield* Handlers.blank<boolean>("refuse AssignedStructureNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AssignedStructureNotInCompany was refused"));
      return yield* new AssignedStructureNotInCompany({});
    }

    // AssignedStructureNotSubmitted: exit 46, SA-006.
    if (yield* Handlers.blank<boolean>("refuse AssignedStructureNotSubmitted when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AssignedStructureNotSubmitted was refused"));
      return yield* new AssignedStructureNotSubmitted({});
    }

    // Step insert: database, span salary-structure-assignment.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to draft.
    yield* move();

    return {
      // SalaryStructureAssigned needs salaryStructureAssignment, and only the answer can give it.
      salaryStructureAssignment: id,
    };
  });

export default create;
