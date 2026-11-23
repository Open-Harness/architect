// Scaffolded from blueprint/things/bank-account/verbs/open.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/bank-account/open.handler.ts";
import { BankAccount } from "../../blueprint/things/bank-account/thing.ts";
import { BridgeBusiness } from "../../blueprint/things/bridge-business/thing.ts";

const { KybNotApproved } = Errors.declared;

/**
 * The deposit instructions Bridge gives a virtual account (`source_deposit_instructions`). Until Capxul mounts the
 * Bridge adapter they are the stand-in's: one bank per currency, and an account number (or IBAN) drawn from the
 * account's own random id, so no two accounts share one (bank-account.oneAccountPerNumber). The routing number passes
 * the ABA checksum and the IBAN its mod-97 check, as Bridge's would.
 */
const depositDetails = (id: string, currency: "USD" | "EUR") => {
  // The id's random base-36 part, as a decimal number: 16 characters of it are about 25 digits.
  const random = [...id.slice(id.indexOf("_") + 1)].reduce((n, c) => n * 36n + BigInt(Number.parseInt(c, 36)), 0n).toString();
  const lastDigits = (n: number) => random.padStart(n, "0").slice(-n);
  if (currency === "USD") return { bankName: "Bridge stand-in bank", accountNumber: lastDigits(12), routingNumber: "101019644" };
  // A German IBAN: DE, two check digits, the bank code of the usual example IBAN, then a ten-digit account number.
  const bban = `37040044${lastDigits(10)}`;
  const check = 98n - (BigInt(`${bban}131400`) % 97n);
  return { bankName: "Bridge stand-in bank (EUR)", accountNumber: `DE${check.toString().padStart(2, "0")}${bban}`, routingNumber: "COBADEFFXXX" };
};

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
const open: Handler = ({ business, accountName, currency }, { steps, move, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    // Step load: database, span bank-account.open.load. The KYB the account is opened on, and the company it is the
    // KYB of: the account belongs to that company, whatever else the caller runs.
    const kyb = yield* steps.load(records.find(BridgeBusiness, business));
    if (!kyb) return yield* Effect.die(new Error(`KYB ${business} was read for the role check and then not found`));

    // KybNotApproved: exit 41, BA-001. Bridge opens accounts only on a KYB it approved.
    if (kyb.state !== "approved") {
      yield* Effect.logInfo(`KYB ${business} is ${String(kyb.state)}, not approved`);
      return yield* new KybNotApproved({});
    }

    const details = depositDetails(id, currency);

    // Step insert: database, span bank-account.open.insert.
    yield* steps.insert(records.insert(BankAccount, { id, company: kyb["company"] as never, business, accountName, currency, ...details }));

    // The move open, to open.
    yield* move();

    return {
      // BankAccountOpened needs account, and only the answer can give it.
      account: id,
      ...details,
    };
  });

export default open;
