// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// ERPNext's Journal Entry submit and cancel, and general_ledger.py (decisions/CX-ledger.md). Submit refuses
// JournalEntryUnbalanced (carrying debit less credit) before PostingDateOutsideFiscalYear, then posts one ledger line
// per line, unmerged. Cancel marks every line it posted cancelled and posts a reversal of each, debit and credit
// swapped, also marked cancelled; nothing is deleted, and a cancelled line counts in no balance.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { JournalEntryCancelled, JournalEntrySubmitted } from "../blueprint/things/journal-entry/events.ts";
import { JournalEntryUnbalanced, PostingDateOutsideFiscalYear } from "../blueprint/things/journal-entry/errors.ts";
import { machine as entries } from "../blueprint/things/journal-entry/machine.ts";
import draft from "../blueprint/things/journal-entry/verbs/create.ts";
import submit from "../blueprint/things/journal-entry/verbs/submit.ts";
import cancel from "../blueprint/things/journal-entry/verbs/cancel.ts";
import get from "../blueprint/things/journal-entry/verbs/get.ts";
import ledger from "../blueprint/things/gl-entry/verbs/list.ts";
import balance from "../blueprint/things/account/verbs/balance.ts";
import createYear from "../blueprint/things/fiscal-year/verbs/create.ts";
import createCostCenter from "../blueprint/things/cost-center/verbs/create.ts";
import getCostCenter from "../blueprint/things/cost-center/verbs/get.ts";

const USDC = 1_000_000n;
const CAPITAL = 10_000n * USDC;
type Gl = {
  readonly company: string; readonly account: string; readonly costCenter: string; readonly postingDate: string; readonly debit: bigint;
  readonly credit: bigint; readonly voucherType: string; readonly voucherId: string; readonly isCancelled: boolean;
};
const rows = (p: { readonly items: ReadonlyArray<Gl> }) =>
  p.items.map((i) => [i.company, i.account, i.costCenter, i.postingDate, i.debit, i.credit, i.voucherType, i.voucherId, i.isCancelled]);
const sums = (a: { readonly debit: bigint; readonly credit: bigint; readonly balance: bigint }) => [a.debit, a.credit, a.balance];

