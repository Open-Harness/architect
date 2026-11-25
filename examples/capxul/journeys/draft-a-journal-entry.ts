// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// ERPNext's Journal Entry `validate` (decisions/CX-ledger.md). Create refuses, in this order (journal-entry/errors.ts):
// JournalEntryTooFewLines; then line by line LineAccountNotInCompany, LineAccountIsGroup, LineCostCenterNotInCompany,
// LineCostCenterIsGroup; then LineWithoutAmount over every line; then LineDebitAndCredit over every line. A line refusal
// carries the first line, from 1, that breaks it. A draft may be unbalanced: balance is judged on submit.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { JournalEntryDrafted } from "../blueprint/things/journal-entry/events.ts";
import {
  JournalEntryTooFewLines,
  LineAccountIsGroup,
  LineAccountNotInCompany,
  LineCostCenterIsGroup,
  LineCostCenterNotInCompany,
  LineDebitAndCredit,
  LineWithoutAmount,
} from "../blueprint/things/journal-entry/errors.ts";
import { machine as entries } from "../blueprint/things/journal-entry/machine.ts";
import draft from "../blueprint/things/journal-entry/verbs/create.ts";
import get from "../blueprint/things/journal-entry/verbs/get.ts";
import lines from "../blueprint/things/journal-entry-account/verbs/list.ts";
import createAccount from "../blueprint/things/account/verbs/create.ts";
import createCostCenter from "../blueprint/things/cost-center/verbs/create.ts";

const USDC = 1_000_000n;
type Line = { readonly journalEntry: string; readonly line: bigint; readonly account: string; readonly costCenter: string; readonly debit: bigint; readonly credit: bigint };

