// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// Goal 16's payroll finish line, end to end (decisions/CX-payroll.md): components and a structure, assigned to two
// employees, paid for March 2026 by one payroll entry, whose salary slips are booked by one accrual journal entry,
// read back through 7a's journal entry, ledger and balances.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { PayrollEntryDrafted, PayrollEntrySubmitted, SalarySlipsSubmitted } from "../blueprint/things/payroll-entry/events.ts";
import { SalaryStructureDrafted } from "../blueprint/things/salary-structure/events.ts";
import { StructureInUse } from "../blueprint/things/salary-structure/errors.ts";
import { machine as journalMachine } from "../blueprint/things/journal-entry/machine.ts";
import { machine as entries } from "../blueprint/things/payroll-entry/machine.ts";
import { machine as structures } from "../blueprint/things/salary-structure/machine.ts";
import createComponent from "../blueprint/things/salary-component/verbs/create.ts";
import createStructure from "../blueprint/things/salary-structure/verbs/create.ts";
import submitStructure from "../blueprint/things/salary-structure/verbs/submit.ts";
import cancelStructure from "../blueprint/things/salary-structure/verbs/cancel.ts";
import structureLines from "../blueprint/things/salary-detail/verbs/list.ts";
import assign from "../blueprint/things/salary-structure-assignment/verbs/create.ts";
import submitAssignment from "../blueprint/things/salary-structure-assignment/verbs/submit.ts";
import createPeriod from "../blueprint/things/payroll-period/verbs/create.ts";
import draftPayroll from "../blueprint/things/payroll-entry/verbs/create.ts";
import submitPayroll from "../blueprint/things/payroll-entry/verbs/submit.ts";
import submitSlips from "../blueprint/things/payroll-entry/verbs/submit-slips.ts";
import getPayroll from "../blueprint/things/payroll-entry/verbs/get.ts";
import payrollEmployees from "../blueprint/things/payroll-employee-detail/verbs/list.ts";
import slipList from "../blueprint/things/salary-slip/verbs/list.ts";
import getSlip from "../blueprint/things/salary-slip/verbs/get.ts";
import slipLines from "../blueprint/things/salary-slip-detail/verbs/list.ts";
import getEntry from "../blueprint/things/journal-entry/verbs/get.ts";
import entryLines from "../blueprint/things/journal-entry-account/verbs/list.ts";
import ledger from "../blueprint/things/gl-entry/verbs/list.ts";
import balance from "../blueprint/things/account/verbs/balance.ts";

const USDC = 1_000_000n;
type Line = { readonly type: string; readonly line: bigint; readonly salaryComponent: string; readonly amount: bigint };
const lines = (p: { readonly items: ReadonlyArray<Line> }) => p.items.map((i) => [i.type, i.line, i.salaryComponent, i.amount]);
type Slip = {
  readonly company: string; readonly employee: string; readonly postingDate: string; readonly startDate: string; readonly endDate: string;
  readonly grossPay: bigint; readonly totalDeduction: bigint; readonly netPay: bigint; readonly status: string;
};
const slips = (p: { readonly items: ReadonlyArray<Slip> }) =>
  p.items.map((i) => [i.company, i.employee, i.postingDate, i.startDate, i.endDate, i.grossPay, i.totalDeduction, i.netPay, i.status]);
type Jl = { readonly line: bigint; readonly account: string; readonly costCenter: string; readonly debit: bigint; readonly credit: bigint };
const jls = (p: { readonly items: ReadonlyArray<Jl> }) => p.items.map((i) => [i.line, i.account, i.costCenter, i.debit, i.credit]);
type Gl = {
  readonly company: string; readonly account: string; readonly costCenter: string; readonly postingDate: string; readonly debit: bigint;
  readonly credit: bigint; readonly voucherType: string; readonly isCancelled: boolean;
};
// The voucher is pinned by reading the ledger narrowed to the slip's journal entry: a line of any other voucher isn't listed.
const gl = (p: { readonly items: ReadonlyArray<Gl> }) =>
  p.items.map((i) => [i.company, i.account, i.costCenter, i.postingDate, i.debit, i.credit, i.voucherType, i.isCancelled]);
