// Scaffolded from blueprint/things/supplier/verbs/balance.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/supplier/balance.handler.ts";
import { GLEntry } from "../../blueprint/things/gl-entry/thing.ts";

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
const balance: Handler = ({ supplier, onDay }, { steps }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step sum: database, span supplier.balance.sum. Every ledger line not cancelled with this supplier as its party, posted
    // on or before the day: debit less credit (ERPNext's get_balance_on with a party type and party). Every matching
    // row counts as read at commit; the limit is set so the page holds them all.
    const { debit, credit } = yield* steps.sum(
      Effect.gen(function* () {
        const lines = yield* records.list({
          thing: GLEntry,
          where: { partyType: "Supplier", party: supplier, isCancelled: false },
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

    return { supplier, debit, credit, balance: debit - credit };
  });

export default balance;