export default Blueprint.journey("draft a journal entry", {
  // Acme Trading's chart (Assets > Bank, Equity > Capital Stock, Expenses > Operating Expenses > Rent; cost centers Acme
  // Trading > Operations) and its fiscal year 2026. Ada also runs Acme Logistics. Bo is signed in and runs neither.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "a fiscal year",
  steps: (s) => {
    const line = (account: unknown, debit: bigint, credit: bigint, costCenter: unknown = s.world.costCenter) => ({ account, costCenter, debit, credit });
    const entry = (ls: ReadonlyArray<ReturnType<typeof line>>, postingDate = "2026-03-02") =>
      s.ada.run(draft, { company: s.world.company, postingDate, userRemark: "March", lines: ls } as never);
    const pay = 250n * USDC;
    const good = line(s.world.bank, 0n, pay);
    return [
      s.step(
        "Bo can't draft an entry in Acme Trading",
        s.bo.run(draft, { company: s.world.company, postingDate: "2026-03-02", userRemark: "March", lines: [line(s.world.rent, pay, 0n), good] } as never),
        refuses(Blueprint.NotAllowed),
        noEvents(),
        spans({ absent: ["journal-entry.create", "journal-entry.create.insert"] }),
      ),
      s.step("an entry with no lines is refused", entry([]), refuses(JournalEntryTooFewLines), noEvents(), spans({ absent: ["journal-entry.create.insert"] })),
      s.step("so is one with one line", entry([line(s.world.rent, pay, 0n)]), refuses(JournalEntryTooFewLines)),
      s.step("even when that line is on a group: too few lines is judged first", entry([line(s.world.assets, pay, 0n)]), refuses(JournalEntryTooFewLines)),
      s.step(
        "a line on a group account is refused, naming it",
        entry([line(s.world.assets, pay, 0n), good]),
        refuses(LineAccountIsGroup, { line: 1n }),
        noEvents(),
        spans({ absent: ["journal-entry.create.insert"] }),
      ),
      s.step(
        "on the third line of three too",
        entry([line(s.world.rent, pay, 0n), good, line(s.world.expenses, 0n, 0n)]),
        refuses(LineAccountIsGroup, { line: 3n }),
      ),
      s.step(
        "a line in a group cost center is refused",
        entry([line(s.world.rent, pay, 0n), line(s.world.bank, 0n, pay, s.world.mainCostCenter)]),
        refuses(LineCostCenterIsGroup, { line: 2n }),
        noEvents(),
      ),
      s.step(
        "line by line: a group cost center on line 1 is refused before a group account on line 2",
        entry([line(s.world.rent, pay, 0n, s.world.mainCostCenter), line(s.world.assets, 0n, pay)]),
        refuses(LineCostCenterIsGroup, { line: 1n }),
      ),
      s.step(
        "and on one line, its group account before its group cost center",
        entry([line(s.world.rent, pay, 0n), line(s.world.equity, 0n, pay, s.world.mainCostCenter)]),
        refuses(LineAccountIsGroup, { line: 2n }),
      ),
      s.step(
        "a line with neither a debit nor a credit is refused",
        entry([line(s.world.rent, pay, 0n), line(s.world.bank, 0n, 0n)]),
        refuses(LineWithoutAmount, { line: 2n }),
        noEvents(),
      ),
      s.step(
        "but a group account on a later line is judged before it",
        entry([line(s.world.rent, 0n, 0n), line(s.world.operating, 0n, pay)]),
        refuses(LineAccountIsGroup, { line: 2n }),
      ),
      s.step(
        "a line with both a debit and a credit is refused",
        entry([line(s.world.rent, pay, pay), good]),
        refuses(LineDebitAndCredit, { line: 1n }),
        noEvents(),
      ),
      s.step(
        "a line with neither, after one with both, is refused for having neither",
        entry([line(s.world.rent, pay, pay), line(s.world.bank, 0n, 0n)]),
        refuses(LineWithoutAmount, { line: 2n }),
      ),
      s.step(
        "with two lines lacking an amount, the first is named",
        entry([line(s.world.rent, 0n, 0n), line(s.world.bank, 0n, pay), line(s.world.rent, 0n, 0n)]),
        refuses(LineWithoutAmount, { line: 1n }),
      ),
      s.step(
        "with two lines carrying both, the first is named",
        entry([line(s.world.rent, pay, pay), line(s.world.bank, pay, pay)]),
        refuses(LineDebitAndCredit, { line: 1n }),
      ),
      s.step(
        "a line carrying both is found on the last line too",
        entry([line(s.world.rent, pay, 0n), line(s.world.bank, pay, pay)]),
        refuses(LineDebitAndCredit, { line: 2n }),
      ),
      s.step(
        "Ada adds Acme Logistics' Assets group",
        s.ada.run(createAccount, { company: s.world.otherCompany, accountName: "Assets", isGroup: true, rootType: "Asset" }),
        expect((a) => a.account).toMatch(/^acc_/),
      ),
      s.step(
        "and its Bank ledger under it",
        s.ada.run(createAccount, { company: s.world.otherCompany, accountName: "Bank", parentAccount: s.last.account, isGroup: false, accountType: "Bank" }),
        expect((a) => a.account).toMatch(/^acc_/),
      ),
      s.step(
        "an Acme Trading entry on Acme Logistics' Bank is refused",
        entry([line(s.world.rent, pay, 0n), line(s.last.account, 0n, pay)]),
        refuses(LineAccountNotInCompany, { line: 2n }),
        noEvents(),
        spans({ absent: ["journal-entry.create.insert"] }),
      ),
      s.step(
        "it is judged before the line's group cost center",
        entry([line(s.world.rent, pay, 0n), line(s.last.account, 0n, pay, s.world.mainCostCenter)]),
        refuses(LineAccountNotInCompany, { line: 2n }),
      ),
      s.step(
        "but after an earlier line's group account",
        entry([line(s.world.assets, pay, 0n), line(s.last.account, 0n, pay)]),
        refuses(LineAccountIsGroup, { line: 1n }),
      ),
      s.step(
        "Ada adds a root cost center to her other company",
        s.ada.run(createCostCenter, { company: s.world.otherCompany, costCenterName: "Acme Logistics", isGroup: true }),
        expect((a) => a.costCenter).toMatch(/^cct_/),
      ),
      s.step(
        "and a ledger cost center under it",
        s.ada.run(createCostCenter, { company: s.world.otherCompany, costCenterName: "Operations", parentCostCenter: s.last.costCenter, isGroup: false }),
        expect((a) => a.costCenter).toMatch(/^cct_/),
      ),
      s.step(
        "an Acme Trading line in that other company's cost center is refused",
        entry([line(s.world.rent, pay, 0n), line(s.world.bank, 0n, pay, s.last.costCenter)]),
        refuses(LineCostCenterNotInCompany, { line: 2n }),
        noEvents(),
      ),
      s.step(
        "before a later line's group cost center",
        entry([line(s.world.rent, pay, 0n, s.last.costCenter), line(s.world.bank, 0n, pay, s.world.mainCostCenter)]),
        refuses(LineCostCenterNotInCompany, { line: 1n }),
      ),
      s.step(
        "and before a line's missing amount",
        entry([line(s.world.rent, 0n, 0n), line(s.world.bank, 0n, pay, s.last.costCenter)]),
        refuses(LineCostCenterNotInCompany, { line: 2n }),
      ),
      s.step(
        "on one line, a group account is judged before another company's cost center",
        entry([line(s.world.rent, pay, 0n), line(s.world.assets, 0n, pay, s.last.costCenter)]),
        refuses(LineAccountIsGroup, { line: 2n }),
      ),
      s.step(
        "Ada drafts an unbalanced entry: a draft may be",
        entry([line(s.world.rent, 300n * USDC, 0n), line(s.world.bank, 0n, 200n * USDC)]),
        expect((a) => [a.totalDebit, a.totalCredit]).toEqual([300n * USDC, 200n * USDC]),
        entries.isIn(s.last.journalEntry, "draft"),
      ),
      s.step(
        "it reads back as she typed it",
        s.ada.run(get, { id: s.last.journalEntry }),
        expect((a) => [a.company, a.postingDate, a.userRemark, a.totalDebit, a.totalCredit, a.state]).toEqual([
          s.world.company, "2026-03-02", "March", 300n * USDC, 200n * USDC, "draft",
        ]),
        noEvents(),
      ),
      s.step(
        "Ada drafts March's costs on three lines, two of them on Bank",
        entry([line(s.world.rent, 1_200n * USDC, 0n), line(s.world.bank, 0n, 1_000n * USDC), line(s.world.bank, 0n, 200n * USDC)], "2026-03-31"),
        expect((a) => a.journalEntry).toMatch(/^jen_[0-9a-z]+$/),
        expect((a) => [a.totalDebit, a.totalCredit]).toEqual([1_200n * USDC, 1_200n * USDC]),
        emits(JournalEntryDrafted, { journalEntry: s.last.journalEntry, company: s.world.company, totalDebit: 1_200n * USDC, totalCredit: 1_200n * USDC }),
        entries.isIn(s.last.journalEntry, "draft"),
        spans({ present: ["journal-entry.create", "journal-entry.create.load", "journal-entry.create.insert"] }),
      ),
      s.step("Bo can't read it", s.bo.run(get, { id: s.last.journalEntry }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor its lines", s.bo.run(lines, { journalEntry: s.last.journalEntry }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "its lines read back in the order given, numbered from 1",
        s.ada.run(lines, { journalEntry: s.last.journalEntry }),
        expect((p) => p.items.map((i: Line) => [i.line, i.account, i.costCenter, i.debit, i.credit])).toEqual([
          [1n, s.world.rent, s.world.costCenter, 1_200n * USDC, 0n],
          [2n, s.world.bank, s.world.costCenter, 0n, 1_000n * USDC],
          [3n, s.world.bank, s.world.costCenter, 0n, 200n * USDC],
        ]),
        noEvents(),
      ),
    ];
  },
});
