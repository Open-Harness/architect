// Scaffolded from blueprint/things/bank-account/verbs/open.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/bank-account/open.handler.ts";

const { KybNotApproved } = Errors.declared;

/**
 * bank-account.open: Open a bank account for a company whose KYB Bridge approved: answers where to send deposits.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its business.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/bank-account/verbs/open.ts:
 *   business     bank-account.business
 *   accountName  bank-account.accountName
 *   currency     bank-account.currency
 *
 * Answer, from blueprint/things/bank-account/verbs/open.ts:
 *   account        bank-account.id
 *   bankName       bank-account.bankName
 *   accountNumber  bank-account.accountNumber
 *   routingNumber  bank-account.routingNumber
 *
 * Refusals:
 *   KybNotApproved        exit 41   BA-001  yours to refuse below; from blueprint/things/bank-account/errors.ts
 *   BankAccountNameTaken  exit 42   BA-002  the runtime's: another open bank account holds this company and account name (bank-account.oneNamePerCompany); from blueprint/things/bank-account/invariants.ts
 *   NotAllowed            exit 3    AR-001  the runtime's, when the caller isn't the owner of its business.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict   exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/bank-account/verbs/open.ts
 *
 * Idempotent by request, from blueprint/things/bank-account/verbs/open.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/bank-account/verbs/open.ts: p95 800ms.
 *
 * The bank-account's machine, from blueprint/things/bank-account/machine.ts (▶ marks this call):
 *     from       move   to      emits
 *   ▶ (creates)  open   open    BankAccountOpened
 *     open       close  closed  BankAccountClosed
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its business.company;
 *   before it runs, it reads the business and hands it in as refs.business;
 *   before it runs, it mints the bank-account's new id and hands it in as id;
 *   each step is its own span: bank-account.open.load, bank-account.open.insert;
 *   once it answers, it sets the bank-account's state to open;
 *   once it answers, it writes BankAccountOpened: account from the answer, company from the bank-account as the call left it, business and currency from the payload;
 *   the call is the span bank-account.open, and its commit bank-account.open.commit.
 */
const open: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span bank-account.open.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // KybNotApproved: exit 41, BA-001.
    if (yield* Handlers.blank<boolean>("refuse KybNotApproved when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why KybNotApproved was refused"));
      return yield* new KybNotApproved({});
    }

    // Step insert: database, span bank-account.open.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move open, to open.
    yield* move();

    return {
      // BankAccountOpened needs account, and only the answer can give it.
      account: id,
      bankName: yield* Handlers.blank("bankName, a bank-account.bankName"),
      accountNumber: yield* Handlers.blank("accountNumber, a bank-account.accountNumber"),
      routingNumber: yield* Handlers.blank("routingNumber, a bank-account.routingNumber"),
    };
  });

export default open;