export default Blueprint.journey("post a journal entry", {
  // Acme Trading's chart and its fiscal year 2026, and a draft of its opening capital dated 15 January 2026: Bank
  // debited and Capital Stock credited 10,000 USDC, in Operations. Ada also runs Acme Logistics. Bo runs neither.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "a capital entry",
  steps: (s) => {
    const line = (account: unknown, debit: bigint, credit: bigint) => ({ account, costCenter: s.world.costCenter, debit, credit });
    const entry = (postingDate: string, ls: ReadonlyArray<ReturnType<typeof line>>) =>
      s.ada.run(draft, { company: s.world.company, postingDate, userRemark: "Rent", lines: ls } as never);
    const capitalLine = (account: unknown, debit: bigint, credit: bigint, isCancelled: boolean) =>
      [s.world.company, account, s.world.costCenter, "2026-01-15", debit, credit, "Journal Entry", s.world.journalEntry, isCancelled];
    return [
      s.step("Bo can't submit it", s.bo.run(submit, { journalEntry: s.world.journalEntry }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Ada can't cancel it while it is a draft",
        s.ada.run(cancel, { journalEntry: s.world.journalEntry }),
        refuses(entries.notFrom, { state: "draft" }),
        noEvents(),
        spans({ absent: ["journal-entry.cancel.reverse"] }),
      ),
      s.step(
        "a draft posts nothing: Bank's ledger is empty",
        s.ada.run(ledger, { account: s.world.bank }),
        expect((p) => p.items.length).toBe(0),
      ),
      s.step(
        "Ada submits it: two ledger lines",
        s.ada.run(submit, { journalEntry: s.world.journalEntry }),
        expect((a) => [a.journalEntry, a.posted]).toEqual([s.world.journalEntry, 2n]),
        emits(JournalEntrySubmitted, { journalEntry: s.world.journalEntry, posted: 2n }),
        entries.isIn(s.world.journalEntry, "submitted"),
        spans({ present: ["journal-entry.submit", "journal-entry.submit.load", "journal-entry.submit.post"] }),
      ),
      s.step(
        "it reads back submitted, as it was drafted",
        s.ada.run(get, { id: s.world.journalEntry }),
        expect((a) => [a.company, a.postingDate, a.userRemark, a.totalDebit, a.totalCredit, a.state]).toEqual([
          s.world.company, "2026-01-15", "Opening capital", CAPITAL, CAPITAL, "submitted",
        ]),
      ),
      s.step(
        "Bank's ledger holds its debit, posted by the entry, on its day, in its company and cost center",
        s.ada.run(ledger, { account: s.world.bank }),
        expect(rows).toEqual([capitalLine(s.world.bank, CAPITAL, 0n, false)]),
        noEvents(),
      ),
      s.step(
        "and Capital Stock's its credit",
        s.ada.run(ledger, { account: s.world.capital }),
        expect(rows).toEqual([capitalLine(s.world.capital, 0n, CAPITAL, false)]),
      ),
      s.step("Bo can't read Bank's ledger", s.bo.run(ledger, { account: s.world.bank }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "nor its balance",
        s.bo.run(balance, { account: s.world.bank, onDay: "2026-12-31" }),
        refuses(Blueprint.NotAllowed),
        noEvents(),
        spans({ absent: ["account.balance.sum"] }),
      ),
      s.step(
        "Bank's balance is the capital",
        s.ada.run(balance, { account: s.world.bank, onDay: "2026-12-31" }),
        expect(sums).toEqual([CAPITAL, 0n, CAPITAL]),
        noEvents(),
        spans({ present: ["account.balance", "account.balance.sum"] }),
      ),
      s.step(
        "Ada can't submit it twice",
        s.ada.run(submit, { journalEntry: s.world.journalEntry }),
        refuses(entries.notFrom, { state: "submitted" }),
        noEvents(),
        spans({ absent: ["journal-entry.submit.post"] }),
      ),
      s.step("Bo can't cancel it", s.bo.run(cancel, { journalEntry: s.world.journalEntry }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Ada cancels it: two reversing lines",
        s.ada.run(cancel, { journalEntry: s.world.journalEntry }),
        expect((a) => [a.journalEntry, a.reversed]).toEqual([s.world.journalEntry, 2n]),
        emits(JournalEntryCancelled, { journalEntry: s.world.journalEntry, reversed: 2n }),
        entries.isIn(s.world.journalEntry, "cancelled"),
        spans({ present: ["journal-entry.cancel", "journal-entry.cancel.load", "journal-entry.cancel.reverse"] }),
      ),
      s.step(
        "Bank's ledger keeps the debit and adds its reversal, a credit, both marked cancelled",
        s.ada.run(ledger, { account: s.world.bank }),
        expect(rows).toEqual([capitalLine(s.world.bank, CAPITAL, 0n, true), capitalLine(s.world.bank, 0n, CAPITAL, true)]),
      ),
      s.step(
        "Capital Stock's the same, the other way",
        s.ada.run(ledger, { account: s.world.capital }),
        expect(rows).toEqual([capitalLine(s.world.capital, 0n, CAPITAL, true), capitalLine(s.world.capital, CAPITAL, 0n, true)]),
      ),
      s.step("Bank's balance is nothing again", s.ada.run(balance, { account: s.world.bank, onDay: "2026-12-31" }), expect(sums).toEqual([0n, 0n, 0n])),
      s.step("and Capital Stock's", s.ada.run(balance, { account: s.world.capital, onDay: "2026-12-31" }), expect(sums).toEqual([0n, 0n, 0n])),
      s.step(
        "it reads back cancelled",
        s.ada.run(get, { id: s.world.journalEntry }),
        expect((a) => [a.totalDebit, a.totalCredit, a.state]).toEqual([CAPITAL, CAPITAL, "cancelled"]),
      ),
      s.step("it can't be cancelled twice", s.ada.run(cancel, { journalEntry: s.world.journalEntry }), refuses(entries.notFrom, { state: "cancelled" }), noEvents()),
      s.step("nor submitted again", s.ada.run(submit, { journalEntry: s.world.journalEntry }), refuses(entries.notFrom, { state: "cancelled" }), noEvents()),
      s.step(
        "Ada drafts an entry with more debit than credit, by 40 USDC",
        entry("2026-03-02", [line(s.world.rent, 100n * USDC, 0n), line(s.world.bank, 0n, 60n * USDC)]),
        entries.isIn(s.last.journalEntry, "draft"),
      ),
      s.step(
        "it can't be submitted, and carries the difference",
        s.ada.run(submit, { journalEntry: s.last.journalEntry }),
        refuses(JournalEntryUnbalanced, { difference: 40n * USDC }),
        noEvents(),
        spans({ absent: ["journal-entry.submit.post"] }),
      ),
      s.step(
        "it posted nothing",
        s.ada.run(ledger, { account: s.world.rent, voucherId: s.last.journalEntry }),
        expect((p) => p.items.length).toBe(0),
      ),
      s.step(
        "an entry with more credit than debit carries a negative difference",
        entry("2026-03-02", [line(s.world.rent, 60n * USDC, 0n), line(s.world.bank, 0n, 100n * USDC)]),
        entries.isIn(s.last.journalEntry, "draft"),
      ),
      s.step("so it can't be submitted either", s.ada.run(submit, { journalEntry: s.last.journalEntry }), refuses(JournalEntryUnbalanced, { difference: -40n * USDC })),
      s.step(
        "an entry out by one base unit is unbalanced",
        entry("2026-03-02", [line(s.world.rent, 100n * USDC + 1n, 0n), line(s.world.bank, 0n, 100n * USDC)]),
        entries.isIn(s.last.journalEntry, "draft"),
      ),
      s.step("and refused", s.ada.run(submit, { journalEntry: s.last.journalEntry }), refuses(JournalEntryUnbalanced, { difference: 1n })),
      s.step(
        "an unbalanced entry dated outside every fiscal year",
        entry("2027-03-02", [line(s.world.rent, 100n * USDC, 0n), line(s.world.bank, 0n, 60n * USDC)]),
        entries.isIn(s.last.journalEntry, "draft"),
      ),
      s.step("is refused for its balance first", s.ada.run(submit, { journalEntry: s.last.journalEntry }), refuses(JournalEntryUnbalanced, { difference: 40n * USDC })),
      s.step(
        "a balanced entry dated 31 December 2025, the day before 2026 starts",
        entry("2025-12-31", [line(s.world.rent, 50n * USDC, 0n), line(s.world.bank, 0n, 50n * USDC)]),
        entries.isIn(s.last.journalEntry, "draft"),
      ),
      s.step(
        "falls in no fiscal year of Acme Trading's",
        s.ada.run(submit, { journalEntry: s.last.journalEntry }),
        refuses(PostingDateOutsideFiscalYear, { postingDate: "2025-12-31" }),
        noEvents(),
        spans({ absent: ["journal-entry.submit.post"] }),
      ),
      s.step(
        "it is still a draft",
        s.ada.run(get, { id: s.last.journalEntry }),
        expect((a) => [a.postingDate, a.state]).toEqual(["2025-12-31", "draft"]),
      ),
      s.step(
        "one dated 1 January 2027, the day after it ends",
        entry("2027-01-01", [line(s.world.rent, 50n * USDC, 0n), line(s.world.bank, 0n, 50n * USDC)]),
        entries.isIn(s.last.journalEntry, "draft"),
      ),
      s.step("is refused too", s.ada.run(submit, { journalEntry: s.last.journalEntry }), refuses(PostingDateOutsideFiscalYear, { postingDate: "2027-01-01" })),
      s.step(
        "Acme Logistics sets up its own 2027",
        s.ada.run(createYear, { company: s.world.otherCompany, year: "2027", yearStartDate: "2027-01-01", yearEndDate: "2027-12-31", isShortYear: false }),
        expect((a) => a.fiscalYear).toMatch(/^fyr_/),
      ),
      s.step(
        "another company's year doesn't count: an Acme Trading entry dated in 2027",
        entry("2027-06-01", [line(s.world.rent, 50n * USDC, 0n), line(s.world.bank, 0n, 50n * USDC)]),
        entries.isIn(s.last.journalEntry, "draft"),
      ),
      s.step("is still refused", s.ada.run(submit, { journalEntry: s.last.journalEntry }), refuses(PostingDateOutsideFiscalYear, { postingDate: "2027-06-01" })),
      s.step(
        "Acme Trading sets up 2027 too",
        s.ada.run(createYear, { company: s.world.company, year: "2027", yearStartDate: "2027-01-01", yearEndDate: "2027-12-31", isShortYear: false }),
        expect((a) => a.fiscalYear).toMatch(/^fyr_/),
      ),
      s.step(
        "an entry dated in its second year",
        entry("2027-06-01", [line(s.world.rent, 50n * USDC, 0n), line(s.world.bank, 0n, 50n * USDC)]),
        entries.isIn(s.last.journalEntry, "draft"),
      ),
      s.step("is submitted", s.ada.run(submit, { journalEntry: s.last.journalEntry }), expect((a) => a.posted).toBe(2n), entries.isIn(s.last.journalEntry, "submitted")),
      s.step(
        "Acme Trading sets up a short year from April 2028 to February 2029, named for neither calendar year",
        s.ada.run(createYear, { company: s.world.company, year: "FY28", yearStartDate: "2028-04-01", yearEndDate: "2029-02-28", isShortYear: true }),
        expect((a) => a.fiscalYear).toMatch(/^fyr_/),
      ),
      s.step(
        "an entry on 1 February 2029, inside it",
        entry("2029-02-01", [line(s.world.rent, 10n * USDC, 0n), line(s.world.bank, 0n, 10n * USDC)]),
        entries.isIn(s.last.journalEntry, "draft"),
      ),
      s.step("is submitted: a short year counts", s.ada.run(submit, { journalEntry: s.last.journalEntry }), expect((a) => a.posted).toBe(2n)),
      s.step(
        "an entry on 2026's first day, three lines with two on Bank",
        entry("2026-01-01", [line(s.world.rent, 70n * USDC, 0n), line(s.world.bank, 0n, 30n * USDC), line(s.world.bank, 0n, 40n * USDC)]),
        entries.isIn(s.last.journalEntry, "draft"),
      ),
      s.step(
        "is submitted, posting three lines: the two on Bank are not merged",
        s.ada.run(submit, { journalEntry: s.last.journalEntry }),
        expect((a) => a.posted).toBe(3n),
        emits(JournalEntrySubmitted, { journalEntry: s.last.journalEntry, posted: 3n }),
      ),
      s.step(
        "Bank holds those two credits, apart",
        s.ada.run(ledger, { account: s.world.bank, voucherId: s.last.journalEntry }),
        expect((p) => p.items.map((i: Gl) => [i.postingDate, i.debit, i.credit, i.isCancelled])).toEqual([
          ["2026-01-01", 0n, 30n * USDC, false],
          ["2026-01-01", 0n, 40n * USDC, false],
        ]),
      ),
      s.step(
        "Ada adds a second ledger cost center under the root",
        s.ada.run(createCostCenter, { company: s.world.company, costCenterName: "Sales", parentCostCenter: s.world.mainCostCenter, isGroup: false }),
        expect((a) => a.costCenter).toMatch(/^cct_[0-9a-z]+$/),
      ),
      s.step(
        "an entry with Bank in Operations and Rent in the new cost center",
        s.ada.run(draft, {
          company: s.world.company,
          postingDate: "2026-06-01",
          userRemark: "Split",
          lines: [
            { account: s.world.bank, costCenter: s.world.costCenter, debit: 0n, credit: 20n * USDC },
            { account: s.world.rent, costCenter: s.last.costCenter, debit: 20n * USDC, credit: 0n },
          ],
        }),
        entries.isIn(s.last.journalEntry, "draft"),
      ),
      s.step("is submitted", s.ada.run(submit, { journalEntry: s.last.journalEntry }), expect((a) => a.posted).toBe(2n)),
      s.step(
        "Bank's line keeps Operations",
        s.ada.run(ledger, { account: s.world.bank, voucherId: s.last.journalEntry }),
        expect((p) => p.items.map((i: Gl) => [i.costCenter, i.credit])).toEqual([[s.world.costCenter, 20n * USDC]]),
      ),
      s.step(
        "Rent holds one line of that entry",
        s.ada.run(ledger, { account: s.world.rent, voucherId: s.last.items[0].voucherId }),
        expect((p) => p.items.map((i: Gl) => [i.debit, i.isCancelled])).toEqual([[20n * USDC, false]]),
      ),
      s.step(
        "Ada cancels it",
        s.ada.run(cancel, { journalEntry: s.last.items[0].voucherId }),
        expect((a) => a.reversed).toBe(2n),
      ),
      s.step(
        "Rent's line and its reversal are both cancelled, in the same cost center",
        s.ada.run(ledger, { account: s.world.rent, voucherId: s.last.journalEntry }),
        expect((p) => p.items.map((i: Gl) => [i.debit, i.credit, i.isCancelled])).toEqual([[20n * USDC, 0n, true], [0n, 20n * USDC, true]]),
        expect((p) => p.items[0].costCenter === p.items[1].costCenter).toBe(true),
      ),
      s.step(
        "and that cost center is the new one, not Bank's",
        s.ada.run(getCostCenter, { id: s.last.items[1].costCenter }),
        expect((a) => [a.company, a.costCenterName, a.state]).toEqual([s.world.company, "Sales", "ledger"]),
      ),
      s.step(
        "an entry on 2026's last day",
        entry("2026-12-31", [line(s.world.rent, 80n * USDC, 0n), line(s.world.bank, 0n, 80n * USDC)]),
        entries.isIn(s.last.journalEntry, "draft"),
      ),
      s.step("is submitted", s.ada.run(submit, { journalEntry: s.last.journalEntry }), expect((a) => a.posted).toBe(2n)),
      s.step(
        "Bank's balance at 2026's end counts both, and not the cancelled entries or 2027's rent",
        s.ada.run(balance, { account: s.world.bank, onDay: "2026-12-31" }),
        expect(sums).toEqual([0n, 150n * USDC, -150n * USDC]),
      ),
      s.step(
        "at 2027's end it counts 2027's rent too",
        s.ada.run(balance, { account: s.world.bank, onDay: "2027-12-31" }),
        expect(sums).toEqual([0n, 200n * USDC, -200n * USDC]),
      ),
      s.step(
        "Expenses, two groups above Rent, the same the other way",
        s.ada.run(balance, { account: s.world.expenses, onDay: "2027-12-31" }),
        expect(sums).toEqual([200n * USDC, 0n, 200n * USDC]),
      ),
      s.step(
        "Assets, above Bank, too",
        s.ada.run(balance, { account: s.world.assets, onDay: "2027-12-31" }),
        expect(sums).toEqual([0n, 200n * USDC, -200n * USDC]),
      ),
      s.step(
        "Equity, whose only lines were cancelled, holds nothing",
        s.ada.run(balance, { account: s.world.equity, onDay: "2027-12-31" }),
        expect(sums).toEqual([0n, 0n, 0n]),
      ),
    ];
  },
});
