// Scaffolded from blueprint/things/payment-entry/verbs/cancel.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/payment-entry/cancel.handler.ts";
import { Customer } from "../../blueprint/things/customer/thing.ts";
import { GLEntry } from "../../blueprint/things/gl-entry/thing.ts";
import { Supplier } from "../../blueprint/things/supplier/thing.ts";

const { PartyDisabled } = Errors.declared;

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
const cancel: Handler = ({ paymentEntry }, { steps, move, subject }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span payment-entry.cancel.load. The runtime read the payment for its role and state checks
    // and hands it in; this step reads its party and the ledger lines the submit posted, oldest first. Every matching
    // row counts as read at commit; the limit is set so the page holds them all.
    const { payment, party, posted } = yield* steps.load(
      Effect.gen(function* () {
        if (!subject) return yield* Effect.die(new Error(`payment entry ${paymentEntry} was checked and then not found`));
        const party = yield* records.find(subject["partyType"] === "Customer" ? Customer : Supplier, subject["party"] as string);
        const posted = yield* records.list({
          thing: GLEntry,
          where: { voucherType: "Payment Entry", voucherId: paymentEntry, isCancelled: false },
          state: undefined,
          order: "oldest",
          limit: Number.MAX_SAFE_INTEGER,
          after: undefined,
        });
        return { payment: subject, party, posted: posted.items };
      }),
    );

    // PartyDisabled: exit 50. Each reversal is saved as a GL Entry through the same validate as on submit, so its
    // validate_party refuses a disabled party here too, before anything is reversed.
    if (party?.state === "disabled") {
      yield* Effect.logInfo(`the ${payment["partyType"] as string} is disabled`);
      return yield* new PartyDisabled({});
    }

    // Step reverse: database, in the store payment-entry, gl-entry, span payment-entry.cancel.reverse. ERPNext's
    // make_reverse_gl_entries with the immutable ledger off: each line is marked cancelled, and a reversal is posted
    // for it, debit and credit swapped, with the same account, cost center, day and party, cancelled too. Nothing is
    // deleted. The bank's line has no party, and its reversal none either.
    yield* steps.reverse(
      Effect.forEach(posted, (line) =>
        Effect.gen(function* () {
          yield* records.update(GLEntry, line["id"] as string, { isCancelled: true });
          yield* records.insert(GLEntry, {
            id: yield* Ids.of(GLEntry.fields.id),
            company: line["company"] as never,
            account: line["account"] as never,
            costCenter: line["costCenter"] as never,
            postingDate: line["postingDate"] as never,
            debit: line["credit"] as bigint,
            credit: line["debit"] as bigint,
            ...(line["party"] ? { partyType: line["partyType"] as never, party: line["party"] as never } : {}),
            voucherType: "Payment Entry",
            voucherId: paymentEntry,
            isCancelled: true,
          });
        }),
      ),
    );

    // The move cancel, from submitted, to cancelled.
    yield* move();

    return {
      paymentEntry,
      // PaymentEntryCancelled needs reversed, and only the answer can give it.
      reversed: BigInt(posted.length),
    };
  });

export default cancel;
