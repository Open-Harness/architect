// Scaffolded from blueprint/things/bank-transaction/verbs/send.ts. Yours from now on.
import { BigDecimal, Clock, Effect } from "effect";
import { Days } from "orthograph";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/bank-transaction/send.handler.ts";
import { BankAccount } from "../../blueprint/things/bank-account/thing.ts";
import { BankTransaction } from "../../blueprint/things/bank-transaction/thing.ts";

const { AccountClosed, CurrencyNotHeld, NothingToSend } = Errors.declared;

const DAY_MS = 86_400_000;

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
const send: Handler = ({ account, amount, currency, party }, { steps, move, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    // Step load: database, span bank-transaction.send.load. The account the money leaves: its state, its currency and
    // its company.
    const held = yield* steps.load(records.find(BankAccount, account));
    if (!held) return yield* Effect.die(new Error(`bank account ${account} was read for the role check and then not found`));

    // The refusals in CX-bridge's order: a closed account before its currency, its currency before the amount.
    // AccountClosed: exit 41, BT-001. Bridge has deactivated the virtual account.
    if (held.state === "closed") {
      yield* Effect.logInfo(`bank account ${account} is closed`);
      return yield* new AccountClosed({ account });
    }

    // CurrencyNotHeld: exit 42, BT-002. Each Bridge virtual account takes one currency.
    if (held["currency"] !== currency) {
      yield* Effect.logInfo(`bank account ${account} holds ${String(held["currency"])}, not ${currency}`);
      return yield* new CurrencyNotHeld({ currency });
    }

    // NothingToSend: exit 43, BT-003.
    if (!BigDecimal.isPositive(amount)) {
      yield* Effect.logInfo(`a transfer of ${BigDecimal.format(amount)} dollars sends nothing`);
      return yield* new NothingToSend({});
    }

    // Until #995 lets a step reach the Bridge adapter (transfers.create, with an Idempotency-Key from this call's request
    // key), the transfer's reference is Capxul's own, drawn from the transaction's id (CX-bridge, "Who speaks for
    // Bridge"), and prefixed so it is never taken for one of Bridge's `tr_…`. Its day is the world clock's UTC day.
    const reference = `capxul_${id.slice(id.indexOf("_") + 1)}`;
    const today = Days.add("1970-01-01", Math.floor((yield* Clock.currentTimeMillis) / DAY_MS));

    // Step insert: database, span bank-transaction.send.insert. The amount is USDC base units exactly, as in land.
    yield* steps.insert(
      records.insert(BankTransaction, {
        id,
        company: held["company"] as never,
        account,
        date: today as never,
        deposit: 0n,
        withdrawal: BigDecimal.scale(amount, 6).value,
        currency,
        reference: reference as never,
        party,
      }),
    );

    // The move send, to pending.
    yield* move();

    return {
      // TransferSent needs transaction, and only the answer can give it.
      transaction: id,
      reference: reference as never,
    };
  });

export default send;
