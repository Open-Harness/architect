// Scaffolded from blueprint/things/customer/verbs/balance.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/customer/balance.handler.ts";
import { GLEntry } from "../../blueprint/things/gl-entry/thing.ts";

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
const balance: Handler = ({ customer, onDay }, { steps }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step sum: database, span customer.balance.sum. Every ledger line not cancelled with this customer as its party, posted
    // on or before the day: debit less credit (ERPNext's get_balance_on with a party type and party). Every matching
    // row counts as read at commit; the limit is set so the page holds them all.
    const { debit, credit } = yield* steps.sum(
      Effect.gen(function* () {
        const lines = yield* records.list({
          thing: GLEntry,
          where: { partyType: "Customer", party: customer, isCancelled: false },
          state: undefined,
          order: "oldest",
          limit: Number.MAX_SAFE_INTEGER,
          after: undefined,
        });
        let debit = 0n;
        let credit = 0n;
        for (const line of lines.items) {
          if ((line["postingDate"] as string) > onDay) continue;
          debit += line["debit"] as bigint;
          credit += line["credit"] as bigint;
        }
        return { debit, credit };
      }),
    );

    return { customer, debit, credit, balance: debit - credit };
  });

export default balance;
