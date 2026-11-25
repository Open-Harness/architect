// Scaffolded from blueprint/things/bank-transaction/verbs/send.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/bank-transaction/send.handler.ts";

const { AccountClosed, CurrencyNotHeld, NothingToSend } = Errors.declared;

/**
 * bank-transaction.send: Send money out of a company's bank account to a payee, through Bridge.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its account.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/bank-transaction/verbs/send.ts:
 *   account   bank-transaction.account
 *   amount    Dollars
 *   currency  bank-transaction.currency
 *   party     bank-transaction.party
 *
 * Answer, from blueprint/things/bank-transaction/verbs/send.ts:
 *   transaction  bank-transaction.id
 *   reference    bank-transaction.reference
 *
 * Refusals:
 *   AccountClosed        exit 41   BT-001  yours to refuse below, carrying account; from blueprint/things/bank-transaction/errors.ts
 *   CurrencyNotHeld      exit 42   BT-002  yours to refuse below, carrying currency; from blueprint/things/bank-transaction/errors.ts
 *   NothingToSend        exit 43   BT-003  yours to refuse below; from blueprint/things/bank-transaction/errors.ts
 *   AlreadyRecorded      exit 44   BT-004  the runtime's: another bank transaction holds this reference (bank-transaction.oneTransactionPerMovement); from blueprint/things/bank-transaction/invariants.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't the owner of its account.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/bank-transaction/verbs/send.ts
 *
 * Idempotent by request, from blueprint/things/bank-transaction/verbs/send.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/bank-transaction/verbs/send.ts: p95 800ms.
 *
 * The bank-transaction's machine, from blueprint/things/bank-transaction/machine.ts (▶ marks this call):
 *     from       move    to       emits
 *     (creates)  land    settled  DepositLanded
 *   ▶ (creates)  send    pending  TransferSent
 *     pending    settle  settled  TransferSettled
 *     pending    fail    failed   TransferFailed
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its account.company;
 *   before it runs, it reads the account and hands it in as refs.account;
 *   before it runs, it mints the bank-transaction's new id and hands it in as id;
 *   each step is its own span: bank-transaction.send.load, bank-transaction.send.insert;
 *   once it answers, it sets the bank-transaction's state to pending;
 *   once it answers, it writes TransferSent: transaction from the answer, account from the payload, withdrawal from the bank-transaction as the call left it;
 *   the call is the span bank-transaction.send, and its commit bank-transaction.send.commit.
 */
const send: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span bank-transaction.send.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // AccountClosed: exit 41, BT-001.
    if (yield* Handlers.blank<boolean>("refuse AccountClosed when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AccountClosed was refused"));
      return yield* new AccountClosed({
        account: yield* Handlers.blank("AccountClosed.account, a bank-transaction.account"),
      });
    }

    // CurrencyNotHeld: exit 42, BT-002.
    if (yield* Handlers.blank<boolean>("refuse CurrencyNotHeld when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why CurrencyNotHeld was refused"));
      return yield* new CurrencyNotHeld({
        currency: yield* Handlers.blank("CurrencyNotHeld.currency, a bank-transaction.currency"),
      });
    }

    // NothingToSend: exit 43, BT-003.
    if (yield* Handlers.blank<boolean>("refuse NothingToSend when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why NothingToSend was refused"));
      return yield* new NothingToSend({});
    }

    // Step insert: database, span bank-transaction.send.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move send, to pending.
    yield* move();

    return {
      // TransferSent needs transaction, and only the answer can give it.
      transaction: id,
      reference: yield* Handlers.blank("reference, a bank-transaction.reference"),
    };
  });

export default send;
