// Scaffolded from blueprint/things/employee/verbs/hire.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/employee/hire.handler.ts";

const { DepartmentNotInCompany, DesignationNotInCompany, JoinedBeforeBorn } = Errors.declared;

/**
 * employee.hire: Hire a person into a company, placed in one of its departments under one of its job titles.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/employee/verbs/hire.ts:
 *   company        employee.company
 *   person         employee.person
 *   firstName      employee.firstName
 *   gender         employee.gender
 *   dateOfBirth    employee.dateOfBirth
 *   dateOfJoining  employee.dateOfJoining
 *   department     employee.department
 *   designation    employee.designation
 *
 * Answer, from blueprint/things/employee/verbs/hire.ts:
 *   employee  employee.id
 *
 * Refusals:
 *   DepartmentNotInCompany   exit 42   EM-002  yours to refuse below; from blueprint/things/employee/errors.ts
 *   DesignationNotInCompany  exit 43   EM-003  yours to refuse below; from blueprint/things/employee/errors.ts
 *   JoinedBeforeBorn         exit 44   EM-004  yours to refuse below, carrying dateOfBirth; from blueprint/things/employee/errors.ts
 *   EmployeeAlreadyHired     exit 41   EM-001  the runtime's: another active employee holds this company and person (employee.onePlacePerPerson); from blueprint/things/employee/invariants.ts
 *   DepartmentNotFound       exit 4    DE-901  the runtime's, when no department has that id, carrying id; from blueprint/things/department/thing.ts
 *   DesignationNotFound      exit 4    DS-901  the runtime's, when no designation has that id, carrying id; from blueprint/things/designation/thing.ts
 *   NotAllowed               exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict      exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/employee/verbs/hire.ts
 *
 * Idempotent by request, from blueprint/things/employee/verbs/hire.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/employee/verbs/hire.ts: p95 200ms.
 *
 * The employee's machine, from blueprint/things/employee/machine.ts (▶ marks this call):
 *     from       move     to      emits
 *   ▶ (creates)  hire     active  EmployeeHired
 *     active     relieve  left    EmployeeRelieved
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it reads the department and hands it in as refs.department, refusing DepartmentNotFound if there is none;
 *   before it runs, it reads the designation and hands it in as refs.designation, refusing DesignationNotFound if there is none;
 *   before it runs, it mints the employee's new id and hands it in as id;
 *   each step is its own span: employee.hire.load, employee.hire.insert;
 *   once it answers, it sets the employee's state to active;
 *   once it answers, it writes EmployeeHired: employee from the answer, company and person from the payload;
 *   the call is the span employee.hire, and its commit employee.hire.commit.
 */
const hire: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span employee.hire.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // DepartmentNotInCompany: exit 42, EM-002.
    if (yield* Handlers.blank<boolean>("refuse DepartmentNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why DepartmentNotInCompany was refused"));
      return yield* new DepartmentNotInCompany({});
    }

    // DesignationNotInCompany: exit 43, EM-003.
    if (yield* Handlers.blank<boolean>("refuse DesignationNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why DesignationNotInCompany was refused"));
      return yield* new DesignationNotInCompany({});
    }

    // JoinedBeforeBorn: exit 44, EM-004.
    if (yield* Handlers.blank<boolean>("refuse JoinedBeforeBorn when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why JoinedBeforeBorn was refused"));
      return yield* new JoinedBeforeBorn({
        dateOfBirth: yield* Handlers.blank("JoinedBeforeBorn.dateOfBirth, a Day"),
      });
    }

    // Step insert: database, span employee.hire.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move hire, to active.
    yield* move();

    return {
      // EmployeeHired needs employee, and only the answer can give it.
      employee: id,
    };
  });

export default hire;
