// Scaffolded from blueprint/things/expense-claim/verbs/approve.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/expense-claim/approve.handler.ts";

const { ClaimHasNoExpenses } = Errors.declared;

/**
 * expense-claim.approve: Approve a claim, owing the employee what was sanctioned.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its expenseClaim.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/expense-claim/verbs/approve.ts:
 *   expenseClaim  expense-claim.id
 *
 * Answer, from blueprint/things/expense-claim/verbs/approve.ts:
 *   expenseClaim           expense-claim.id
 *   totalSanctionedAmount  expense-claim.totalSanctionedAmount
 *
 * Refusals:
 *   ClaimHasNoExpenses    exit 43   EC-003  yours to refuse below; from blueprint/things/expense-claim/errors.ts
 *   ExpenseClaimNotDraft  exit 40   EC-900  the runtime's, when the expense-claim isn't in draft, carrying state; from blueprint/things/expense-claim/machine.ts
 *   NotAllowed            exit 3    AR-001  the runtime's, when the caller isn't the owner of its expenseClaim.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict   exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/expense-claim/verbs/approve.ts
 *
 * Idempotent by request, from blueprint/things/expense-claim/verbs/approve.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/expense-claim/verbs/approve.ts: p95 150ms.
 *
 * The expense-claim's machine, from blueprint/things/expense-claim/machine.ts (▶ marks this call):
 *     from       move     to        emits
 *     (creates)  create   draft     ExpenseClaimCreated
 *   ▶ draft      approve  approved  ExpenseClaimApproved
 *     draft      reject   rejected  ExpenseClaimRejected
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its expenseClaim.company;
 *   before it runs, it refuses ExpenseClaimNotDraft unless the expense-claim is in draft;
 *   before it runs, it hands in the expense-claim it read as subject, so this handler never reads it again;
 *   each step is its own span: expense-claim.approve.load, expense-claim.approve.update;
 *   once it answers, it sets the expense-claim's state to approved;
 *   once it answers, it writes ExpenseClaimApproved: expenseClaim and totalSanctionedAmount from the answer;
 *   the call is the span expense-claim.approve, and its commit expense-claim.approve.commit.
 */
const approve: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step load: database, span expense-claim.approve.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // ClaimHasNoExpenses: exit 43, EC-003.
    if (yield* Handlers.blank<boolean>("refuse ClaimHasNoExpenses when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why ClaimHasNoExpenses was refused"));
      return yield* new ClaimHasNoExpenses({});
    }

    // Step update: database, span expense-claim.approve.update.
    yield* steps.update(Handlers.blank("update: the work this step does"));

    // The move approve, from draft, to approved.
    yield* move();

    return {
      expenseClaim: yield* Handlers.blank("expenseClaim, an expense-claim.id"),
      totalSanctionedAmount: yield* Handlers.blank("totalSanctionedAmount, an expense-claim.totalSanctionedAmount"),
    };
  });

export default approve;
