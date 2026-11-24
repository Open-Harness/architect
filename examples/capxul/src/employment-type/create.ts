// Scaffolded from blueprint/things/employment-type/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/employment-type/create.handler.ts";

/**
 * employment-type.create: Add a way a company employs people.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/employment-type/verbs/create.ts:
 *   company             employment-type.company
 *   employmentTypeName  employment-type.employmentTypeName
 *
 * Answer, from blueprint/things/employment-type/verbs/create.ts:
 *   employmentType  employment-type.id
 *
 * Refusals:
 *   EmploymentTypeNameTaken  exit 41   TY-001  the runtime's: another employment type holds this company and employment type name (employment-type.oneNamePerCompany); from blueprint/things/employment-type/invariants.ts
 *   NotAllowed               exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict      exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/employment-type/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/employment-type/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/employment-type/verbs/create.ts: p95 150ms.
 *
 * The employment-type's machine, from blueprint/things/employment-type/machine.ts (▶ marks this call):
 *     from       move    to      emits
 *   ▶ (creates)  create  active  EmploymentTypeCreated
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it mints the employment-type's new id and hands it in as id;
 *   each step is its own span: employment-type.create.insert;
 *   once it answers, it sets the employment-type's state to active;
 *   once it answers, it writes EmploymentTypeCreated: employmentType from the answer, company from the payload;
 *   the call is the span employment-type.create, and its commit employment-type.create.commit.
 */
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step insert: database, span employment-type.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to active.
    yield* move();

    return {
      // EmploymentTypeCreated needs employmentType, and only the answer can give it.
      employmentType: id,
    };
  });

export default create;
