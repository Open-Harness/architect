// Scaffolded from blueprint/things/company/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/company/create.handler.ts";

/**
 * company.create: Set up a company; the person who sets it up runs it.
 *
 * Who may call, from blueprint/things/company/verbs/create.ts:
 *   anyone signed in
 *
 * Payload, from blueprint/things/company/verbs/create.ts:
 *   companyName      company.companyName
 *   abbr             company.abbr
 *   country          company.country
 *   defaultCurrency  company.defaultCurrency
 *
 * Answer, from blueprint/things/company/verbs/create.ts:
 *   company  company.id
 *
 * Refusals:
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't anyone signed in; from blueprint/things/company/verbs/create.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/company/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/company/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/company/verbs/create.ts: p95 150ms.
 *
 * The company's machine, from blueprint/things/company/machine.ts (▶ marks this call):
 *     from       move    to      emits
 *   ▶ (creates)  create  active  CompanyCreated
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is signed in;
 *   before it runs, it mints the company's new id and hands it in as id;
 *   each step is its own span: company.create.insert;
 *   once it answers, it sets the company's state to active;
 *   once it answers, it writes CompanyCreated: company from the answer, owner from the company as the call left it;
 *   the call is the span company.create, and its commit company.create.commit.
 */
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step insert: database, span company.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to active.
    yield* move();

    return {
      // CompanyCreated needs company, and only the answer can give it.
      company: id,
    };
  });

export default create;
