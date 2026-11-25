// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// End to end (decisions/CX-ledger.md): a fiscal year, three entries posted, balances read on several days and up the
// tree, one entry cancelled, and the balances read again. Every amount is USDC in base units (1 USDC is 1000000n).
// A read's answer carries no entry id, so the rent entry is cancelled by the voucher id its own ledger line carries.
// Nothing here moves the clock.
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { FiscalYearCreated } from "../blueprint/things/fiscal-year/events.ts";
import { JournalEntryCancelled, JournalEntryDrafted, JournalEntrySubmitted } from "../blueprint/things/journal-entry/events.ts";
import { machine as entries } from "../blueprint/things/journal-entry/machine.ts";
import { machine as years } from "../blueprint/things/fiscal-year/machine.ts";
import createYear from "../blueprint/things/fiscal-year/verbs/create.ts";
import draft from "../blueprint/things/journal-entry/verbs/create.ts";
import submit from "../blueprint/things/journal-entry/verbs/submit.ts";
import cancel from "../blueprint/things/journal-entry/verbs/cancel.ts";
import balance from "../blueprint/things/account/verbs/balance.ts";
import ledger from "../blueprint/things/gl-entry/verbs/list.ts";
import createAccount from "../blueprint/things/account/verbs/create.ts";

const USDC = 1_000_000n;
type Gl = { readonly account: string; readonly costCenter: string; readonly postingDate: string; readonly debit: bigint; readonly credit: bigint; readonly voucherType: string; readonly isCancelled: boolean };
/** A page of ledger lines as [account, cost center, day, debit, credit, voucher type, cancelled], in the order listed. */
const lines = (p: { readonly items: ReadonlyArray<Gl> }) => p.items.map((i) => [i.account, i.costCenter, i.postingDate, i.debit, i.credit, i.voucherType, i.isCancelled]);
const sums = (a: { readonly debit: bigint; readonly credit: bigint; readonly balance: bigint }) => [a.debit, a.credit, a.balance];

