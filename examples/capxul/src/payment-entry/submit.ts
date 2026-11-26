// Scaffolded from blueprint/things/payment-entry/verbs/submit.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/payment-entry/submit.handler.ts";

const { PaymentPostingDateOutsideFiscalYear, PartyDisabled } = Errors.declared;

/**
 * payment-entry.submit: Submit a payment, posting the party's ledger line and the bank's.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its paymentEntry.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/payment-entry/verbs/submit.ts:
 *   paymentEntry  payment-entry.id
 *
 * Answer, from blueprint/things/payment-entry/verbs/submit.ts:
 *   paymentEntry  payment-entry.id
 *   posted        LineCount
 *
 * Refusals:
 *   PaymentPostingDateOutsideFiscalYear  exit 49   PY-009  yours to refuse below, carrying postingDate; from blueprint/things/payment-entry/errors.ts
 *   PartyDisabled                        exit 50   PY-010  yours to refuse below; from blueprint/things/payment-entry/errors.ts
 *   PaymentEntryNotDraft                 exit 40   PY-900  the runtime's, when the payment-entry isn't in draft, carrying state; from blueprint/things/payment-entry/machine.ts
 *   NotAllowed                           exit 3    AR-001  the runtime's, when the caller isn't the owner of its paymentEntry.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict                  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/payment-entry/verbs/submit.ts
 *
 * Idempotent by request, from blueprint/things/payment-entry/verbs/submit.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/payment-entry/verbs/submit.ts: p95 300ms.
 *
 * The payment-entry's machine, from blueprint/things/payment-entry/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *     (creates)  create  draft      PaymentEntryDrafted
 *   ▶ draft      submit  submitted  PaymentEntrySubmitted
 *     submitted  cancel  cancelled  PaymentEntryCancelled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its paymentEntry.company;
 *   before it runs, it refuses PaymentEntryNotDraft unless the payment-entry is in draft;
 *   before it runs, it hands in the payment-entry it read as subject, so this handler never reads it again;
 *   each step is its own span: payment-entry.submit.load, payment-entry.submit.post;
 *   once it answers, it sets the payment-entry's state to submitted;
 *   once it answers, it writes PaymentEntrySubmitted: paymentEntry and posted from the answer;
 *   the call is the span payment-entry.submit, and its commit payment-entry.submit.commit.
 */
const submit: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step load: database, span payment-entry.submit.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // PaymentPostingDateOutsideFiscalYear: exit 49, PY-009.
    if (yield* Handlers.blank<boolean>("refuse PaymentPostingDateOutsideFiscalYear when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why PaymentPostingDateOutsideFiscalYear was refused"));
      return yield* new PaymentPostingDateOutsideFiscalYear({
        postingDate: yield* Handlers.blank("PaymentPostingDateOutsideFiscalYear.postingDate, a Day"),
      });
    }

    // PartyDisabled: exit 50, PY-010.
    if (yield* Handlers.blank<boolean>("refuse PartyDisabled when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why PartyDisabled was refused"));
      return yield* new PartyDisabled({});
    }

    // Step post: database, in the store payment-entry, gl-entry, span payment-entry.submit.post.
    yield* steps.post(Handlers.blank("post: the work this step does"));

    // The move submit, from draft, to submitted.
    yield* move();

    return {
      paymentEntry: yield* Handlers.blank("paymentEntry, a payment-entry.id"),
      // PaymentEntrySubmitted needs posted, and only the answer can give it.
      posted: yield* Handlers.blank("posted, a LineCount"),
    };
  });

export default submit;
