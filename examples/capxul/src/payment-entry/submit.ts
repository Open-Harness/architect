// Scaffolded from blueprint/things/payment-entry/verbs/submit.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/payment-entry/submit.handler.ts";
import { Customer } from "../../blueprint/things/customer/thing.ts";
import { FiscalYear } from "../../blueprint/things/fiscal-year/thing.ts";
import { GLEntry } from "../../blueprint/things/gl-entry/thing.ts";
import { Supplier } from "../../blueprint/things/supplier/thing.ts";

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
const submit: Handler = ({ paymentEntry }, { steps, move, subject }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span payment-entry.submit.load. The runtime read the payment for its role and state checks
    // and hands it in; this step reads its company's fiscal years and its party. Every matching row counts as read at
    // commit; the limit is set so the page holds them all.
    const { payment, years, party } = yield* steps.load(
      Effect.gen(function* () {
        if (!subject) return yield* Effect.die(new Error(`payment entry ${paymentEntry} was checked and then not found`));
        const years = yield* records.list({
          thing: FiscalYear,
          where: { company: subject["company"] },
          state: undefined,
          order: "oldest",
          limit: Number.MAX_SAFE_INTEGER,
          after: undefined,
        });
        // The party is listed, not found, so its row is guarded at commit: a disable that lands meanwhile makes this
        // call conflict and run again, and the retry refuses PartyDisabled.
        const parties = yield* records.list({
          thing: subject["partyType"] === "Customer" ? Customer : Supplier,
          where: { id: subject["party"] },
          state: undefined,
          order: "oldest",
          limit: 1,
          after: undefined,
        });
        const party = parties.items[0];
        return { payment: subject, years: years.items, party };
      }),
    );
    const postingDate = payment["postingDate"] as string;

    // Refusal order (errors.ts), the GL Entry's validate order: the fiscal year, then the party.
    // PaymentPostingDateOutsideFiscalYear: exit 49. One of the company's own years, matched by its span, both ends counted.
    if (!years.some((y) => (y["yearStartDate"] as string) <= postingDate && postingDate <= (y["yearEndDate"] as string))) {
      yield* Effect.logInfo(`${postingDate} falls in none of the company's fiscal years`);
      return yield* new PaymentPostingDateOutsideFiscalYear({ postingDate: postingDate as never });
    }

    // PartyDisabled: exit 50. The GL Entry's validate_party.
    if (party?.state === "disabled") {
      yield* Effect.logInfo(`the ${payment["partyType"] as string} is disabled`);
      return yield* new PartyDisabled({});
    }

    // Step post: database, in the store payment-entry, gl-entry, span payment-entry.submit.post. ERPNext's build_gl_map
    // for an unallocated payment: the party's line first, on its account with its party type and party, credited on
    // Receive and debited on Pay; then the bank's, with no party, debited on Receive and credited on Pay.
    const receive = payment["paymentType"] === "Receive";
    const amount = payment["paidAmount"] as bigint;
    const common = {
      company: payment["company"] as never,
      costCenter: payment["costCenter"] as never,
      postingDate: postingDate as never,
      voucherType: "Payment Entry",
      voucherId: paymentEntry,
      isCancelled: false,
    } as const;
    yield* steps.post(
      Effect.gen(function* () {
        yield* records.insert(GLEntry, {
          id: yield* Ids.of(GLEntry.fields.id),
          ...common,
          account: (receive ? payment["paidFrom"] : payment["paidTo"]) as never,
          debit: receive ? 0n : amount,
          credit: receive ? amount : 0n,
          partyType: payment["partyType"] as never,
          party: payment["party"] as never,
        });
        yield* records.insert(GLEntry, {
          id: yield* Ids.of(GLEntry.fields.id),
          ...common,
          account: (receive ? payment["paidTo"] : payment["paidFrom"]) as never,
          debit: receive ? amount : 0n,
          credit: receive ? 0n : amount,
        });
      }),
    );

    // The move submit, from draft, to submitted.
    yield* move();

    return {
      paymentEntry,
      // PaymentEntrySubmitted needs posted, and only the answer can give it.
      posted: 2n,
    };
  });

export default submit;
