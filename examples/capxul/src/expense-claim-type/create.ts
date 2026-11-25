// Scaffolded from blueprint/things/expense-claim-type/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/expense-claim-type/create.handler.ts";
import { ExpenseClaimType } from "../../blueprint/things/expense-claim-type/thing.ts";

/**
 * expense-claim-type.create: Add a kind of expense a company pays back.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/expense-claim-type/verbs/create.ts:
 *   company      expense-claim-type.company
 *   expenseType  expense-claim-type.expenseType
 *
 * Answer, from blueprint/things/expense-claim-type/verbs/create.ts:
 *   expenseClaimType  expense-claim-type.id
 *
 * Refusals:
 *   ExpenseTypeTaken     exit 41   ET-001  the runtime's: another expense claim type holds this company and expense type (expense-claim-type.oneNamePerCompany); from blueprint/things/expense-claim-type/invariants.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/expense-claim-type/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/expense-claim-type/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/expense-claim-type/verbs/create.ts: p95 150ms.
 *
 * The expense-claim-type's machine, from blueprint/things/expense-claim-type/machine.ts (▶ marks this call):
 *     from       move    to      emits
 *   ▶ (creates)  create  active  ExpenseClaimTypeCreated
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it mints the expense-claim-type's new id and hands it in as id;
 *   each step is its own span: expense-claim-type.create.insert;
 *   once it answers, it sets the expense-claim-type's state to active;
 *   once it answers, it writes ExpenseClaimTypeCreated: expenseClaimType from the answer, company from the payload;
 *   the call is the span expense-claim-type.create, and its commit expense-claim-type.create.commit.
 */
const create: Handler = ({ company, expenseType }, { steps, move, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step insert: database, span expense-claim-type.create.insert. A name taken in the company is the runtime's refusal.
    yield* steps.insert(records.insert(ExpenseClaimType, { id, company, expenseType }));

    // The move create, to active.
    yield* move();

    return {
      // ExpenseClaimTypeCreated needs expenseClaimType, and only the answer can give it.
      expenseClaimType: id,
    };
  });

export default create;
