// Scaffolded from blueprint/things/designation/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/designation/create.handler.ts";
import { Designation } from "../../blueprint/things/designation/thing.ts";

/**
 * designation.create: Add a job title to a company.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/designation/verbs/create.ts:
 *   company          designation.company
 *   designationName  designation.designationName
 *
 * Answer, from blueprint/things/designation/verbs/create.ts:
 *   designation  designation.id
 *
 * Refusals:
 *   DesignationNameTaken  exit 41   DS-001  the runtime's: another designation holds this company and designation name (designation.oneNamePerCompany); from blueprint/things/designation/invariants.ts
 *   NotAllowed            exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict   exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/designation/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/designation/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/designation/verbs/create.ts: p95 150ms.
 *
 * The designation's machine, from blueprint/things/designation/machine.ts (▶ marks this call):
 *     from       move    to      emits
 *   ▶ (creates)  create  active  DesignationCreated
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it mints the designation's new id and hands it in as id;
 *   each step is its own span: designation.create.insert;
 *   once it answers, it sets the designation's state to active;
 *   once it answers, it writes DesignationCreated: designation from the answer, company from the payload;
 *   the call is the span designation.create, and its commit designation.create.commit.
 */
const create: Handler = ({ company, designationName }, { steps, move, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step insert: database, span designation.create.insert. A name taken in the company is the runtime's refusal.
    yield* steps.insert(records.insert(Designation, { id, company, designationName }));

    // The move create, to active.
    yield* move();

    return {
      // DesignationCreated needs designation, and only the answer can give it.
      designation: id,
    };
  });

export default create;
