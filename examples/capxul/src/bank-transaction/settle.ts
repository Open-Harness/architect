// Scaffolded from blueprint/things/bank-transaction/verbs/settle.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/bank-transaction/settle.handler.ts";

/**
 * bank-transaction.settle: Record that Bridge paid a transfer out.
 *
 * Who may call, from blueprint/things/bank-transaction/verbs/settle.ts:
 *   the system
 *
 * Payload, from blueprint/things/bank-transaction/verbs/settle.ts:
 *   transaction  bank-transaction.id
 *
 * Answer, from blueprint/things/bank-transaction/verbs/settle.ts:
 *   transaction  bank-transaction.id
 *
 * Refusals:
 *   AlreadyRecorded            exit 44   BT-004  the runtime's: another bank transaction holds this reference (bank-transaction.oneTransactionPerMovement); from blueprint/things/bank-transaction/invariants.ts
 *   BankTransactionNotPending  exit 40   BT-900  the runtime's, when the bank-transaction isn't in pending, carrying state; from blueprint/things/bank-transaction/machine.ts
 *   BankTransactionNotFound    exit 4    BT-901  the runtime's, when no bank-transaction has that id, carrying id; from blueprint/things/bank-transaction/thing.ts
 *   NotAllowed                 exit 3    AR-001  the runtime's, when the caller isn't the system; from blueprint/things/bank-transaction/verbs/settle.ts
 *   IdempotencyConflict        exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/bank-transaction/verbs/settle.ts
 *
 * Idempotent by request, from blueprint/things/bank-transaction/verbs/settle.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/bank-transaction/verbs/settle.ts: p95 150ms.
 *
 * The bank-transaction's machine, from blueprint/things/bank-transaction/machine.ts (▶ marks this call):
 *     from       move    to       emits
 *     (creates)  land    settled  DepositLanded
 *     (creates)  send    pending  TransferSent
 *   ▶ pending    settle  settled  TransferSettled
 *     pending    fail    failed   TransferFailed
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the system;
 *   before it runs, it refuses BankTransactionNotPending unless the bank-transaction is in pending;
 *   before it runs, it hands in the bank-transaction it read as subject, so this handler never reads it again;
 *   each step is its own span: bank-transaction.settle.update;
 *   once it answers, it sets the bank-transaction's state to settled;
 *   once it answers, it writes TransferSettled: transaction from the answer;
 *   the call is the span bank-transaction.settle, and its commit bank-transaction.settle.commit.
 */
const settle: Handler = ({ transaction }, { steps, move }) =>
  Effect.gen(function* () {
    // Step update: database, span bank-transaction.settle.update. Bridge paid the transfer: the state changes and nothing else.
    // The move settle, from pending, to settled.
    yield* steps.update(move());

    return { transaction };
  });

export default settle;
