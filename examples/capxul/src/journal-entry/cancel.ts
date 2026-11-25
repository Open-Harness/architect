// Scaffolded from blueprint/things/journal-entry/verbs/cancel.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/journal-entry/cancel.handler.ts";

/**
 * journal-entry.cancel: Cancel a submitted journal entry, posting a reversing ledger line for each it posted.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its journalEntry.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/journal-entry/verbs/cancel.ts:
 *   journalEntry  journal-entry.id
 *
 * Answer, from blueprint/things/journal-entry/verbs/cancel.ts:
 *   journalEntry  journal-entry.id
 *   reversed      LineCount
 *
 * Refusals:
 *   JournalEntryNotDraft  exit 40   JE-900  the runtime's, when the journal-entry isn't in submitted, carrying state; from blueprint/things/journal-entry/machine.ts
 *   NotAllowed            exit 3    AR-001  the runtime's, when the caller isn't the owner of its journalEntry.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict   exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/journal-entry/verbs/cancel.ts
 *
 * Idempotent by request, from blueprint/things/journal-entry/verbs/cancel.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/journal-entry/verbs/cancel.ts: p95 300ms.
 *
 * The journal-entry's machine, from blueprint/things/journal-entry/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *     (creates)  create  draft      JournalEntryDrafted
 *     draft      submit  submitted  JournalEntrySubmitted
 *   ▶ submitted  cancel  cancelled  JournalEntryCancelled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its journalEntry.company;
 *   before it runs, it refuses JournalEntryNotDraft unless the journal-entry is in submitted;
 *   before it runs, it hands in the journal-entry it read as subject, so this handler never reads it again;
 *   each step is its own span: journal-entry.cancel.load, journal-entry.cancel.reverse;
 *   once it answers, it sets the journal-entry's state to cancelled;
 *   once it answers, it writes JournalEntryCancelled: journalEntry and reversed from the answer;
 *   the call is the span journal-entry.cancel, and its commit journal-entry.cancel.commit.
 */
const cancel: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step load: database, span journal-entry.cancel.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // Step reverse: database, in the store journal-entry, gl-entry, span journal-entry.cancel.reverse.
    yield* steps.reverse(Handlers.blank("reverse: the work this step does"));

    // The move cancel, from submitted, to cancelled.
    yield* move();

    return {
      journalEntry: yield* Handlers.blank("journalEntry, a journal-entry.id"),
      // JournalEntryCancelled needs reversed, and only the answer can give it.
      reversed: yield* Handlers.blank("reversed, a LineCount"),
    };
  });

export default cancel;
