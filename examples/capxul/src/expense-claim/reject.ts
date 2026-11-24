// Scaffolded from blueprint/things/expense-claim/verbs/reject.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/expense-claim/reject.handler.ts";

/**
 * expense-claim.reject: Reject a claim, so nothing of it is paid back.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its expenseClaim.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/expense-claim/verbs/reject.ts:
 *   expenseClaim  expense-claim.id
 *
 * Answer, from blueprint/things/expense-claim/verbs/reject.ts:
 *   expenseClaim  expense-claim.id
 *
 * Refusals:
 *   ExpenseClaimNotDraft  exit 40   EC-900  the runtime's, when the expense-claim isn't in draft, carrying state; from blueprint/things/expense-claim/machine.ts
 *   NotAllowed            exit 3    AR-001  the runtime's, when the caller isn't the owner of its expenseClaim.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict   exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/expense-claim/verbs/reject.ts
 *
 * Idempotent by request, from blueprint/things/expense-claim/verbs/reject.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/expense-claim/verbs/reject.ts: p95 150ms.
 *
 * The expense-claim's machine, from blueprint/things/expense-claim/machine.ts (▶ marks this call):
 *     from       move     to        emits
 *     (creates)  create   draft     ExpenseClaimCreated
 *     draft      approve  approved  ExpenseClaimApproved
 *   ▶ draft      reject   rejected  ExpenseClaimRejected
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its expenseClaim.company;
 *   before it runs, it refuses ExpenseClaimNotDraft unless the expense-claim is in draft;
 *   before it runs, it hands in the expense-claim it read as subject, so this handler never reads it again;
 *   each step is its own span: expense-claim.reject.update;
 *   once it answers, it sets the expense-claim's state to rejected;
 *   once it answers, it writes ExpenseClaimRejected: expenseClaim from the answer;
 *   the call is the span expense-claim.reject, and its commit expense-claim.reject.commit.
 */
const reject: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step update: database, span expense-claim.reject.update.
    yield* steps.update(Handlers.blank("update: the work this step does"));

    // The move reject, from draft, to rejected.
    yield* move();

    return {
      expenseClaim: yield* Handlers.blank("expenseClaim, an expense-claim.id"),
    };
  });

export default reject;
