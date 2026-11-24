// Scaffolded from blueprint/things/bank-account/verbs/close.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/bank-account/close.handler.ts";

/**
 * bank-account.close: Close a company's bank account; it takes no more deposits.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its account.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/bank-account/verbs/close.ts:
 *   account  bank-account.id
 *
 * Answer, from blueprint/things/bank-account/verbs/close.ts:
 *   account  bank-account.id
 *
 * Refusals:
 *   BankAccountNotOpen   exit 40   BA-900  the runtime's, when the bank-account isn't in open, carrying state; from blueprint/things/bank-account/machine.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't the owner of its account.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/bank-account/verbs/close.ts
 *
 * Idempotent by request, from blueprint/things/bank-account/verbs/close.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/bank-account/verbs/close.ts: p95 800ms.
 *
 * The bank-account's machine, from blueprint/things/bank-account/machine.ts (▶ marks this call):
 *     from       move   to      emits
 *     (creates)  open   open    BankAccountOpened
 *   ▶ open       close  closed  BankAccountClosed
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its account.company;
 *   before it runs, it refuses BankAccountNotOpen unless the bank-account is in open;
 *   before it runs, it hands in the bank-account it read as subject, so this handler never reads it again;
 *   each step is its own span: bank-account.close.update;
 *   once it answers, it sets the bank-account's state to closed;
 *   once it answers, it writes BankAccountClosed: account from the answer;
 *   the call is the span bank-account.close, and its commit bank-account.close.commit.
 */
const close: Handler = ({ account }, { steps, move }) =>
  Effect.gen(function* () {
    // Step update: database, span bank-account.close.update. Closing changes the state; the deposit details stay, and
    // the name is free again (bank-account.oneNamePerCompany holds only while open).
    // The move close, from open, to closed.
    yield* steps.update(move());

    return { account };
  });

export default close;
