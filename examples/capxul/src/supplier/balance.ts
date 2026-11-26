// Scaffolded from blueprint/things/supplier/verbs/balance.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/supplier/balance.handler.ts";

/**
 * supplier.balance: A supplier's balance on a day, from the ledger lines posted with it as their party.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its supplier.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/supplier/verbs/balance.ts:
 *   supplier  supplier.id
 *   onDay     Day
 *
 * Answer, from blueprint/things/supplier/verbs/balance.ts:
 *   supplier  supplier.id
 *   debit     Amount
 *   credit    Amount
 *   balance   Balance
 *
 * Refusals:
 *   NotAllowed  exit 3  AR-001  the runtime's, when the caller isn't the owner of its supplier.company; from blueprint/things/company/roles.ts
 *
 * Budget, from blueprint/things/supplier/verbs/balance.ts: p95 300ms.
 *
 * The supplier's machine, from blueprint/things/supplier/machine.ts (this call makes no move):
 *     from       move     to        emits
 *     (creates)  create   active    SupplierCreated
 *     active     disable  disabled  SupplierDisabled
 *     disabled   enable   active    SupplierEnabled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its supplier.company;
 *   before it runs, it hands in the supplier it read as subject, so this handler never reads it again;
 *   each step is its own span: supplier.balance.sum;
 *   the call is the span supplier.balance, and its commit supplier.balance.commit.
 */
const balance: Handler = (_payload, { steps }) =>
  Effect.gen(function* () {
    // Step sum: database, span supplier.balance.sum.
    yield* steps.sum(Handlers.blank("sum: the work this step does"));

    return {
      supplier: yield* Handlers.blank("supplier, a supplier.id"),
      debit: yield* Handlers.blank("debit, an Amount"),
      credit: yield* Handlers.blank("credit, an Amount"),
      balance: yield* Handlers.blank("balance, a Balance"),
    };
  });

export default balance;
