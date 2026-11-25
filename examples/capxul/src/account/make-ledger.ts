// Scaffolded from blueprint/things/account/verbs/make-ledger.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/account/make-ledger.handler.ts";
import { Account } from "../../blueprint/things/account/thing.ts";

const { AccountHasChildren } = Errors.declared;

/**
 * account.make-ledger: Turn a group account with nothing under it into a ledger.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its account.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/account/verbs/make-ledger.ts:
 *   account  account.id
 *
 * Answer, from blueprint/things/account/verbs/make-ledger.ts:
 *   account  account.id
 *
 * Refusals:
 *   AccountHasChildren   exit 46   AC-006  yours to refuse below; from blueprint/things/account/errors.ts
 *   AccountNameTaken     exit 47   AC-007  the runtime's: another account holds this company and account name (account.oneNamePerCompany); from blueprint/things/account/invariants.ts
 *   AccountNotGroup      exit 40   AC-900  the runtime's, when the account isn't in group, carrying state; from blueprint/things/account/machine.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't the owner of its account.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/account/verbs/make-ledger.ts
 *
 * Idempotent by request, from blueprint/things/account/verbs/make-ledger.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/account/verbs/make-ledger.ts: p95 150ms.
 *
 * The account's machine, from blueprint/things/account/machine.ts (▶ marks this call):
 *     from       move        to      emits
 *     (creates)  create      group   AccountCreated
 *     (creates)  create      ledger  AccountCreated
 *   ▶ group      makeLedger  ledger  AccountMadeLedger
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its account.company;
 *   before it runs, it refuses AccountNotGroup unless the account is in group;
 *   before it runs, it hands in the account it read as subject, so this handler never reads it again;
 *   each step is its own span: account.make-ledger.load, account.make-ledger.update;
 *   once it answers, it sets the account's state to ledger;
 *   once it answers, it writes AccountMadeLedger: account from the answer;
 *   the call is the span account.make-ledger, and its commit account.make-ledger.commit.
 */
const makeLedger: Handler = ({ account }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span account.make-ledger.load. One account under it is enough to refuse.
    const children = yield* steps.load(
      records.list({ thing: Account, where: { parentAccount: account }, state: undefined, order: "oldest", limit: 1, after: undefined }),
    );

    // AccountHasChildren: exit 46, AC-006.
    if (children.items.length > 0) {
      yield* Effect.logInfo("an account sits under this group");
      return yield* new AccountHasChildren({});
    }

    // Step update: database, span account.make-ledger.update. The only change is its state, which the runtime sets
    // once this answers.
    yield* steps.update(Effect.void);

    // The move makeLedger, from group, to ledger.
    yield* move();

    return { account };
  });

export default makeLedger;
