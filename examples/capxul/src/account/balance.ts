// Scaffolded from blueprint/things/account/verbs/balance.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/account/balance.handler.ts";

/**
 * account.balance: An account's balance on a day: its own ledger lines and those of every account under it.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its account.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/account/verbs/balance.ts:
 *   account  account.id
 *   onDay    Day
 *
 * Answer, from blueprint/things/account/verbs/balance.ts:
 *   account  account.id
 *   debit    Amount
 *   credit   Amount
 *   balance  Balance
 *
 * Refusals:
 *   NotAllowed  exit 3  AR-001  the runtime's, when the caller isn't the owner of its account.company; from blueprint/things/company/roles.ts
 *
 * Budget, from blueprint/things/account/verbs/balance.ts: p95 300ms.
 *
 * The account's machine, from blueprint/things/account/machine.ts (this call makes no move):
 *     from       move        to      emits
 *     (creates)  create      group   AccountCreated
 *     (creates)  create      ledger  AccountCreated
 *     group      makeLedger  ledger  AccountMadeLedger
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its account.company;
 *   before it runs, it hands in the account it read as subject, so this handler never reads it again;
 *   each step is its own span: account.balance.sum;
 *   the call is the span account.balance, and its commit account.balance.commit.
 */
const balance: Handler = (_payload, { steps }) =>
  Effect.gen(function* () {
    // Step sum: database, span account.balance.sum.
    yield* steps.sum(Handlers.blank("sum: the work this step does"));

    return {
      account: yield* Handlers.blank("account, an account.id"),
      debit: yield* Handlers.blank("debit, an Amount"),
      credit: yield* Handlers.blank("credit, an Amount"),
      balance: yield* Handlers.blank("balance, a Balance"),
    };
  });

export default balance;
