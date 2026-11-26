// Scaffolded from blueprint/things/payment-entry/verbs/cancel.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/payment-entry/cancel.handler.ts";

/**
 * payment-entry.cancel: Cancel a submitted payment, posting a reversing ledger line for each it posted.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its paymentEntry.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/payment-entry/verbs/cancel.ts:
 *   paymentEntry  payment-entry.id
 *
 * Answer, from blueprint/things/payment-entry/verbs/cancel.ts:
 *   paymentEntry  payment-entry.id
 *   reversed      LineCount
 *
 * Refusals:
 *   PaymentEntryNotDraft  exit 40   PY-900  the runtime's, when the payment-entry isn't in submitted, carrying state; from blueprint/things/payment-entry/machine.ts
 *   NotAllowed            exit 3    AR-001  the runtime's, when the caller isn't the owner of its paymentEntry.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict   exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/payment-entry/verbs/cancel.ts
 *
 * Idempotent by request, from blueprint/things/payment-entry/verbs/cancel.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/payment-entry/verbs/cancel.ts: p95 300ms.
 *
 * The payment-entry's machine, from blueprint/things/payment-entry/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *     (creates)  create  draft      PaymentEntryDrafted
 *     draft      submit  submitted  PaymentEntrySubmitted
 *   ▶ submitted  cancel  cancelled  PaymentEntryCancelled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its paymentEntry.company;
 *   before it runs, it refuses PaymentEntryNotDraft unless the payment-entry is in submitted;
 *   before it runs, it hands in the payment-entry it read as subject, so this handler never reads it again;
 *   each step is its own span: payment-entry.cancel.load, payment-entry.cancel.reverse;
 *   once it answers, it sets the payment-entry's state to cancelled;
 *   once it answers, it writes PaymentEntryCancelled: paymentEntry and reversed from the answer;
 *   the call is the span payment-entry.cancel, and its commit payment-entry.cancel.commit.
 */
const cancel: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step load: database, span payment-entry.cancel.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // Step reverse: database, in the store payment-entry, gl-entry, span payment-entry.cancel.reverse.
    yield* steps.reverse(Handlers.blank("reverse: the work this step does"));

    // The move cancel, from submitted, to cancelled.
    yield* move();

    return {
      paymentEntry: yield* Handlers.blank("paymentEntry, a payment-entry.id"),
      // PaymentEntryCancelled needs reversed, and only the answer can give it.
      reversed: yield* Handlers.blank("reversed, a LineCount"),
    };
  });

export default cancel;
