// Scaffolded from blueprint/things/expense-claim/verbs/approve.ts. Yours from now on.
import { Effect } from "effect";
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
const approve: Handler = ({ expenseClaim }, { steps, move, subject }) =>
  Effect.gen(function* () {
    // Step load: database, span expense-claim.approve.load. The runtime read the claim for its role and state checks
    // and hands it in, so this step only takes it.
    const claim = yield* steps.load(Effect.succeed(subject));
    if (!claim) return yield* Effect.die(new Error(`expense claim ${expenseClaim} was checked and then not found`));
    const totalClaimedAmount = claim["totalClaimedAmount"] as bigint;
    const totalSanctionedAmount = claim["totalSanctionedAmount"] as bigint;

    // ClaimHasNoExpenses: exit 43, EC-003. Nothing claimed is a claimed total of 0 base units.
    if (totalClaimedAmount === 0n) {
      yield* Effect.logInfo("the claim has nothing claimed");
      return yield* new ClaimHasNoExpenses({});
    }

    // Step update: database, span expense-claim.approve.update. The totals already follow the claim's expenses, so
    // the only change is its state, which the runtime sets once this answers.
    yield* steps.update(Effect.void);

    // The move approve, from draft, to approved.
    yield* move();

    return { expenseClaim, totalSanctionedAmount };
  });

export default approve;