export default Blueprint.journey("keep the books", {
  // Acme Trading's chart: Assets > Bank, Equity > Capital Stock, Expenses > Operating Expenses > Rent, and the cost
  // centers Acme Trading > Operations. It has no fiscal year yet.
  cast: { ada: owner },
  starts: "a chart",
  steps: (s) => [
    s.step(
      "Ada sets up the fiscal year 2026",
      s.ada.run(createYear, { company: s.world.company, year: "2026", yearStartDate: "2026-01-01", yearEndDate: "2026-12-31", isShortYear: false }),
      expect((a) => a.fiscalYear).toMatch(/^fyr_[0-9a-z]+$/),
      emits(FiscalYearCreated, { fiscalYear: s.last.fiscalYear, company: s.world.company, yearStartDate: "2026-01-01", yearEndDate: "2026-12-31" }),
      years.isIn(s.last.fiscalYear, "active"),
    ),
    s.step(
      "she drafts the opening capital on 15 January: Bank debited, Capital Stock credited, 10,000 USDC",
      s.ada.run(draft, {
        company: s.world.company,
        postingDate: "2026-01-15",
        userRemark: "Opening capital",
        lines: [
          { account: s.world.bank, costCenter: s.world.costCenter, debit: 10_000n * USDC, credit: 0n },
          { account: s.world.capital, costCenter: s.world.costCenter, debit: 0n, credit: 10_000n * USDC },
        ],
      }),
      expect((a) => [a.totalDebit, a.totalCredit]).toEqual([10_000n * USDC, 10_000n * USDC]),
      expect((a) => a.journalEntry).toMatch(/^jen_[0-9a-z]+$/),
      emits(JournalEntryDrafted, { journalEntry: s.last.journalEntry, company: s.world.company, totalDebit: 10_000n * USDC, totalCredit: 10_000n * USDC }),
      entries.isIn(s.last.journalEntry, "draft"),
    ),
    s.step(
      "and submits it, posting two ledger lines",
      s.ada.run(submit, { journalEntry: s.last.journalEntry }),
      expect((a) => a.posted).toBe(2n),
      emits(JournalEntrySubmitted, { journalEntry: s.last.journalEntry, posted: 2n }),
      entries.isIn(s.last.journalEntry, "submitted"),
    ),
    s.step(
      "she drafts February's rent on 1 February: Rent debited, Bank credited, 1,500 USDC",
      s.ada.run(draft, {
        company: s.world.company,
        postingDate: "2026-02-01",
        userRemark: "February rent",
        lines: [
          { account: s.world.rent, costCenter: s.world.costCenter, debit: 1_500n * USDC, credit: 0n },
          { account: s.world.bank, costCenter: s.world.costCenter, debit: 0n, credit: 1_500n * USDC },
        ],
      }),
      expect((a) => [a.totalDebit, a.totalCredit]).toEqual([1_500n * USDC, 1_500n * USDC]),
    ),
    s.step(
      "and submits it",
      s.ada.run(submit, { journalEntry: s.last.journalEntry }),
      expect((a) => a.posted).toBe(2n),
      entries.isIn(s.last.journalEntry, "submitted"),
    ),
    s.step(
      "Bank's balance at the year's end: 10,000 in, 1,500 out",
      s.ada.run(balance, { account: s.world.bank, onDay: "2026-12-31" }),
      expect((a) => [a.account, ...sums(a)]).toEqual([s.world.bank, 10_000n * USDC, 1_500n * USDC, 8_500n * USDC]),
      noEvents(),
    ),
    s.step(
      "Assets, the group above it, holds the same",
      s.ada.run(balance, { account: s.world.assets, onDay: "2026-12-31" }),
      expect((a) => [a.account, ...sums(a)]).toEqual([s.world.assets, 10_000n * USDC, 1_500n * USDC, 8_500n * USDC]),
    ),
    s.step(
      "Expenses, two groups above Rent, holds the rent",
      s.ada.run(balance, { account: s.world.expenses, onDay: "2026-12-31" }),
      expect((a) => sums(a)).toEqual([1_500n * USDC, 0n, 1_500n * USDC]),
    ),
    s.step(
      "and so does Operating Expenses, between them",
      s.ada.run(balance, { account: s.world.operating, onDay: "2026-12-31" }),
      expect((a) => sums(a)).toEqual([1_500n * USDC, 0n, 1_500n * USDC]),
    ),
    s.step(
      "Capital Stock is in credit, so its balance is negative",
      s.ada.run(balance, { account: s.world.capital, onDay: "2026-12-31" }),
      expect((a) => sums(a)).toEqual([0n, 10_000n * USDC, -10_000n * USDC]),
    ),
    s.step(
      "and Equity above it the same",
      s.ada.run(balance, { account: s.world.equity, onDay: "2026-12-31" }),
      expect((a) => sums(a)).toEqual([0n, 10_000n * USDC, -10_000n * USDC]),
    ),
    s.step(
      "Ada adds a second ledger under Assets, beside Bank",
      s.ada.run(createAccount, { company: s.world.company, accountName: "Float", parentAccount: s.world.assets, isGroup: false }),
      expect((a) => a.account).toMatch(/^acc_[0-9a-z]+$/),
    ),
    s.step(
      "she moves 200 USDC of capital into it on 20 January",
      s.ada.run(draft, {
        company: s.world.company,
        postingDate: "2026-01-20",
        userRemark: "Float",
        lines: [
          { account: s.last.account, costCenter: s.world.costCenter, debit: 200n * USDC, credit: 0n },
          { account: s.world.capital, costCenter: s.world.costCenter, debit: 0n, credit: 200n * USDC },
        ],
      }),
      expect((a) => [a.totalDebit, a.totalCredit]).toEqual([200n * USDC, 200n * USDC]),
    ),
    s.step("and submits it", s.ada.run(submit, { journalEntry: s.last.journalEntry }), expect((a) => a.posted).toBe(2n)),
    s.step(
      "Assets now holds both its ledgers, read again after the new one was added",
      s.ada.run(balance, { account: s.world.assets, onDay: "2026-12-31" }),
      expect((a) => sums(a)).toEqual([10_200n * USDC, 1_500n * USDC, 8_700n * USDC]),
    ),
    s.step(
      "Assets on 14 January, before any entry, holds nothing: the day limit holds below the group too",
      s.ada.run(balance, { account: s.world.assets, onDay: "2026-01-14" }),
      expect((a) => sums(a)).toEqual([0n, 0n, 0n]),
    ),
    s.step(
      "Expenses on 31 January, before the rent, holds nothing",
      s.ada.run(balance, { account: s.world.expenses, onDay: "2026-01-31" }),
      expect((a) => sums(a)).toEqual([0n, 0n, 0n]),
    ),
    s.step(
      "Bank on the rent's own day counts the rent",
      s.ada.run(balance, { account: s.world.bank, onDay: "2026-02-01" }),
      expect((a) => sums(a)).toEqual([10_000n * USDC, 1_500n * USDC, 8_500n * USDC]),
    ),
    s.step(
      "the day before, it doesn't",
      s.ada.run(balance, { account: s.world.bank, onDay: "2026-01-31" }),
      expect((a) => sums(a)).toEqual([10_000n * USDC, 0n, 10_000n * USDC]),
    ),
    s.step(
      "on the capital's own day it counts the capital",
      s.ada.run(balance, { account: s.world.bank, onDay: "2026-01-15" }),
      expect((a) => sums(a)).toEqual([10_000n * USDC, 0n, 10_000n * USDC]),
    ),
    s.step(
      "and the day before that, nothing",
      s.ada.run(balance, { account: s.world.bank, onDay: "2026-01-14" }),
      expect((a) => sums(a)).toEqual([0n, 0n, 0n]),
    ),
    s.step(
      "Rent's ledger holds one line, the rent's, posted by a journal entry",
      s.ada.run(ledger, { account: s.world.rent }),
      expect((p) => lines(p)).toEqual([[s.world.rent, s.world.costCenter, "2026-02-01", 1_500n * USDC, 0n, "Journal Entry", false]]),
      expect((p) => p.items[0].voucherId).toMatch(/^jen_[0-9a-z]+$/),
    ),
    s.step(
      "Ada cancels the rent entry, the voucher that line names: two reversing lines",
      s.ada.run(cancel, { journalEntry: s.last.items[0].voucherId }),
      expect((a) => a.reversed).toBe(2n),
      emits(JournalEntryCancelled, { journalEntry: s.last.journalEntry, reversed: 2n }),
      entries.isIn(s.last.journalEntry, "cancelled"),
    ),
    s.step(
      "Rent's ledger keeps the line and its reversal, both marked cancelled",
      s.ada.run(ledger, { account: s.world.rent }),
      expect((p) => lines(p)).toEqual([
        [s.world.rent, s.world.costCenter, "2026-02-01", 1_500n * USDC, 0n, "Journal Entry", true],
        [s.world.rent, s.world.costCenter, "2026-02-01", 0n, 1_500n * USDC, "Journal Entry", true],
      ]),
    ),
    s.step(
      "Bank's balance is the capital alone again",
      s.ada.run(balance, { account: s.world.bank, onDay: "2026-12-31" }),
      expect((a) => sums(a)).toEqual([10_000n * USDC, 0n, 10_000n * USDC]),
    ),
    s.step(
      "Assets holds the capital in both its ledgers",
      s.ada.run(balance, { account: s.world.assets, onDay: "2026-12-31" }),
      expect((a) => sums(a)).toEqual([10_200n * USDC, 0n, 10_200n * USDC]),
    ),
    s.step(
      "Expenses holds nothing",
      s.ada.run(balance, { account: s.world.expenses, onDay: "2026-12-31" }),
      expect((a) => sums(a)).toEqual([0n, 0n, 0n]),
    ),
    s.step(
      "and Capital Stock keeps the capital the cancel left alone",
      s.ada.run(balance, { account: s.world.capital, onDay: "2026-12-31" }),
      expect((a) => sums(a)).toEqual([0n, 10_200n * USDC, -10_200n * USDC]),
    ),
  ],
});