const sums = (a: { readonly debit: bigint; readonly credit: bigint; readonly balance: bigint }) => [a.debit, a.credit, a.balance];

export default Blueprint.journey("pay a month", {
  // Acme Trading's chart, with Salaries under Operating Expenses and Payroll Payable and Pension Payable under
  // Liabilities, its cost center Operations and its fiscal year 2026; Olga joined on 5 January 2026 and Cy on 12
  // January; its components Basic (3,000 USDC), Housing (no default) and Pension (150 USDC). Bo runs neither company.
  cast: { ada: owner, olga: Blueprint.signedIn, cy: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a pension component",
  steps: (s) => {
    const slipRow = (employee: unknown, status: string) =>
      [s.world.company, employee, "2026-03-31", "2026-03-01", "2026-03-31", 3_500n * USDC, 150n * USDC, 3_350n * USDC, status];
    const accrual = (account: unknown, debit: bigint, credit: bigint) =>
      [s.world.company, account, s.world.costCenter, "2026-03-31", debit, credit, "Journal Entry", false];
    return [
      s.step(
        "Ada drafts the engineers' structure: Basic and Pension at their own amounts, Housing at 500 USDC",
        s.ada.run(createStructure, {
          company: s.world.company,
          salaryStructureName: "Engineers",
          earnings: [{ salaryComponent: s.world.basic, amount: 0n }, { salaryComponent: s.world.housing, amount: 500n * USDC }],
          deductions: [{ salaryComponent: s.world.pensionComponent, amount: 0n }],
        } as never),
        expect((a) => [a.totalEarning, a.totalDeduction, a.netPay]).toEqual([3_500n * USDC, 150n * USDC, 3_350n * USDC]),
        emits(SalaryStructureDrafted, { company: s.world.company, netPay: 3_350n * USDC }),
        structures.isIn(s.last.salaryStructure, "draft"),
      ),
      s.step(
        "its lines carry what they pay, each table numbered from 1",
        s.ada.run(structureLines, { salaryStructure: s.last.salaryStructure }),
        expect(lines).toEqual([
          ["Earning", 1n, s.world.basic, 3_000n * USDC],
          ["Earning", 2n, s.world.housing, 500n * USDC],
          ["Deduction", 1n, s.world.pensionComponent, 150n * USDC],
        ]),
      ),
      s.step("Bo can't read them", s.bo.run(structureLines, { salaryStructure: s.last.items[0].salaryStructure }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("Ada submits it", s.ada.run(submitStructure, { salaryStructure: s.last.items[0].salaryStructure }), structures.isIn(s.last.salaryStructure, "submitted")),
      s.step(
        "she assigns it to Olga from her joining day",
        s.ada.run(assign, { company: s.world.company, employee: s.world.employee, salaryStructure: s.last.salaryStructure, fromDate: "2026-01-05" }),
      ),
      s.step("and submits it", s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment }), expect((a) => a.employee).toBe(s.world.employee)),
      s.step(
        "she assigns it to Cy from his",
        s.ada.run(assign, { company: s.world.company, employee: s.world.secondEmployee, salaryStructure: s.last.salaryStructure, fromDate: "2026-01-12" }),
      ),
      s.step("and submits that", s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment }), expect((a) => a.employee).toBe(s.world.secondEmployee)),
      s.step(
        "a structure an assignment uses can't be cancelled",
        s.ada.run(cancelStructure, { salaryStructure: s.last.salaryStructure }),
        refuses(StructureInUse),
        noEvents(),
        spans({ absent: ["salary-structure.cancel.update"] }),
      ),
      s.step(
        "Ada sets up the payroll period 2026",
        s.ada.run(createPeriod, { company: s.world.company, payrollPeriodName: "2026", startDate: "2026-01-01", endDate: "2026-12-31" }),
      ),
      s.step(
        "she drafts March's payroll: both employees",
        s.ada.run(draftPayroll, {
          company: s.world.company, postingDate: "2026-03-31", startDate: "2026-03-01", endDate: "2026-03-31",
          costCenter: s.world.costCenter, payrollPayableAccount: s.world.payable,
        }),
        expect((a) => a.numberOfEmployees).toBe(2n),
        emits(PayrollEntryDrafted, { company: s.world.company, numberOfEmployees: 2n }),
        entries.isIn(s.last.payrollEntry, "draft"),
        spans({ present: ["payroll-entry.create", "payroll-entry.create.load", "payroll-entry.create.insert"] }),
      ),
      s.step("Bo can't read it", s.bo.run(getPayroll, { id: s.last.payrollEntry }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "it holds Olga, then Cy, in the order they were hired",
        s.ada.run(payrollEmployees, { payrollEntry: s.last.payrollEntry }),
        expect((p) => p.items.map((i: { employee: string }) => i.employee)).toEqual([s.world.employee, s.world.secondEmployee]),
      ),
      s.step(
        "Ada submits it: a draft slip for each",
        s.ada.run(submitPayroll, { payrollEntry: s.last.items[0].payrollEntry }),
        expect((a) => a.slips).toBe(2n),
        emits(PayrollEntrySubmitted, { slips: 2n }),
        entries.isIn(s.last.payrollEntry, "submitted"),
        spans({ present: ["payroll-entry.submit", "payroll-entry.submit.load", "payroll-entry.submit.slips"] }),
      ),
      s.step(
        "it reads back submitted, as it was drafted",
        s.ada.run(getPayroll, { id: s.last.payrollEntry }),
        expect((a) => [a.company, a.postingDate, a.startDate, a.endDate, a.costCenter, a.payrollPayableAccount, a.numberOfEmployees, a.state]).toEqual([
          s.world.company, "2026-03-31", "2026-03-01", "2026-03-31", s.world.costCenter, s.world.payable, 2n, "submitted",
        ]),
      ),
      s.step("Cy's slip pays March's 3,350 USDC net, a draft", s.ada.run(slipList, { employee: s.world.secondEmployee }), expect(slips).toEqual([slipRow(s.world.secondEmployee, "Draft")])),
      s.step(
        "it is paid by the engineers' structure, whose lines it copies",
        s.ada.run(structureLines, { salaryStructure: s.last.items[0].salaryStructure }),
        expect(lines).toEqual([
          ["Earning", 1n, s.world.basic, 3_000n * USDC],
          ["Earning", 2n, s.world.housing, 500n * USDC],
          ["Deduction", 1n, s.world.pensionComponent, 150n * USDC],
        ]),
      ),
      s.step("Olga's slip the same", s.ada.run(slipList, { employee: s.world.employee }), expect(slips).toEqual([slipRow(s.world.employee, "Draft")])),
      s.step(
        "its lines are its structure's, earnings then deductions",
        s.ada.run(slipLines, { salarySlip: s.last.items[0].id }),
        expect(lines).toEqual([
          ["Earning", 1n, s.world.basic, 3_000n * USDC],
          ["Earning", 2n, s.world.housing, 500n * USDC],
          ["Deduction", 1n, s.world.pensionComponent, 150n * USDC],
        ]),
      ),
      s.step("Cy can't read Olga's slip", s.cy.run(getSlip, { id: s.last.items[0].salarySlip }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor its lines", s.cy.run(slipLines, { salarySlip: s.last.items[0].salarySlip }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor Bo", s.bo.run(getSlip, { id: s.last.items[0].salarySlip }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Olga reads her own: a draft, booked to no journal entry yet",
        s.olga.run(getSlip, { id: s.last.items[0].salarySlip }),
        expect((a) => [a.company, a.employee, a.status, a.netPay, a.journalEntry === undefined]).toEqual([s.world.company, s.world.employee, "Draft", 3_350n * USDC, true]),
      ),
      s.step("Bo can't submit the slips", s.bo.run(submitSlips, { payrollEntry: s.last.payrollEntry }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Ada submits them: one accrual journal entry, submitted",
        s.ada.run(submitSlips, { payrollEntry: s.last.payrollEntry }),
        expect((a) => a.slips).toBe(2n),
        emits(SalarySlipsSubmitted, { slips: 2n }),
        entries.isIn(s.last.payrollEntry, "accrued"),
        journalMachine.isIn(s.last.journalEntry, "submitted"),
        spans({ present: ["payroll-entry.submit-slips", "payroll-entry.submit-slips.load", "payroll-entry.submit-slips.accrue"] }),
      ),
      s.step(
        "its lines: Salaries debited 7,000, Pension Payable credited 300, Payroll Payable the 6,700 net, all in Operations",
        s.ada.run(entryLines, { journalEntry: s.last.journalEntry }),
        expect(jls).toEqual([
          [1n, s.world.salaries, s.world.costCenter, 7_000n * USDC, 0n],
          [2n, s.world.pension, s.world.costCenter, 0n, 300n * USDC],
          [3n, s.world.payable, s.world.costCenter, 0n, 6_700n * USDC],
        ]),
      ),
      s.step(
        "it reads back as HRMS writes it",
        s.ada.run(getEntry, { id: s.last.items[0].journalEntry }),
        expect((a) => [a.company, a.postingDate, a.userRemark, a.totalDebit, a.totalCredit, a.state]).toEqual([
          s.world.company, "2026-03-31", "Accrual Journal Entry for salaries from 2026-03-01 to 2026-03-31", 7_000n * USDC, 7_000n * USDC, "submitted",
        ]),
      ),
      s.step("Olga's slip is submitted now", s.ada.run(slipList, { employee: s.world.employee }), expect(slips).toEqual([slipRow(s.world.employee, "Submitted")])),
      s.step(
        "and names the journal entry, whose ledger line on Salaries is the debit",
        s.ada.run(ledger, { account: s.world.salaries, voucherId: s.last.items[0].journalEntry }),
        expect(gl).toEqual([accrual(s.world.salaries, 7_000n * USDC, 0n)]),
      ),
      s.step("on Pension Payable the credit", s.ada.run(ledger, { account: s.world.pension, voucherId: s.last.items[0].voucherId }), expect(gl).toEqual([accrual(s.world.pension, 0n, 300n * USDC)])),
      s.step("on Payroll Payable the net", s.ada.run(ledger, { account: s.world.payable, voucherId: s.last.items[0].voucherId }), expect(gl).toEqual([accrual(s.world.payable, 0n, 6_700n * USDC)])),
      s.step("Cy's slip names it too", s.ada.run(slipList, { employee: s.world.secondEmployee }), expect(slips).toEqual([slipRow(s.world.secondEmployee, "Submitted")])),
      s.step("and Payroll Payable has one ledger line from the entry it names", s.ada.run(ledger, { account: s.world.payable, voucherId: s.last.items[0].journalEntry }), expect((p) => p.items.length).toBe(1)),
      s.step("Salaries holds the month's pay", s.ada.run(balance, { account: s.world.salaries, onDay: "2026-03-31" }), expect(sums).toEqual([7_000n * USDC, 0n, 7_000n * USDC]), noEvents()),
      s.step("not the day before", s.ada.run(balance, { account: s.world.salaries, onDay: "2026-03-30" }), expect(sums).toEqual([0n, 0n, 0n])),
      s.step("Expenses, two groups above, holds it too", s.ada.run(balance, { account: s.world.expenses, onDay: "2026-12-31" }), expect(sums).toEqual([7_000n * USDC, 0n, 7_000n * USDC])),
      s.step("Pension Payable owes the pension", s.ada.run(balance, { account: s.world.pension, onDay: "2026-12-31" }), expect(sums).toEqual([0n, 300n * USDC, -300n * USDC])),
      s.step("Payroll Payable owes the net pay", s.ada.run(balance, { account: s.world.payable, onDay: "2026-12-31" }), expect(sums).toEqual([0n, 6_700n * USDC, -6_700n * USDC])),
      s.step("Liabilities owes both", s.ada.run(balance, { account: s.world.liabilities, onDay: "2026-12-31" }), expect(sums).toEqual([0n, 7_000n * USDC, -7_000n * USDC])),
    ];
  },
});
