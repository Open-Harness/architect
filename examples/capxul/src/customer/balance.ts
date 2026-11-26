// Scaffolded from blueprint/things/customer/verbs/balance.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/customer/balance.handler.ts";

/**
 * customer.balance: A customer's balance on a day, from the ledger lines posted with it as their party.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its customer.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/customer/verbs/balance.ts:
 *   customer  customer.id
 *   onDay     Day
 *
 * Answer, from blueprint/things/customer/verbs/balance.ts:
 *   customer  customer.id
 *   debit     Amount
 *   credit    Amount
 *   balance   Balance
 *
 * Refusals:
 *   NotAllowed  exit 3  AR-001  the runtime's, when the caller isn't the owner of its customer.company; from blueprint/things/company/roles.ts
 *
 * Budget, from blueprint/things/customer/verbs/balance.ts: p95 300ms.
 *
 * The customer's machine, from blueprint/things/customer/machine.ts (this call makes no move):
 *     from       move     to        emits
 *     (creates)  create   active    CustomerCreated
 *     active     disable  disabled  CustomerDisabled
 *     disabled   enable   active    CustomerEnabled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its customer.company;
 *   before it runs, it hands in the customer it read as subject, so this handler never reads it again;
 *   each step is its own span: customer.balance.sum;
 *   the call is the span customer.balance, and its commit customer.balance.commit.
 */
const balance: Handler = (_payload, { steps }) =>
  Effect.gen(function* () {
    // Step sum: database, span customer.balance.sum.
    yield* steps.sum(Handlers.blank("sum: the work this step does"));

    return {
      customer: yield* Handlers.blank("customer, a customer.id"),
      debit: yield* Handlers.blank("debit, an Amount"),
      credit: yield* Handlers.blank("credit, an Amount"),
      balance: yield* Handlers.blank("balance, a Balance"),
    };
  });

export default balance;
