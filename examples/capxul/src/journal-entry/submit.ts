// Scaffolded from blueprint/things/journal-entry/verbs/submit.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/journal-entry/submit.handler.ts";
import { FiscalYear } from "../../blueprint/things/fiscal-year/thing.ts";
import { GLEntry } from "../../blueprint/things/gl-entry/thing.ts";
import { JournalEntryAccount } from "../../blueprint/things/journal-entry-account/thing.ts";

const { JournalEntryUnbalanced, PostingDateOutsideFiscalYear } = Errors.declared;

/**
 * journal-entry.submit: Submit a balanced journal entry, posting one ledger line per line.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its journalEntry.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/journal-entry/verbs/submit.ts:
 *   journalEntry  journal-entry.id
 *
 * Answer, from blueprint/things/journal-entry/verbs/submit.ts:
 *   journalEntry  journal-entry.id
 *   posted        LineCount
 *
 * Refusals:
 *   JournalEntryUnbalanced        exit 48   JE-008  yours to refuse below, carrying difference; from blueprint/things/journal-entry/errors.ts
 *   PostingDateOutsideFiscalYear  exit 49   JE-009  yours to refuse below, carrying postingDate; from blueprint/things/journal-entry/errors.ts
 *   JournalEntryNotDraft          exit 40   JE-900  the runtime's, when the journal-entry isn't in draft, carrying state; from blueprint/things/journal-entry/machine.ts
 *   NotAllowed                    exit 3    AR-001  the runtime's, when the caller isn't the owner of its journalEntry.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict           exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/journal-entry/verbs/submit.ts
 *
 * Idempotent by request, from blueprint/things/journal-entry/verbs/submit.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/journal-entry/verbs/submit.ts: p95 300ms.
 *
 * The journal-entry's machine, from blueprint/things/journal-entry/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *     (creates)  create  draft      JournalEntryDrafted
 *   ▶ draft      submit  submitted  JournalEntrySubmitted
 *     submitted  cancel  cancelled  JournalEntryCancelled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its journalEntry.company;
 *   before it runs, it refuses JournalEntryNotDraft unless the journal-entry is in draft;
 *   before it runs, it hands in the journal-entry it read as subject, so this handler never reads it again;
 *   each step is its own span: journal-entry.submit.load, journal-entry.submit.post;
 *   once it answers, it sets the journal-entry's state to submitted;
 *   once it answers, it writes JournalEntrySubmitted: journalEntry and posted from the answer;
 *   the call is the span journal-entry.submit, and its commit journal-entry.submit.commit.
 */
const submit: Handler = ({ journalEntry }, { steps, move, subject }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    // A list reads every matching row whatever its limit, so one call takes them all.
    const all = { state: undefined, order: "oldest", limit: Number.MAX_SAFE_INTEGER, after: undefined } as const;

    // Step load: database, span journal-entry.submit.load. The runtime read the entry for its role and state checks
    // and hands it in; this step reads its lines and its company's fiscal years.
    const { entry, lines, years } = yield* steps.load(
      Effect.gen(function* () {
        if (!subject) return yield* Effect.die(new Error(`journal entry ${journalEntry} was checked and then not found`));
        const lines = yield* records.list({ ...all, thing: JournalEntryAccount, where: { journalEntry } });
        const years = yield* records.list({ ...all, thing: FiscalYear, where: { company: subject["company"] } });
        return { entry: subject, lines: lines.items, years: years.items };
      }),
    );
    const company = entry["company"] as string;
    const postingDate = entry["postingDate"] as string;

    // Refusal order (errors.ts): JournalEntryUnbalanced, then PostingDateOutsideFiscalYear.
    // JournalEntryUnbalanced: exit 48, JE-008. It carries debit less credit, signed.
    const difference = (entry["totalDebit"] as bigint) - (entry["totalCredit"] as bigint);
    if (difference !== 0n) {
      yield* Effect.logInfo(`debit less credit is ${difference}, not 0`);
      return yield* new JournalEntryUnbalanced({ difference });
    }

    // PostingDateOutsideFiscalYear: exit 49, JE-009. One of the company's own years, both ends counted.
    if (!years.some((y) => (y["yearStartDate"] as string) <= postingDate && postingDate <= (y["yearEndDate"] as string))) {
      yield* Effect.logInfo(`${postingDate} falls in none of the company's fiscal years`);
      return yield* new PostingDateOutsideFiscalYear({ postingDate: postingDate as never });
    }

    // Step post: database, in the store journal-entry, gl-entry, span journal-entry.submit.post. One ledger line per
    // line, in line order, unmerged (merge_similar_account_heads is off by default).
    const ordered = [...lines].sort((a, b) => ((a["line"] as bigint) < (b["line"] as bigint) ? -1 : 1));
    yield* steps.post(
      Effect.forEach(ordered, (line) =>
        Effect.gen(function* () {
          const id = yield* Ids.of(GLEntry.fields.id);
          yield* records.insert(GLEntry, {
            id,
            company: company as never,
            account: line["account"] as never,
            costCenter: line["costCenter"] as never,
            postingDate: postingDate as never,
            debit: line["debit"] as bigint,
            credit: line["credit"] as bigint,
            voucherType: "Journal Entry",
            voucherId: journalEntry,
            isCancelled: false,
          });
        }),
      ),
    );

    // The move submit, from draft, to submitted.
    yield* move();

    return {
      journalEntry,
      // JournalEntrySubmitted needs posted, and only the answer can give it.
      posted: BigInt(ordered.length),
    };
  });

export default submit;
