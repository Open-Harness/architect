// Scaffolded from blueprint/things/employee-feedback-criteria/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/employee-feedback-criteria/create.handler.ts";

/**
 * employee-feedback-criteria.create: Add something a company rates its people on.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/employee-feedback-criteria/verbs/create.ts:
 *   company   employee-feedback-criteria.company
 *   criteria  employee-feedback-criteria.criteria
 *
 * Answer, from blueprint/things/employee-feedback-criteria/verbs/create.ts:
 *   employeeFeedbackCriteria  employee-feedback-criteria.id
 *
 * Refusals:
 *   CriteriaNameTaken    exit 41   FC-001  the runtime's: another employee feedback criteria holds this company and criteria (employee-feedback-criteria.oneNamePerCompany); from blueprint/things/employee-feedback-criteria/invariants.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/employee-feedback-criteria/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/employee-feedback-criteria/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/employee-feedback-criteria/verbs/create.ts: p95 150ms.
 *
 * The employee-feedback-criteria's machine, from blueprint/things/employee-feedback-criteria/machine.ts (▶ marks this call):
 *     from       move    to      emits
 *   ▶ (creates)  create  active  FeedbackCriteriaCreated
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it mints the employee-feedback-criteria's new id and hands it in as id;
 *   each step is its own span: employee-feedback-criteria.create.insert;
 *   once it answers, it sets the employee-feedback-criteria's state to active;
 *   once it answers, it writes FeedbackCriteriaCreated: employeeFeedbackCriteria from the answer, company from the payload;
 *   the call is the span employee-feedback-criteria.create, and its commit employee-feedback-criteria.create.commit.
 */
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step insert: database, span employee-feedback-criteria.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to active.
    yield* move();

    return {
      // FeedbackCriteriaCreated needs employeeFeedbackCriteria, and only the answer can give it.
      employeeFeedbackCriteria: id,
    };
  });

export default create;
