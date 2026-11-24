// Scaffolded from blueprint/things/expense/verbs/add.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/expense/add.handler.ts";

const { SanctionedOverClaimed, ExpenseTypeNotInCompany, ClaimNotDraft } = Errors.declared;

/**
 * expense.add: Add one expense to a claim still in draft.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its expenseClaim.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/expense/verbs/add.ts:
 *   expenseClaim      expense.expenseClaim
 *   expenseDate       expense.expenseDate
 *   expenseType       expense.expenseType
 *   amount            expense.amount
 *   sanctionedAmount  expense.sanctionedAmount
 *
 * Answer, from blueprint/things/expense/verbs/add.ts:
 *   expense                expense.id
 *   totalClaimedAmount     expense-claim.totalClaimedAmount
 *   totalSanctionedAmount  expense-claim.totalSanctionedAmount
 *
 * Refusals:
 *   SanctionedOverClaimed     exit 41   EX-001  yours to refuse below, carrying amount; from blueprint/things/expense/errors.ts
 *   ExpenseTypeNotInCompany   exit 42   EX-002  yours to refuse below; from blueprint/things/expense/errors.ts
 *   ClaimNotDraft             exit 43   EX-003  yours to refuse below; from blueprint/things/expense/errors.ts
 *   ExpenseClaimTypeNotFound  exit 4    ET-901  the runtime's, when no expense-claim-type has that id, carrying id; from blueprint/things/expense-claim-type/thing.ts
 *   NotAllowed                exit 3    AR-001  the runtime's, when the caller isn't the owner of its expenseClaim.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict       exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/expense/verbs/add.ts
 *
 * Idempotent by request, from blueprint/things/expense/verbs/add.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/expense/verbs/add.ts: p95 200ms.
 *
 * The expense's machine, from blueprint/things/expense/machine.ts (▶ marks this call):
 *     from       move  to      emits
 *   ▶ (creates)  add   active  ExpenseAdded
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its expenseClaim.company;
 *   before it runs, it reads the expenseClaim and hands it in as refs.expenseClaim;
 *   before it runs, it reads the expenseType and hands it in as refs.expenseType, refusing ExpenseClaimTypeNotFound if there is none;
 *   before it runs, it mints the expense's new id and hands it in as id;
 *   each step is its own span: expense.add.load, expense.add.insert;
 *   once it answers, it sets the expense's state to active;
 *   once it answers, it writes ExpenseAdded: expense and totalClaimedAmount from the answer, expenseClaim and amount from the payload;
 *   the call is the span expense.add, and its commit expense.add.commit.
 */
const add: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span expense.add.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // SanctionedOverClaimed: exit 41, EX-001.
    if (yield* Handlers.blank<boolean>("refuse SanctionedOverClaimed when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why SanctionedOverClaimed was refused"));
      return yield* new SanctionedOverClaimed({
        amount: yield* Handlers.blank("SanctionedOverClaimed.amount, an Amount"),
      });
    }

    // ExpenseTypeNotInCompany: exit 42, EX-002.
    if (yield* Handlers.blank<boolean>("refuse ExpenseTypeNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why ExpenseTypeNotInCompany was refused"));
      return yield* new ExpenseTypeNotInCompany({});
    }

    // ClaimNotDraft: exit 43, EX-003.
    if (yield* Handlers.blank<boolean>("refuse ClaimNotDraft when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why ClaimNotDraft was refused"));
      return yield* new ClaimNotDraft({});
    }

    // Step insert: database, in the store expense, expense-claim, span expense.add.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move add, to active.
    yield* move();

    return {
      // ExpenseAdded needs expense, and only the answer can give it.
      expense: id,
      // ExpenseAdded needs totalClaimedAmount, and only the answer can give it.
      totalClaimedAmount: yield* Handlers.blank("totalClaimedAmount, an expense-claim.totalClaimedAmount"),
      totalSanctionedAmount: yield* Handlers.blank("totalSanctionedAmount, an expense-claim.totalSanctionedAmount"),
    };
  });

export default add;
