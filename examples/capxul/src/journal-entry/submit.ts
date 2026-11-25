// Scaffolded from blueprint/things/journal-entry/verbs/submit.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/journal-entry/submit.handler.ts";

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
const submit: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step load: database, span journal-entry.submit.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // JournalEntryUnbalanced: exit 48, JE-008.
    if (yield* Handlers.blank<boolean>("refuse JournalEntryUnbalanced when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why JournalEntryUnbalanced was refused"));
      return yield* new JournalEntryUnbalanced({
        difference: yield* Handlers.blank("JournalEntryUnbalanced.difference, a Balance"),
      });
    }

    // PostingDateOutsideFiscalYear: exit 49, JE-009.
    if (yield* Handlers.blank<boolean>("refuse PostingDateOutsideFiscalYear when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why PostingDateOutsideFiscalYear was refused"));
      return yield* new PostingDateOutsideFiscalYear({
        postingDate: yield* Handlers.blank("PostingDateOutsideFiscalYear.postingDate, a Day"),
      });
    }

    // Step post: database, in the store journal-entry, gl-entry, span journal-entry.submit.post.
    yield* steps.post(Handlers.blank("post: the work this step does"));

    // The move submit, from draft, to submitted.
    yield* move();

    return {
      journalEntry: yield* Handlers.blank("journalEntry, a journal-entry.id"),
      // JournalEntrySubmitted needs posted, and only the answer can give it.
      posted: yield* Handlers.blank("posted, a LineCount"),
    };
  });

export default submit;
