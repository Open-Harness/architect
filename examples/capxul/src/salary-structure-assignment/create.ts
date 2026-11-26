// Scaffolded from blueprint/things/salary-structure-assignment/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { SalaryStructureAssignment } from "../../blueprint/things/salary-structure-assignment/thing.ts";
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
const create: Handler = ({ company, employee, salaryStructure, fromDate }, { steps, move, refs, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const all = { order: "oldest", limit: Number.MAX_SAFE_INTEGER, after: undefined } as const;

    // Step load: database, span salary-structure-assignment.create.load. The runtime read the employee and the
    // structure and hands them in; this step reads the employee's submitted assignments.
    const { worker, structure, held } = yield* steps.load(
      Effect.gen(function* () {
        const held = yield* records.list({ ...all, thing: SalaryStructureAssignment, where: { employee }, state: "submitted" });
        return { worker: refs.employee, structure: refs.salaryStructure, held: held.items };
      }),
    );
    if (!worker) return yield* Effect.die(new Error(`employee ${employee} was read and then not found`));
    if (!structure) return yield* Effect.die(new Error(`salary structure ${salaryStructure} was read and then not found`));

    // Refusal order (errors.ts).
    // AssignedEmployeeNotInCompany: exit 41, SA-001.
    if (worker["company"] !== company) {
      yield* Effect.logInfo("the employee works for another company");
      return yield* new AssignedEmployeeNotInCompany({});
    }

    // AssignedEmployeeHasLeft: exit 42, SA-002.
    if (worker.state !== "active") {
      yield* Effect.logInfo(`the employee is ${worker.state ?? "in no state"}, not at work`);
      return yield* new AssignedEmployeeHasLeft({});
    }

    // AssignmentExists: exit 43, SA-003. Drafts don't count.
    if (held.some((a) => a["fromDate"] === fromDate)) {
      yield* Effect.logInfo(`the employee already has a submitted assignment from ${fromDate}`);
      return yield* new AssignmentExists({ fromDate });
    }

    // AssignmentBeforeJoining: exit 44, SA-004. The joining day itself is allowed.
    const dateOfJoining = worker["dateOfJoining"] as string;
    if (fromDate < dateOfJoining) {
      yield* Effect.logInfo(`${fromDate} is before the employee joined on ${dateOfJoining}`);
      return yield* new AssignmentBeforeJoining({ dateOfJoining: dateOfJoining as never });
    }

    // AssignedStructureNotInCompany: exit 45, SA-005.
    if (structure["company"] !== company) {
      yield* Effect.logInfo("the structure belongs to another company");
      return yield* new AssignedStructureNotInCompany({});
    }

    // AssignedStructureNotSubmitted: exit 46, SA-006.
    if (structure.state !== "submitted") {
      yield* Effect.logInfo(`the structure is ${structure.state ?? "in no state"}, not submitted`);
      return yield* new AssignedStructureNotSubmitted({});
    }

    // Step insert: database, span salary-structure-assignment.create.insert.
    yield* steps.insert(records.insert(SalaryStructureAssignment, { id, company, employee, salaryStructure, fromDate }));

    // The move create, to draft.
    yield* move();

    return {
      salaryStructureAssignment: id,
    };
  });

export default create;
