// Scaffolded from blueprint/things/journal-entry/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/journal-entry/create.handler.ts";
import { Account } from "../../blueprint/things/account/thing.ts";
import { CostCenter } from "../../blueprint/things/cost-center/thing.ts";
import { JournalEntry } from "../../blueprint/things/journal-entry/thing.ts";
import { JournalEntryAccount } from "../../blueprint/things/journal-entry-account/thing.ts";

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
const create: Handler = ({ company, postingDate, userRemark, lines }, { steps, move, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span journal-entry.create.load. Each line's account and cost center.
    const heads = yield* steps.load(
      Effect.forEach(lines, (line) =>
        Effect.all({ account: records.find(Account, line.account), costCenter: records.find(CostCenter, line.costCenter) }),
      ),
    );

    // Refusal order (errors.ts). Each line refusal carries the first line, from 1, that breaks it.
    // JournalEntryTooFewLines: exit 41, JE-001.
    if (lines.length < 2) {
      yield* Effect.logInfo(`the entry has ${lines.length} line(s), fewer than two`);
      return yield* new JournalEntryTooFewLines({});
    }

    // The four account and cost center checks, line by line. One that isn't there is no account of this company's.
    for (const [i, { account, costCenter }] of heads.entries()) {
      const line = BigInt(i + 1);
      // LineAccountNotInCompany: exit 42, JE-002.
      if (!account || account["company"] !== company) {
        yield* Effect.logInfo(`line ${line}'s account belongs to another company`);
        return yield* new LineAccountNotInCompany({ line });
      }
      // LineAccountIsGroup: exit 43, JE-003.
      if (account.state !== "ledger") {
        yield* Effect.logInfo(`line ${line}'s account is a group`);
        return yield* new LineAccountIsGroup({ line });
      }
      // LineCostCenterNotInCompany: exit 44, JE-004.
      if (!costCenter || costCenter["company"] !== company) {
        yield* Effect.logInfo(`line ${line}'s cost center belongs to another company`);
        return yield* new LineCostCenterNotInCompany({ line });
      }
      // LineCostCenterIsGroup: exit 45, JE-005.
      if (costCenter.state !== "ledger") {
        yield* Effect.logInfo(`line ${line}'s cost center is a group`);
        return yield* new LineCostCenterIsGroup({ line });
      }
    }

    // LineWithoutAmount: exit 46, JE-006. Over every line, before any is judged for carrying both.
    const without = lines.findIndex((l) => l.debit === 0n && l.credit === 0n);
    if (without >= 0) {
      yield* Effect.logInfo(`line ${without + 1} has neither a debit nor a credit`);
      return yield* new LineWithoutAmount({ line: BigInt(without + 1) });
    }

    // LineDebitAndCredit: exit 47, JE-007.
    const both = lines.findIndex((l) => l.debit > 0n && l.credit > 0n);
    if (both >= 0) {
      yield* Effect.logInfo(`line ${both + 1} has both a debit and a credit`);
      return yield* new LineDebitAndCredit({ line: BigInt(both + 1) });
    }

    // Step insert: database, in the store journal-entry, journal-entry-account, span journal-entry.create.insert. The
    // entry with its totals, then its lines numbered from 1 in the order given. A draft may be unbalanced.
    const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0n);
    const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0n);
    yield* steps.insert(
      Effect.gen(function* () {
        yield* records.insert(JournalEntry, { id, company, postingDate, userRemark, totalDebit, totalCredit });
        for (const [i, l] of lines.entries()) {
          const lineId = yield* Ids.of(JournalEntryAccount.fields.id);
          yield* records.insert(JournalEntryAccount, {
            id: lineId,
            journalEntry: id,
            line: BigInt(i + 1),
            account: l.account,
            costCenter: l.costCenter,
            debit: l.debit,
            credit: l.credit,
          });
        }
      }),
    );

    // The move create, to draft.
    yield* move();

    return {
      // JournalEntryDrafted needs journalEntry, and only the answer can give it.
      journalEntry: id,
      totalDebit,
      totalCredit,
    };
  });

export default create;
