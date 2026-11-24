// Scaffolded from blueprint/things/employee-grade/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/employee-grade/create.handler.ts";

/**
 * employee-grade.create: Add a grade to a company.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/employee-grade/verbs/create.ts:
 *   company    employee-grade.company
 *   gradeName  employee-grade.gradeName
 *
 * Answer, from blueprint/things/employee-grade/verbs/create.ts:
 *   grade  employee-grade.id
 *
 * Refusals:
 *   EmployeeGradeNameTaken  exit 41   EG-001  the runtime's: another employee grade holds this company and grade name (employee-grade.oneNamePerCompany); from blueprint/things/employee-grade/invariants.ts
 *   NotAllowed              exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict     exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/employee-grade/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/employee-grade/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/employee-grade/verbs/create.ts: p95 150ms.
 *
 * The employee-grade's machine, from blueprint/things/employee-grade/machine.ts (▶ marks this call):
 *     from       move    to      emits
 *   ▶ (creates)  create  active  EmployeeGradeCreated
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it mints the employee-grade's new id and hands it in as id;
 *   each step is its own span: employee-grade.create.insert;
 *   once it answers, it sets the employee-grade's state to active;
 *   once it answers, it writes EmployeeGradeCreated: grade from the answer, company from the payload;
 *   the call is the span employee-grade.create, and its commit employee-grade.create.commit.
 */
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step insert: database, span employee-grade.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to active.
    yield* move();

    return {
      // EmployeeGradeCreated needs grade, and only the answer can give it.
      grade: id,
    };
  });

export default create;
