// Scaffolded from blueprint/things/journal-entry/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/journal-entry/create.handler.ts";

const { JournalEntryTooFewLines, LineAccountNotInCompany, LineAccountIsGroup, LineCostCenterNotInCompany, LineCostCenterIsGroup, LineWithoutAmount, LineDebitAndCredit } = Errors.declared;

/**
 * journal-entry.create: Draft a journal entry with its lines.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/journal-entry/verbs/create.ts:
 *   company      journal-entry.company
 *   postingDate  journal-entry.postingDate
 *   userRemark   journal-entry.userRemark
 *   lines        schema
 *
 * Answer, from blueprint/things/journal-entry/verbs/create.ts:
 *   journalEntry  journal-entry.id
 *   totalDebit    journal-entry.totalDebit
 *   totalCredit   journal-entry.totalCredit
 *
 * Refusals:
 *   JournalEntryTooFewLines     exit 41   JE-001  yours to refuse below; from blueprint/things/journal-entry/errors.ts
 *   LineAccountNotInCompany     exit 42   JE-002  yours to refuse below, carrying line; from blueprint/things/journal-entry/errors.ts
 *   LineAccountIsGroup          exit 43   JE-003  yours to refuse below, carrying line; from blueprint/things/journal-entry/errors.ts
 *   LineCostCenterNotInCompany  exit 44   JE-004  yours to refuse below, carrying line; from blueprint/things/journal-entry/errors.ts
 *   LineCostCenterIsGroup       exit 45   JE-005  yours to refuse below, carrying line; from blueprint/things/journal-entry/errors.ts
 *   LineWithoutAmount           exit 46   JE-006  yours to refuse below, carrying line; from blueprint/things/journal-entry/errors.ts
 *   LineDebitAndCredit          exit 47   JE-007  yours to refuse below, carrying line; from blueprint/things/journal-entry/errors.ts
 *   NotAllowed                  exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict         exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/journal-entry/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/journal-entry/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/journal-entry/verbs/create.ts: p95 200ms.
 *
 * The journal-entry's machine, from blueprint/things/journal-entry/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *   ▶ (creates)  create  draft      JournalEntryDrafted
 *     draft      submit  submitted  JournalEntrySubmitted
 *     submitted  cancel  cancelled  JournalEntryCancelled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it mints the journal-entry's new id and hands it in as id;
 *   each step is its own span: journal-entry.create.load, journal-entry.create.insert;
 *   once it answers, it sets the journal-entry's state to draft;
 *   once it answers, it writes JournalEntryDrafted: journalEntry, totalDebit and totalCredit from the answer, company from the payload;
 *   the call is the span journal-entry.create, and its commit journal-entry.create.commit.
 */
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span journal-entry.create.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // JournalEntryTooFewLines: exit 41, JE-001.
    if (yield* Handlers.blank<boolean>("refuse JournalEntryTooFewLines when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why JournalEntryTooFewLines was refused"));
      return yield* new JournalEntryTooFewLines({});
    }

    // LineAccountNotInCompany: exit 42, JE-002.
    if (yield* Handlers.blank<boolean>("refuse LineAccountNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why LineAccountNotInCompany was refused"));
      return yield* new LineAccountNotInCompany({
        line: yield* Handlers.blank("LineAccountNotInCompany.line, a LineNumber"),
      });
    }

    // LineAccountIsGroup: exit 43, JE-003.
    if (yield* Handlers.blank<boolean>("refuse LineAccountIsGroup when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why LineAccountIsGroup was refused"));
      return yield* new LineAccountIsGroup({
        line: yield* Handlers.blank("LineAccountIsGroup.line, a LineNumber"),
      });
    }

    // LineCostCenterNotInCompany: exit 44, JE-004.
    if (yield* Handlers.blank<boolean>("refuse LineCostCenterNotInCompany when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why LineCostCenterNotInCompany was refused"));
      return yield* new LineCostCenterNotInCompany({
        line: yield* Handlers.blank("LineCostCenterNotInCompany.line, a LineNumber"),
      });
    }

    // LineCostCenterIsGroup: exit 45, JE-005.
    if (yield* Handlers.blank<boolean>("refuse LineCostCenterIsGroup when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why LineCostCenterIsGroup was refused"));
      return yield* new LineCostCenterIsGroup({
        line: yield* Handlers.blank("LineCostCenterIsGroup.line, a LineNumber"),
      });
    }

    // LineWithoutAmount: exit 46, JE-006.
    if (yield* Handlers.blank<boolean>("refuse LineWithoutAmount when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why LineWithoutAmount was refused"));
      return yield* new LineWithoutAmount({
        line: yield* Handlers.blank("LineWithoutAmount.line, a LineNumber"),
      });
    }

    // LineDebitAndCredit: exit 47, JE-007.
    if (yield* Handlers.blank<boolean>("refuse LineDebitAndCredit when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why LineDebitAndCredit was refused"));
      return yield* new LineDebitAndCredit({
        line: yield* Handlers.blank("LineDebitAndCredit.line, a LineNumber"),
      });
    }

    // Step insert: database, in the store journal-entry, journal-entry-account, span journal-entry.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to draft.
    yield* move();

    return {
      // JournalEntryDrafted needs journalEntry, and only the answer can give it.
      journalEntry: id,
      totalDebit: yield* Handlers.blank("totalDebit, a journal-entry.totalDebit"),
      totalCredit: yield* Handlers.blank("totalCredit, a journal-entry.totalCredit"),
    };
  });

export default create;
