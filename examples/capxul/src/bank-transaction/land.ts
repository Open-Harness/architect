// Scaffolded from blueprint/things/bank-transaction/verbs/land.ts. Yours from now on.
import { BigDecimal, Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/bank-transaction/land.handler.ts";
import { BankAccount } from "../../blueprint/things/bank-account/thing.ts";
import { BankTransaction } from "../../blueprint/things/bank-transaction/thing.ts";

/**
 * bank-transaction.land: Record a deposit Bridge landed on a company's bank account.
 *
 * Who may call, from blueprint/things/bank-transaction/verbs/land.ts:
 *   the system
 *
 * Payload, from blueprint/things/bank-transaction/verbs/land.ts:
 *   account    bank-transaction.account
 *   reference  bank-transaction.reference
 *   amount     Dollars
 *   party      bank-transaction.party
 *   date       bank-transaction.date
 *
 * Answer, from blueprint/things/bank-transaction/verbs/land.ts:
 *   transaction  bank-transaction.id
 *
 * Refusals:
 *   AlreadyRecorded      exit 44   BT-004  the runtime's: another bank transaction holds this reference (bank-transaction.oneTransactionPerMovement); from blueprint/things/bank-transaction/invariants.ts
 *   BankAccountNotFound  exit 4    BA-901  the runtime's, when no bank-account has that id, carrying id; from blueprint/things/bank-account/thing.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't the system; from blueprint/things/bank-transaction/verbs/land.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/bank-transaction/verbs/land.ts
 *
 * Idempotent by request, from blueprint/things/bank-transaction/verbs/land.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/bank-transaction/verbs/land.ts: p95 150ms.
 *
 * The bank-transaction's machine, from blueprint/things/bank-transaction/machine.ts (▶ marks this call):
 *     from       move    to       emits
 *   ▶ (creates)  land    settled  DepositLanded
 *     (creates)  send    pending  TransferSent
 *     pending    settle  settled  TransferSettled
 *     pending    fail    failed   TransferFailed
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the system;
 *   before it runs, it reads the account and hands it in as refs.account, refusing BankAccountNotFound if there is none;
 *   before it runs, it mints the bank-transaction's new id and hands it in as id;
 *   each step is its own span: bank-transaction.land.load, bank-transaction.land.insert;
 *   once it answers, it sets the bank-transaction's state to settled;
 *   once it answers, it writes DepositLanded: transaction from the answer, account and reference from the payload, deposit from the bank-transaction as the call left it;
 *   the call is the span bank-transaction.land, and its commit bank-transaction.land.commit.
 */
const land: Handler = ({ account, reference, amount, party, date }, { steps, move, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    // Step load: database, span bank-transaction.land.load. The account the deposit landed on: the transaction is its
    // company's, in its currency.
    const held = yield* steps.load(records.find(BankAccount, account));
    if (!held) return yield* Effect.die(new Error(`bank account ${account} was read for the call and then not found`));

    // Step insert: database, span bank-transaction.land.insert. Bridge's dollars, at most six places, are USDC base
    // units exactly: scaled to six places, the unscaled value is the count of millionths (CX-bridge, "Base units"). The
    // reference is Bridge's deposit_id; a second report of it is refused AlreadyRecorded by
    // bank-transaction.oneTransactionPerMovement, so it is recorded once.
    yield* steps.insert(
      records.insert(BankTransaction, {
        id,
        company: held["company"] as never,
        account,
        date,
        deposit: BigDecimal.scale(amount, 6).value,
        withdrawal: 0n,
        currency: held["currency"] as never,
        reference,
        party,
      }),
    );

    // The move land, to settled.
    yield* move();

    return {
      // DepositLanded needs transaction, and only the answer can give it.
      transaction: id,
    };
  });

export default land;
