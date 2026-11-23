// Scaffolded from blueprint/things/department/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/department/create.handler.ts";
import { Department } from "../../blueprint/things/department/thing.ts";

/**
 * department.create: Add a department to a company.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/department/verbs/create.ts:
 *   company         department.company
 *   departmentName  department.departmentName
 *
 * Answer, from blueprint/things/department/verbs/create.ts:
 *   department  department.id
 *
 * Refusals:
 *   DepartmentNameTaken  exit 41   DE-001  the runtime's: another department holds this company and department name (department.oneNamePerCompany); from blueprint/things/department/invariants.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/department/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/department/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/department/verbs/create.ts: p95 150ms.
 *
 * The department's machine, from blueprint/things/department/machine.ts (▶ marks this call):
 *     from       move    to      emits
 *   ▶ (creates)  create  active  DepartmentCreated
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it mints the department's new id and hands it in as id;
 *   each step is its own span: department.create.insert;
 *   once it answers, it sets the department's state to active;
 *   once it answers, it writes DepartmentCreated: department from the answer, company from the payload;
 *   the call is the span department.create, and its commit department.create.commit.
 */
const create: Handler = ({ company, departmentName }, { steps, move, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step insert: database, span department.create.insert. A name taken in the company is the runtime's refusal.
    yield* steps.insert(records.insert(Department, { id, company, departmentName }));

    // The move create, to active.
    yield* move();

    return {
      // DepartmentCreated needs department, and only the answer can give it.
      department: id,
    };
  });

export default create;
