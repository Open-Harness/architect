import { Blueprint } from "orthograph";
import { Schema } from "effect";
import { JournalEntry } from "../thing.ts";
import { machine } from "../machine.ts";
import {
  JournalEntryTooFewLines,
  LineAccountIsGroup,
  LineAccountNotInCompany,
  LineCostCenterIsGroup,
  LineCostCenterNotInCompany,
  LineDebitAndCredit,
  LineWithoutAmount,
} from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { JournalEntryAccount } from "../../journal-entry-account/thing.ts";

/** One line as the owner types it: an account, a cost center, and a debit or a credit in USDC base units (0 for none). */
const Line = Schema.Struct({
  account: JournalEntryAccount.fields.account.value.schema,
  costCenter: JournalEntryAccount.fields.costCenter.value.schema,
  debit: JournalEntryAccount.fields.debit.value.schema,
  credit: JournalEntryAccount.fields.credit.value.schema,
});

// Refusal order (errors.ts). The entry and every line are written together, the lines numbered from 1 in the order
// given; the totals are the lines' sums. Balance is judged on submit, as in ERPNext, so a draft may be unbalanced.
export default Blueprint.operation(JournalEntry, {
  description: "Draft a journal entry with its lines.",
  payload: {
    company: JournalEntry.fields.company,
    postingDate: JournalEntry.fields.postingDate,
    userRemark: JournalEntry.fields.userRemark,
    lines: Blueprint.described(
      Blueprint.value(Schema.Array(Line).check(Schema.isMaxLength(50))),
      "Its lines, in order: each an account, a cost center, and a debit or a credit. At most 50.",
    ),
  },
  answer: { journalEntry: JournalEntry.fields.id, totalDebit: JournalEntry.fields.totalDebit, totalCredit: JournalEntry.fields.totalCredit },
  move: machine.moves.create,
  errors: [
    JournalEntryTooFewLines,
    LineAccountNotInCompany,
    LineAccountIsGroup,
    LineCostCenterNotInCompany,
    LineCostCenterIsGroup,
    LineWithoutAmount,
    LineDebitAndCredit,
  ],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database({ writes: [JournalEntry, JournalEntryAccount] }) },
  idempotent: "request",
  budget: { p95: "200 millis" },
});
