// Scaffolded from blueprint/things/account/verbs/balance.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/account/balance.handler.ts";
import { Account } from "../../blueprint/things/account/thing.ts";
import { GLEntry } from "../../blueprint/things/gl-entry/thing.ts";

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
const balance: Handler = ({ account, onDay }, { steps }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    // A list reads every matching row whatever its limit, so one call takes them all.
    const all = { state: undefined, order: "oldest", limit: Number.MAX_SAFE_INTEGER, after: undefined } as const;

    // Step sum: database, span account.balance.sum. The account and every account anywhere under it, walked a level
    // at a time; then each one's ledger lines not cancelled, posted on or before the day (ERPNext's get_balance_on).
    const { debit, credit } = yield* steps.sum(
      Effect.gen(function* () {
        const accounts: Array<string> = [account];
        for (let i = 0; i < accounts.length; i++) {
          const under = yield* records.list({ ...all, thing: Account, where: { parentAccount: accounts[i] } });
          for (const child of under.items) accounts.push(child["id"] as string);
        }
        let debit = 0n;
        let credit = 0n;
        for (const each of accounts) {
          const lines = yield* records.list({ ...all, thing: GLEntry, where: { account: each, isCancelled: false } });
          for (const line of lines.items) {
            if ((line["postingDate"] as string) > onDay) continue;
            debit += line["debit"] as bigint;
            credit += line["credit"] as bigint;
          }
        }
        return { debit, credit };
      }),
    );

    return { account, debit, credit, balance: debit - credit };
  });

export default balance;
