// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// HRMS's Payroll Entry, Payroll Employee Detail and Salary Slip (decisions/CX-payroll.md).
// `create` refuses PayrollEndsBeforeStart; PayableAccountNotInCompany, PayableAccountIsGroup, PayableAccountHasType;
// PayrollCostCenterNotInCompany, PayrollCostCenterIsGroup; then NoEmployeesFound. It fills in each employee of the
// company still at work, joined by the last day, with a submitted assignment starting by the last day and no submitted
// slip for these very days. `submit` refuses SalarySlipExists over every employee, then NoAssignmentAtStart, and makes a
// draft slip each; a leaver since the draft is still paid. `submit-slips` refuses AccrualOutsideFiscalYear, then
// submits the slips and posts one accrual journal entry.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { PayrollEntryDrafted, PayrollEntrySubmitted, SalarySlipsSubmitted } from "../blueprint/things/payroll-entry/events.ts";
import { StructureInUse } from "../blueprint/things/salary-structure/errors.ts";
import {
  AccrualOutsideFiscalYear,
  NoAssignmentAtStart,
  NoEmployeesFound,
  PayableAccountHasType,
  PayableAccountIsGroup,
  PayableAccountNotInCompany,
  PayrollCostCenterIsGroup,
  PayrollCostCenterNotInCompany,
  PayrollEndsBeforeStart,
  SalarySlipExists,
} from "../blueprint/things/payroll-entry/errors.ts";
import { machine as entries } from "../blueprint/things/payroll-entry/machine.ts";
import { machine as journals } from "../blueprint/things/journal-entry/machine.ts";
import draftPayroll from "../blueprint/things/payroll-entry/verbs/create.ts";
import submitPayroll from "../blueprint/things/payroll-entry/verbs/submit.ts";
import submitSlips from "../blueprint/things/payroll-entry/verbs/submit-slips.ts";
import getPayroll from "../blueprint/things/payroll-entry/verbs/get.ts";
import listPayrolls from "../blueprint/things/payroll-entry/verbs/list.ts";
import payrollEmployees from "../blueprint/things/payroll-employee-detail/verbs/list.ts";
import slipList from "../blueprint/things/salary-slip/verbs/list.ts";
import entryLines from "../blueprint/things/journal-entry-account/verbs/list.ts";
import ledger from "../blueprint/things/gl-entry/verbs/list.ts";
import balance from "../blueprint/things/account/verbs/balance.ts";
import assign from "../blueprint/things/salary-structure-assignment/verbs/create.ts";
import submitAssignment from "../blueprint/things/salary-structure-assignment/verbs/submit.ts";
import createStructure from "../blueprint/things/salary-structure/verbs/create.ts";
import submitStructure from "../blueprint/things/salary-structure/verbs/submit.ts";
import hire from "../blueprint/things/employee/verbs/hire.ts";
import relieve from "../blueprint/things/employee/verbs/relieve.ts";
import cancelAssignment from "../blueprint/things/salary-structure-assignment/verbs/cancel.ts";
import listAssignments from "../blueprint/things/salary-structure-assignment/verbs/list.ts";
import cancelStructure from "../blueprint/things/salary-structure/verbs/cancel.ts";
import getEntry from "../blueprint/things/journal-entry/verbs/get.ts";
import createYear from "../blueprint/things/fiscal-year/verbs/create.ts";
import createComponent from "../blueprint/things/salary-component/verbs/create.ts";
import structureLines from "../blueprint/things/salary-detail/verbs/list.ts";
import createAccount from "../blueprint/things/account/verbs/create.ts";

const USDC = 1_000_000n;
type Entry = { readonly startDate: string; readonly endDate: string; readonly numberOfEmployees: bigint; readonly state: string };
const entryRows = (p: { readonly items: ReadonlyArray<Entry> }) => p.items.map((i) => [i.startDate, i.endDate, i.numberOfEmployees, i.state]);
const employees = (p: { readonly items: ReadonlyArray<{ readonly employee: string }> }) => p.items.map((i) => i.employee);
type Slip = {
  readonly company: string; readonly employee: string; readonly postingDate: string; readonly startDate: string; readonly endDate: string;
  readonly grossPay: bigint; readonly totalDeduction: bigint; readonly netPay: bigint; readonly status: string;
};
const slips = (p: { readonly items: ReadonlyArray<Slip> }) =>
  p.items.map((i) => [i.company, i.employee, i.postingDate, i.startDate, i.endDate, i.grossPay, i.totalDeduction, i.netPay, i.status]);
type Jl = { readonly line: bigint; readonly account: string; readonly costCenter: string; readonly debit: bigint; readonly credit: bigint };
const jls = (p: { readonly items: ReadonlyArray<Jl> }) => p.items.map((i) => [i.line, i.account, i.costCenter, i.debit, i.credit]);
type Gl = { readonly account: string; readonly postingDate: string; readonly debit: bigint; readonly credit: bigint; readonly isCancelled: boolean };
const gl = (p: { readonly items: ReadonlyArray<Gl> }) => p.items.map((i) => [i.account, i.postingDate, i.debit, i.credit, i.isCancelled]);
const sums = (a: { readonly debit: bigint; readonly credit: bigint; readonly balance: bigint }) => [a.debit, a.credit, a.balance];

export default Blueprint.journey("run a payroll", {
  // Acme Trading's chart with Salaries, Pension Payable and Payroll Payable (no account type), Bank (a Bank account),
  // Liabilities (a group), the cost centers Acme Trading (a group) and Operations, and its fiscal year 2026. Engineers
  // pays Basic 3,000 and Housing 500, less Pension 150. Olga joined on 5 January 2026 and is assigned Engineers from that
  // day; Cy joined on 12 January and has no assignment. Ada also runs Acme Logistics, with its own Payroll Payable, its
  // Liabilities group and its cost center Transport, where Bo drives from 2 March 2026 with no assignment.
  cast: { ada: owner, olga: Blueprint.signedIn, cy: Blueprint.signedIn, dee: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "an outside cost center",
  steps: (s) => {
    const draft = (startDate: string, endDate: string, more: { readonly [k: string]: unknown } = {}) =>
      s.ada.run(draftPayroll, {
        company: s.world.company, postingDate: endDate, startDate, endDate, costCenter: s.world.costCenter, payrollPayableAccount: s.world.payable, ...more,
      } as never);
    const to = (employee: unknown, salaryStructure: unknown, fromDate: string) =>
      s.ada.run(assign, { company: s.world.company, employee, salaryStructure, fromDate } as never);
    const engineersSlip = (employee: unknown, startDate: string, endDate: string, status: string) =>
      [s.world.company, employee, endDate, startDate, endDate, 3_500n * USDC, 150n * USDC, 3_350n * USDC, status];
    return [
      s.step(
        "Bo can't draft Acme Trading's payroll",
        s.bo.run(draftPayroll, {
          company: s.world.company, postingDate: "2026-02-28", startDate: "2026-02-01", endDate: "2026-02-28", costCenter: s.world.costCenter, payrollPayableAccount: s.world.payable,
        }),
        refuses(Blueprint.NotAllowed),
        noEvents(),
        spans({ absent: ["payroll-entry.create.insert"] }),
      ),
      s.step(
        "a payroll ending before it starts is refused, naming its first day",
        draft("2026-02-28", "2026-02-01"),
        refuses(PayrollEndsBeforeStart, { startDate: "2026-02-28" }),
        noEvents(),
        spans({ absent: ["payroll-entry.create.insert"] }),
      ),
      s.step("net pay owed on a group is refused", draft("2026-02-01", "2026-02-28", { payrollPayableAccount: s.world.liabilities }), refuses(PayableAccountIsGroup), noEvents()),
      s.step("so is net pay owed on an account with a type: Bank", draft("2026-02-01", "2026-02-28", { payrollPayableAccount: s.world.bank }), refuses(PayableAccountHasType), noEvents()),
      s.step(
        "Ada adds another ledger under Liabilities, typed as owed to suppliers",
        s.ada.run(createAccount, { company: s.world.company, accountName: "Trade Creditors", parentAccount: s.world.liabilities, isGroup: false, accountType: "Payable" }),
      ),
      s.step("net pay owed on it is refused too: any account type is", draft("2026-02-01", "2026-02-28", { payrollPayableAccount: s.last.account }), refuses(PayableAccountHasType), noEvents()),
      s.step(
        "the days are judged before the account",
        draft("2026-02-28", "2026-02-01", { payrollPayableAccount: s.world.liabilities }),
        refuses(PayrollEndsBeforeStart, { startDate: "2026-02-28" }),
        noEvents(),
      ),
      s.step("a group cost center is refused", draft("2026-02-01", "2026-02-28", { costCenter: s.world.mainCostCenter }), refuses(PayrollCostCenterIsGroup), noEvents()),
      s.step(
        "the account is judged before the cost center",
        draft("2026-02-01", "2026-02-28", { payrollPayableAccount: s.world.bank, costCenter: s.world.mainCostCenter }),
        refuses(PayableAccountHasType),
        noEvents(),
      ),
      s.step("December 2025, before anyone joined, finds no one to pay", draft("2025-12-01", "2025-12-31"), refuses(NoEmployeesFound), noEvents()),
      s.step(
        "the cost center is judged before the employees",
        draft("2025-12-01", "2025-12-31", { costCenter: s.world.mainCostCenter }),
        refuses(PayrollCostCenterIsGroup),
        noEvents(),
      ),
      s.step(
        "net pay can't be owed on Acme Logistics' Payroll Payable",
        draft("2026-02-01", "2026-02-28", { payrollPayableAccount: s.world.otherPayable }),
        refuses(PayableAccountNotInCompany),
        noEvents(),
      ),
      s.step(
        "nor on its Liabilities: another company's is refused before a group",
        draft("2026-02-01", "2026-02-28", { payrollPayableAccount: s.world.otherLiabilities }),
        refuses(PayableAccountNotInCompany),
        noEvents(),
      ),
      s.step(
        "nor booked in Acme Logistics' Transport",
        draft("2026-02-01", "2026-02-28", { costCenter: s.world.otherCostCenter }),
        refuses(PayrollCostCenterNotInCompany),
        noEvents(),
      ),
      s.step(
        "Acme Logistics' March payroll finds no one: Bo has no assignment, and Acme Trading's employees aren't its own",
        draft("2026-03-01", "2026-03-31", { company: s.world.otherCompany, payrollPayableAccount: s.world.otherPayable, costCenter: s.world.otherCostCenter }),
        refuses(NoEmployeesFound),
        noEvents(),
      ),
      s.step(
        "nor can Acme Logistics' payroll owe on Acme Trading's Payroll Payable",
        draft("2026-03-01", "2026-03-31", { company: s.world.otherCompany, costCenter: s.world.otherCostCenter }),
        refuses(PayableAccountNotInCompany),
        noEvents(),
      ),
      s.step(
        "Ada drafts February's payroll: Olga alone, as Cy has no assignment",
        draft("2026-02-01", "2026-02-28"),
        expect((a) => a.numberOfEmployees).toBe(1n),
        emits(PayrollEntryDrafted, { company: s.world.company, numberOfEmployees: 1n }),
        entries.isIn(s.last.payrollEntry, "draft"),
        spans({ present: ["payroll-entry.create", "payroll-entry.create.load", "payroll-entry.create.insert"] }),
      ),
      s.step("Bo can't read it", s.bo.run(getPayroll, { id: s.last.payrollEntry }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor can Olga", s.olga.run(getPayroll, { id: s.last.payrollEntry }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("it holds Olga", s.ada.run(payrollEmployees, { payrollEntry: s.last.payrollEntry }), expect(employees).toEqual([s.world.employee])),
      s.step("Bo can't list its employees", s.bo.run(payrollEmployees, { payrollEntry: s.last.items[0].payrollEntry }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor submit it", s.bo.run(submitPayroll, { payrollEntry: s.last.items[0].payrollEntry }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "a draft's slips can't be submitted",
        s.ada.run(submitSlips, { payrollEntry: s.last.items[0].payrollEntry }),
        refuses(entries.notFrom, { state: "draft" }),
        noEvents(),
        spans({ absent: ["payroll-entry.submit-slips.accrue"] }),
      ),
      s.step(
        "Ada submits it: one draft slip",
        s.ada.run(submitPayroll, { payrollEntry: s.last.items[0].payrollEntry }),
        expect((a) => a.slips).toBe(1n),
        emits(PayrollEntrySubmitted, { payrollEntry: s.last.payrollEntry, slips: 1n }),
        entries.isIn(s.last.payrollEntry, "submitted"),
        spans({ present: ["payroll-entry.submit", "payroll-entry.submit.load", "payroll-entry.submit.slips"] }),
      ),
      s.step(
        "it can't be submitted twice",
        s.ada.run(submitPayroll, { payrollEntry: s.last.payrollEntry }),
        refuses(entries.notFrom, { state: "submitted" }),
        noEvents(),
        spans({ absent: ["payroll-entry.submit.slips"] }),
      ),
      s.step(
        "Olga's February slip: her structure in full, a draft",
        s.ada.run(slipList, { employee: s.world.employee, payrollEntry: s.last.payrollEntry }),
        expect(slips).toEqual([engineersSlip(s.world.employee, "2026-02-01", "2026-02-28", "Draft")]),
      ),
      s.step("Olga lists her own slips", s.olga.run(slipList, { employee: s.world.employee }), expect((p) => p.items.length).toBe(1)),
      s.step("Cy can't list Olga's", s.cy.run(slipList, { employee: s.world.employee }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("Bo can't submit the slips", s.bo.run(submitSlips, { payrollEntry: s.last.items[0].payrollEntry }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Ada submits them: one accrual journal entry",
        s.ada.run(submitSlips, { payrollEntry: s.last.items[0].payrollEntry }),
        expect((a) => a.slips).toBe(1n),
        emits(SalarySlipsSubmitted, { payrollEntry: s.last.payrollEntry, journalEntry: s.last.journalEntry, slips: 1n }),
        entries.isIn(s.last.payrollEntry, "accrued"),
        journals.isIn(s.last.journalEntry, "submitted"),
        spans({ present: ["payroll-entry.submit-slips", "payroll-entry.submit-slips.load", "payroll-entry.submit-slips.accrue"] }),
      ),
      s.step("an accrued entry can't be submitted", s.ada.run(submitPayroll, { payrollEntry: s.last.payrollEntry }), refuses(entries.notFrom, { state: "accrued" }), noEvents()),
      s.step("nor its slips again", s.ada.run(submitSlips, { payrollEntry: s.last.payrollEntry }), refuses(entries.notFrom, { state: "accrued" }), noEvents()),
      s.step(
        "the journal entry: Salaries debited 3,500, Pension Payable credited 150, Payroll Payable the 3,350 net, in Operations",
        s.ada.run(entryLines, { journalEntry: s.last.journalEntry }),
        expect(jls).toEqual([
          [1n, s.world.salaries, s.world.costCenter, 3_500n * USDC, 0n],
          [2n, s.world.pension, s.world.costCenter, 0n, 150n * USDC],
          [3n, s.world.payable, s.world.costCenter, 0n, 3_350n * USDC],
        ]),
      ),
      s.step("Olga's slip is submitted now", s.ada.run(slipList, { employee: s.world.employee }), expect(slips).toEqual([engineersSlip(s.world.employee, "2026-02-01", "2026-02-28", "Submitted")])),
      s.step(
        "and names the journal entry, which owes her net pay on Payroll Payable on 28 February",
        s.ada.run(ledger, { account: s.world.payable, voucherId: s.last.items[0].journalEntry }),
        expect(gl).toEqual([[s.world.payable, "2026-02-28", 0n, 3_350n * USDC, false]]),
      ),
      s.step("February again finds no one: Olga is paid for these very days", draft("2026-02-01", "2026-02-28"), refuses(NoEmployeesFound), noEvents()),
      s.step("Ada drafts Cy's assignment from 1 February, and leaves it a draft", to(s.world.secondEmployee, s.world.salaryStructure, "2026-02-01")),
      s.step("February still finds no one: a draft assignment doesn't count", draft("2026-02-01", "2026-02-28"), refuses(NoEmployeesFound), noEvents()),
      s.step("but 2 to 28 February are other days, so it holds her", draft("2026-02-02", "2026-02-28"), expect((a) => a.numberOfEmployees).toBe(1n)),
      s.step("Ada drafts March's payroll, A: Olga alone", draft("2026-03-01", "2026-03-31"), expect((a) => a.numberOfEmployees).toBe(1n)),
      s.step("she assigns the engineers' structure to Cy from 16 March", to(s.world.secondEmployee, s.world.salaryStructure, "2026-03-16")),
      s.step("and submits it", s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment })),
      s.step("February still finds no one: Cy's submitted assignment starts after it", draft("2026-02-01", "2026-02-28"), refuses(NoEmployeesFound), noEvents()),
      s.step("March's payroll B holds Olga and Cy: Cy's assignment starts by the last day", draft("2026-03-01", "2026-03-31"), expect((a) => a.numberOfEmployees).toBe(2n)),
      s.step("so does X, from 2 to 31 March", draft("2026-03-02", "2026-03-31"), expect((a) => a.numberOfEmployees).toBe(2n)),
      s.step("Bo can't list Acme Trading's payroll entries", s.bo.run(listPayrolls, { company: s.world.company }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Acme Trading's payroll entries, oldest first",
        s.ada.run(listPayrolls, { company: s.world.company }),
        expect(entryRows).toEqual([
          ["2026-02-01", "2026-02-28", 1n, "accrued"],
          ["2026-02-02", "2026-02-28", 1n, "draft"],
          ["2026-03-01", "2026-03-31", 1n, "draft"],
          ["2026-03-01", "2026-03-31", 2n, "draft"],
          ["2026-03-02", "2026-03-31", 2n, "draft"],
        ]),
      ),
      s.step(
        "X can't be submitted: Cy's assignment starts after 2 March, and the refusal names her",
        s.ada.run(submitPayroll, { payrollEntry: s.last.items[4].id }),
        refuses(NoAssignmentAtStart, { employee: s.world.secondEmployee }),
        noEvents(),
        spans({ absent: ["payroll-entry.submit.slips"] }),
      ),
      s.step("Ada submits A: Olga's March slip", s.ada.run(submitPayroll, { payrollEntry: s.last.items[2].id }), expect((a) => a.slips).toBe(1n)),
      s.step("Ada lists the entries again", s.ada.run(listPayrolls, { company: s.world.company }), expect((p) => p.items.length).toBe(5)),
      s.step(
        "B can't be submitted: A's draft slip covers Olga's March, judged before Cy's late assignment",
        s.ada.run(submitPayroll, { payrollEntry: s.last.items[3].id }),
        refuses(SalarySlipExists, { employee: s.world.employee }),
        noEvents(),
        spans({ absent: ["payroll-entry.submit.slips"] }),
      ),
      s.step("a draft slip doesn't keep Olga out of a new March payroll, D", draft("2026-03-01", "2026-03-31"), expect((a) => a.numberOfEmployees).toBe(2n)),
      s.step("Ada lists the entries again", s.ada.run(listPayrolls, { company: s.world.company }), expect((p) => p.items.length).toBe(6)),
      s.step("she submits A's slips", s.ada.run(submitSlips, { payrollEntry: s.last.items[2].id }), expect((a) => a.slips).toBe(1n)),
      s.step("a submitted slip does: March's payroll E holds Cy alone", draft("2026-03-01", "2026-03-31"), expect((a) => a.numberOfEmployees).toBe(1n)),
      s.step("it holds Cy", s.ada.run(payrollEmployees, { payrollEntry: s.last.payrollEntry }), expect(employees).toEqual([s.world.secondEmployee])),
      s.step(
        "E can't be submitted either, Cy's assignment starting on 16 March",
        s.ada.run(submitPayroll, { payrollEntry: s.last.items[0].payrollEntry }),
        refuses(NoAssignmentAtStart, { employee: s.world.secondEmployee }),
        noEvents(),
      ),
      s.step("Ada assigns it to Cy from 1 March too", to(s.world.secondEmployee, s.world.salaryStructure, "2026-03-01")),
      s.step("and submits it", s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment })),
      s.step("Ada lists the entries again", s.ada.run(listPayrolls, { company: s.world.company }), expect((p) => p.items.length).toBe(7)),
      s.step("E can be submitted now", s.ada.run(submitPayroll, { payrollEntry: s.last.items[6].id }), expect((a) => a.slips).toBe(1n)),
      s.step(
        "Cy's March slip: her structure in full, a draft",
        s.ada.run(slipList, { employee: s.world.secondEmployee, payrollEntry: s.last.payrollEntry }),
        expect(slips).toEqual([engineersSlip(s.world.secondEmployee, "2026-03-01", "2026-03-31", "Draft")]),
      ),
      s.step("Cy lists her own: that slip alone", s.cy.run(slipList, { employee: s.world.secondEmployee }), expect((p) => p.items.length).toBe(1)),
      s.step(
        "Ada drafts a seniors' structure: Basic at 5,000, nothing deducted",
        s.ada.run(createStructure, { company: s.world.company, salaryStructureName: "Seniors", earnings: [{ salaryComponent: s.world.basic, amount: 5_000n * USDC }], deductions: [] } as never),
      ),
      s.step("and submits it", s.ada.run(submitStructure, { salaryStructure: s.last.salaryStructure })),
      s.step("she assigns it to Olga from 1 April", to(s.world.employee, s.last.salaryStructure, "2026-04-01")),
      s.step("and submits it", s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment })),
      s.step(
        "Ada hires Dee, joining on Wednesday 8 April",
        s.ada.run(hire, {
          company: s.world.company, person: s.dee.person, firstName: "Dee Otieno", gender: "Female", dateOfBirth: "1996-05-21",
          dateOfJoining: "2026-04-08", department: s.world.department, designation: s.world.designation,
        }),
      ),
      s.step("she assigns the engineers' structure to Dee from her joining day", to(s.last.employee, s.world.salaryStructure, "2026-04-08")),
      s.step("and submits it", s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment })),
      s.step(
        "April's payroll holds Olga, Cy and Dee, in the order they were hired",
        draft("2026-04-01", "2026-04-30"),
        expect((a) => a.numberOfEmployees).toBe(3n),
      ),
      s.step("it holds them", s.ada.run(payrollEmployees, { payrollEntry: s.last.payrollEntry }), expect((p) => p.items.length).toBe(3)),
      s.step("Ada relieves Cy on 15 April, after the draft", s.ada.run(relieve, { employee: s.world.secondEmployee, relievingDate: "2026-04-15" })),
      s.step("Ada lists the entries again", s.ada.run(listPayrolls, { company: s.world.company }), expect((p) => p.items.length).toBe(8)),
      s.step(
        "she submits April: three slips, Cy's too, and Dee's though she joined on the 8th",
        s.ada.run(submitPayroll, { payrollEntry: s.last.items[7].id }),
        expect((a) => a.slips).toBe(3n),
      ),
      s.step(
        "Olga's April slip is paid by the seniors' structure, her latest assignment",
        s.ada.run(slipList, { employee: s.world.employee, payrollEntry: s.last.payrollEntry }),
        expect(slips).toEqual([[s.world.company, s.world.employee, "2026-04-30", "2026-04-01", "2026-04-30", 5_000n * USDC, 0n, 5_000n * USDC, "Draft"]]),
      ),
      s.step(
        "Cy's by the engineers' structure, though she has left",
        s.ada.run(slipList, { employee: s.world.secondEmployee, payrollEntry: s.last.items[0].payrollEntry }),
        expect(slips).toEqual([engineersSlip(s.world.secondEmployee, "2026-04-01", "2026-04-30", "Draft")]),
      ),
      s.step(
        "Ada submits April's slips",
        s.ada.run(submitSlips, { payrollEntry: s.last.items[0].payrollEntry }),
        expect((a) => a.slips).toBe(3n),
        emits(SalarySlipsSubmitted, { payrollEntry: s.last.payrollEntry, journalEntry: s.last.journalEntry, slips: 3n }),
      ),
      s.step(
        "one journal entry books all three: Salaries 12,000, Pension Payable 300, Payroll Payable 11,700",
        s.ada.run(entryLines, { journalEntry: s.last.journalEntry }),
        expect(jls).toEqual([
          [1n, s.world.salaries, s.world.costCenter, 12_000n * USDC, 0n],
          [2n, s.world.pension, s.world.costCenter, 0n, 300n * USDC],
          [3n, s.world.payable, s.world.costCenter, 0n, 11_700n * USDC],
        ]),
      ),
      s.step(
        "Salaries holds February, Olga's March and April: E's slips aren't booked yet",
        s.ada.run(balance, { account: s.world.salaries, onDay: "2026-04-30" }),
        expect(sums).toEqual([19_000n * USDC, 0n, 19_000n * USDC]),
      ),
      s.step("Pension Payable owes 600", s.ada.run(balance, { account: s.world.pension, onDay: "2026-04-30" }), expect(sums).toEqual([0n, 600n * USDC, -600n * USDC])),
      s.step("Payroll Payable owes 18,400", s.ada.run(balance, { account: s.world.payable, onDay: "2026-04-30" }), expect(sums).toEqual([0n, 18_400n * USDC, -18_400n * USDC])),
      s.step("and 6,700 the day before April's", s.ada.run(balance, { account: s.world.payable, onDay: "2026-04-29" }), expect(sums).toEqual([0n, 6_700n * USDC, -6_700n * USDC])),
      s.step(
        "booking April's slips left E's March slip for Cy a draft: only the entry's own slips are submitted",
        s.ada.run(slipList, { employee: s.world.secondEmployee }),
        expect((p) => p.items.map((i: { startDate: string; status: string }) => [i.startDate, i.status])).toEqual([["2026-03-01", "Draft"], ["2026-04-01", "Submitted"]]),
      ),
      s.step(
        "May's payroll, posted on 4 January 2027, skips Cy, who has left",
        draft("2026-05-01", "2026-05-31", { postingDate: "2027-01-04" }),
        expect((a) => a.numberOfEmployees).toBe(2n),
      ),
      s.step("it holds Olga and Dee", s.ada.run(payrollEmployees, { payrollEntry: s.last.payrollEntry }), expect((p) => p.items.length).toBe(2)),
      s.step("Ada submits it", s.ada.run(submitPayroll, { payrollEntry: s.last.items[0].payrollEntry }), expect((a) => a.slips).toBe(2n)),
      s.step(
        "Acme Logistics sets up its next fiscal year, which holds that day",
        s.ada.run(createYear, { company: s.world.otherCompany, year: "FY27", yearStartDate: "2027-01-01", yearEndDate: "2027-12-31", isShortYear: false }),
      ),
      s.step("Ada lists the entries again", s.ada.run(listPayrolls, { company: s.world.company }), expect((p) => p.items.length).toBe(9)),
      s.step(
        "its slips can't be booked: 4 January 2027 is in none of Acme Trading's fiscal years, though Acme Logistics', and the refusal names it",
        s.ada.run(submitSlips, { payrollEntry: s.last.items[8].id }),
        refuses(AccrualOutsideFiscalYear, { postingDate: "2027-01-04" }),
        noEvents(),
        spans({ absent: ["payroll-entry.submit-slips.accrue"] }),
      ),
      s.step("the entry stays submitted", s.ada.run(getPayroll, { id: s.last.items[8].id }), expect((a) => [a.postingDate, a.numberOfEmployees, a.state]).toEqual(["2027-01-04", 2n, "submitted"])),
      s.step(
        "and Olga's May slip a draft, after her three submitted ones",
        s.ada.run(slipList, { employee: s.world.employee }),
        expect((p) => p.items.map((i: { status: string; startDate: string; postingDate: string }) => [i.startDate, i.postingDate, i.status])).toEqual([
          ["2026-02-01", "2026-02-28", "Submitted"], ["2026-03-01", "2026-03-31", "Submitted"], ["2026-04-01", "2026-04-30", "Submitted"], ["2026-05-01", "2027-01-04", "Draft"],
        ]),
      ),
      s.step(
        "May's employees: Olga, then Dee",
        s.ada.run(payrollEmployees, { payrollEntry: s.last.items[3].payrollEntry }),
        expect(employees).toEqual([s.world.employee, s.last.items[1].employee]),
      ),
      s.step(
        "Dee's slips run over the entries' days, April's from the 1st though she joined on the 8th",
        s.ada.run(slipList, { employee: s.last.items[1].employee }),
        expect((p) => p.items.map((i: { startDate: string; endDate: string }) => [i.startDate, i.endDate])).toEqual([["2026-04-01", "2026-04-30"], ["2026-05-01", "2026-05-31"]]),
      ),
      s.step("Ada relieves Dee on 31 May", s.ada.run(relieve, { employee: s.last.items[1].employee, relievingDate: "2026-05-31" })),
      s.step("June's payroll holds Olga alone", draft("2026-06-01", "2026-06-30"), expect((a) => a.numberOfEmployees).toBe(1n)),
      s.step("Ada submits it", s.ada.run(submitPayroll, { payrollEntry: s.last.payrollEntry }), expect((a) => a.slips).toBe(1n)),
      s.step("and its slips", s.ada.run(submitSlips, { payrollEntry: s.last.payrollEntry }), expect((a) => a.slips).toBe(1n)),
      s.step(
        "nothing is deducted, so the journal entry has no pension line: Salaries and Payroll Payable, 5,000 each",
        s.ada.run(entryLines, { journalEntry: s.last.journalEntry }),
        expect(jls).toEqual([
          [1n, s.world.salaries, s.world.costCenter, 5_000n * USDC, 0n],
          [2n, s.world.payable, s.world.costCenter, 0n, 5_000n * USDC],
        ]),
      ),
      s.step(
        "Ada drafts a structure paying nothing net: Basic at 150, less Pension at its own 150",
        s.ada.run(createStructure, {
          company: s.world.company, salaryStructureName: "Volunteers", earnings: [{ salaryComponent: s.world.basic, amount: 150n * USDC }], deductions: [{ salaryComponent: s.world.pensionComponent, amount: 0n }],
        } as never),
      ),
      s.step("and submits it", s.ada.run(submitStructure, { salaryStructure: s.last.salaryStructure })),
      s.step("she assigns it to Olga from 1 July", to(s.world.employee, s.last.salaryStructure, "2026-07-01")),
      s.step("and submits it", s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment })),
      s.step("July's payroll, posted on 31 December, the fiscal year's last day, holds Olga", draft("2026-07-01", "2026-07-31", { postingDate: "2026-12-31" }), expect((a) => a.numberOfEmployees).toBe(1n)),
      s.step("Ada submits it", s.ada.run(submitPayroll, { payrollEntry: s.last.payrollEntry }), expect((a) => a.slips).toBe(1n)),
      s.step("its slips are booked: the year's last day counts", s.ada.run(submitSlips, { payrollEntry: s.last.payrollEntry }), expect((a) => a.slips).toBe(1n)),
      s.step(
        "a net pay of nothing posts no line to Payroll Payable: Salaries and Pension Payable, 150 each",
        s.ada.run(entryLines, { journalEntry: s.last.journalEntry }),
        expect(jls).toEqual([
          [1n, s.world.salaries, s.world.costCenter, 150n * USDC, 0n],
          [2n, s.world.pension, s.world.costCenter, 0n, 150n * USDC],
        ]),
      ),
      s.step(
        "its ledger line on Salaries is posted on 31 December, not the payroll's last day",
        s.ada.run(ledger, { account: s.world.salaries, voucherId: s.last.items[0].journalEntry }),
        expect(gl).toEqual([[s.world.salaries, "2026-12-31", 150n * USDC, 0n, false]]),
      ),
      s.step(
        "and so is the journal entry",
        s.ada.run(getEntry, { id: s.last.items[0].voucherId }),
        expect((a) => [a.postingDate, a.userRemark, a.totalDebit, a.totalCredit, a.state]).toEqual([
          "2026-12-31", "Accrual Journal Entry for salaries from 2026-07-01 to 2026-07-31", 150n * USDC, 150n * USDC, "submitted",
        ]),
      ),
      s.step("August's payroll, posted on 1 January, the fiscal year's first day, holds Olga", draft("2026-08-01", "2026-08-31", { postingDate: "2026-01-01" }), expect((a) => a.numberOfEmployees).toBe(1n)),
      s.step("Ada submits it", s.ada.run(submitPayroll, { payrollEntry: s.last.payrollEntry }), expect((a) => a.slips).toBe(1n)),
      s.step("its slips are booked: the year's first day counts", s.ada.run(submitSlips, { payrollEntry: s.last.payrollEntry }), expect((a) => a.slips).toBe(1n)),
      s.step("its journal entry's lines", s.ada.run(entryLines, { journalEntry: s.last.journalEntry }), expect((p) => p.items.length).toBe(2)),
      s.step(
        "its ledger line on Pension Payable is posted on 1 January",
        s.ada.run(ledger, { account: s.world.pension, voucherId: s.last.items[0].journalEntry }),
        expect(gl).toEqual([[s.world.pension, "2026-01-01", 0n, 150n * USDC, false]]),
      ),
      s.step(
        "Olga's assignments: the first, the seniors' structure, the one paying nothing net",
        s.ada.run(listAssignments, { employee: s.world.employee }),
        expect((p) => p.items.map((i: { fromDate: string; state: string }) => [i.fromDate, i.state])).toEqual([
          ["2026-01-05", "submitted"], ["2026-04-01", "submitted"], ["2026-07-01", "submitted"],
        ]),
      ),
      s.step("Ada cancels the seniors' one", s.ada.run(cancelAssignment, { salaryStructureAssignment: s.last.items[1].id })),
      s.step(
        "no submitted assignment uses that structure now, but its slips do: it can't be cancelled",
        s.ada.run(cancelStructure, { salaryStructure: s.last.salaryStructure }),
        refuses(StructureInUse),
        noEvents(),
        spans({ absent: ["salary-structure.cancel.update"] }),
      ),
      s.step("she assigns that structure to Olga again, from 15 September", to(s.world.employee, s.last.salaryStructure, "2026-09-15")),
      s.step("and submits it", s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment })),
      s.step("and again from 1 October", to(s.world.employee, s.last.salaryStructure, "2026-10-01")),
      s.step("and submits that", s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment })),
      s.step("September's payroll holds Olga", draft("2026-09-01", "2026-09-30"), expect((a) => a.numberOfEmployees).toBe(1n)),
      s.step(
        "it can't be submitted: her latest structure has no assignment by 1 September, though another of hers has",
        s.ada.run(submitPayroll, { payrollEntry: s.last.payrollEntry }),
        refuses(NoAssignmentAtStart, { employee: s.world.employee }),
        noEvents(),
        spans({ absent: ["payroll-entry.submit.slips"] }),
      ),
      s.step("Ada assigns the engineers' structure to Olga from 20 September, made later but starting earlier", to(s.world.employee, s.world.salaryStructure, "2026-09-20")),
      s.step("and submits it", s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment })),
      s.step("and drafts another from 10 October, left a draft", to(s.world.employee, s.world.salaryStructure, "2026-10-10")),
      s.step("October's payroll holds Olga", draft("2026-10-01", "2026-10-31"), expect((a) => a.numberOfEmployees).toBe(1n)),
      s.step("Ada submits it", s.ada.run(submitPayroll, { payrollEntry: s.last.payrollEntry }), expect((a) => a.slips).toBe(1n)),
      s.step(
        "Olga's October slip pays the seniors' structure: the latest day among submitted assignments, not the latest made",
        s.ada.run(slipList, { employee: s.world.employee, payrollEntry: s.last.payrollEntry }),
        expect(slips).toEqual([[s.world.company, s.world.employee, "2026-10-31", "2026-10-01", "2026-10-31", 5_000n * USDC, 0n, 5_000n * USDC, "Draft"]]),
      ),
      s.step("Ada lists the entries again", s.ada.run(listPayrolls, { company: s.world.company }), expect((p) => p.items.length).toBe(14)),
      s.step(
        "D can't be submitted: A's submitted slip covers Olga, E's draft one Cy, and the first hire is named",
        s.ada.run(submitPayroll, { payrollEntry: s.last.items[5].id }),
        refuses(SalarySlipExists, { employee: s.world.employee }),
        noEvents(),
      ),
      s.step("1 to 27 February are other days than her paid February: it holds Olga", draft("2026-02-01", "2026-02-27"), expect((a) => a.numberOfEmployees).toBe(1n)),
      s.step("and can be submitted: no slip covers those very days", s.ada.run(submitPayroll, { payrollEntry: s.last.payrollEntry }), expect((a) => a.slips).toBe(1n)),
      s.step("a one-day payroll is allowed", draft("2026-02-28", "2026-02-28"), expect((a) => a.numberOfEmployees).toBe(1n)),
      s.step(
        "Ada adds a deduction for meals of 50 USDC, booked to Salaries",
        s.ada.run(createComponent, { company: s.world.company, salaryComponent: "Cafeteria", type: "Deduction", amount: 50n * USDC, account: s.world.salaries }),
      ),
      s.step(
        "she drafts a structure: Basic, less the meals deduction, then Pension",
        s.ada.run(createStructure, {
          company: s.world.company, salaryStructureName: "Meal plan one", earnings: [{ salaryComponent: s.world.basic, amount: 0n }],
          deductions: [{ salaryComponent: s.last.salaryComponent, amount: 0n }, { salaryComponent: s.world.pensionComponent, amount: 0n }],
        } as never),
      ),
      s.step("and submits it", s.ada.run(submitStructure, { salaryStructure: s.last.salaryStructure })),
      s.step("she assigns it to Olga from 1 November", to(s.world.employee, s.last.salaryStructure, "2026-11-01")),
      s.step("and submits it", s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment })),
      s.step(
        "its lines",
        s.ada.run(structureLines, { salaryStructure: s.last.salaryStructure }),
        expect((p) => p.items.map((i: { type: string; amount: bigint }) => [i.type, i.amount])).toEqual([["Earning", 3_000n * USDC], ["Deduction", 50n * USDC], ["Deduction", 150n * USDC]]),
      ),
      s.step(
        "she drafts another with the deductions the other way round",
        s.ada.run(createStructure, {
          company: s.world.company, salaryStructureName: "Meal plan two", earnings: [{ salaryComponent: s.world.basic, amount: 0n }],
          deductions: [{ salaryComponent: s.world.pensionComponent, amount: 0n }, { salaryComponent: s.last.items[1].salaryComponent, amount: 0n }],
        } as never),
      ),
      s.step("and submits it", s.ada.run(submitStructure, { salaryStructure: s.last.salaryStructure })),
      s.step("she assigns it to Olga from 16 November", to(s.world.employee, s.last.salaryStructure, "2026-11-16")),
      s.step("and submits it", s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment })),
      s.step("1 to 15 November's payroll holds Olga", draft("2026-11-01", "2026-11-15"), expect((a) => a.numberOfEmployees).toBe(1n)),
      s.step("Ada submits it", s.ada.run(submitPayroll, { payrollEntry: s.last.payrollEntry }), expect((a) => a.slips).toBe(1n)),
      s.step("and its slips", s.ada.run(submitSlips, { payrollEntry: s.last.payrollEntry }), expect((a) => a.slips).toBe(1n)),
      s.step(
        "Salaries is debited and credited on lines of their own, not netted; the credits in the order the slip meets them",
        s.ada.run(entryLines, { journalEntry: s.last.journalEntry }),
        expect(jls).toEqual([
          [1n, s.world.salaries, s.world.costCenter, 3_000n * USDC, 0n],
          [2n, s.world.salaries, s.world.costCenter, 0n, 50n * USDC],
          [3n, s.world.pension, s.world.costCenter, 0n, 150n * USDC],
          [4n, s.world.payable, s.world.costCenter, 0n, 2_800n * USDC],
        ]),
      ),
      s.step("16 to 30 November's payroll holds Olga", draft("2026-11-16", "2026-11-30"), expect((a) => a.numberOfEmployees).toBe(1n)),
      s.step("Ada submits it", s.ada.run(submitPayroll, { payrollEntry: s.last.payrollEntry }), expect((a) => a.slips).toBe(1n)),
      s.step("and its slips", s.ada.run(submitSlips, { payrollEntry: s.last.payrollEntry }), expect((a) => a.slips).toBe(1n)),
      s.step(
        "the credits follow the other structure's order",
        s.ada.run(entryLines, { journalEntry: s.last.journalEntry }),
        expect(jls).toEqual([
          [1n, s.world.salaries, s.world.costCenter, 3_000n * USDC, 0n],
          [2n, s.world.pension, s.world.costCenter, 0n, 150n * USDC],
          [3n, s.world.salaries, s.world.costCenter, 0n, 50n * USDC],
          [4n, s.world.payable, s.world.costCenter, 0n, 2_800n * USDC],
        ]),
      ),
      s.step(
        "Ada adds an earning of 100 USDC booked to Rent",
        s.ada.run(createComponent, { company: s.world.company, salaryComponent: "Night shift", type: "Earning", amount: 100n * USDC, account: s.world.rent }),
      ),
      s.step(
        "she drafts a structure paying it before Basic",
        s.ada.run(createStructure, {
          company: s.world.company, salaryStructureName: "Shift plan one",
          earnings: [{ salaryComponent: s.last.salaryComponent, amount: 0n }, { salaryComponent: s.world.basic, amount: 0n }], deductions: [],
        } as never),
      ),
      s.step("and submits it", s.ada.run(submitStructure, { salaryStructure: s.last.salaryStructure })),
      s.step("she assigns it to Olga from 1 December", to(s.world.employee, s.last.salaryStructure, "2026-12-01")),
      s.step("and submits it", s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment })),
      s.step(
        "its lines",
        s.ada.run(structureLines, { salaryStructure: s.last.salaryStructure }),
        expect((p) => p.items.map((i: { amount: bigint }) => i.amount)).toEqual([100n * USDC, 3_000n * USDC]),
      ),
      s.step(
        "she drafts another paying Basic first",
        s.ada.run(createStructure, {
          company: s.world.company, salaryStructureName: "Shift plan two",
          earnings: [{ salaryComponent: s.world.basic, amount: 0n }, { salaryComponent: s.last.items[0].salaryComponent, amount: 0n }], deductions: [],
        } as never),
      ),
      s.step("and submits it", s.ada.run(submitStructure, { salaryStructure: s.last.salaryStructure })),
      s.step("she assigns it to Olga from 16 December", to(s.world.employee, s.last.salaryStructure, "2026-12-16")),
      s.step("and submits it", s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment })),
      s.step("1 to 15 December's payroll holds Olga", draft("2026-12-01", "2026-12-15"), expect((a) => a.numberOfEmployees).toBe(1n)),
      s.step("Ada submits it", s.ada.run(submitPayroll, { payrollEntry: s.last.payrollEntry }), expect((a) => a.slips).toBe(1n)),
      s.step("and its slips", s.ada.run(submitSlips, { payrollEntry: s.last.payrollEntry }), expect((a) => a.slips).toBe(1n)),
      s.step(
        "the debits come in the order the slip meets their accounts: Rent, then Salaries",
        s.ada.run(entryLines, { journalEntry: s.last.journalEntry }),
        expect(jls).toEqual([
          [1n, s.world.rent, s.world.costCenter, 100n * USDC, 0n],
          [2n, s.world.salaries, s.world.costCenter, 3_000n * USDC, 0n],
          [3n, s.world.payable, s.world.costCenter, 0n, 3_100n * USDC],
        ]),
      ),
      s.step("16 to 31 December's payroll holds Olga", draft("2026-12-16", "2026-12-31"), expect((a) => a.numberOfEmployees).toBe(1n)),
      s.step("Ada submits it", s.ada.run(submitPayroll, { payrollEntry: s.last.payrollEntry }), expect((a) => a.slips).toBe(1n)),
      s.step("and its slips", s.ada.run(submitSlips, { payrollEntry: s.last.payrollEntry }), expect((a) => a.slips).toBe(1n)),
      s.step(
        "and the other way round: Salaries, then Rent",
        s.ada.run(entryLines, { journalEntry: s.last.journalEntry }),
        expect(jls).toEqual([
          [1n, s.world.salaries, s.world.costCenter, 3_000n * USDC, 0n],
          [2n, s.world.rent, s.world.costCenter, 100n * USDC, 0n],
          [3n, s.world.payable, s.world.costCenter, 0n, 3_100n * USDC],
        ]),
      ),
      s.step(
        "the days are judged before another company's account",
        draft("2026-02-28", "2026-02-01", { payrollPayableAccount: s.world.otherPayable }),
        refuses(PayrollEndsBeforeStart, { startDate: "2026-02-28" }),
        noEvents(),
      ),
      s.step(
        "Ada adds a group under Liabilities, typed as owed to suppliers",
        s.ada.run(createAccount, { company: s.world.company, accountName: "Accrued Liabilities", parentAccount: s.world.liabilities, isGroup: true, accountType: "Payable" }),
      ),
      s.step("a group is judged before its type", draft("2026-02-01", "2026-02-28", { payrollPayableAccount: s.last.account }), refuses(PayableAccountIsGroup), noEvents()),
      s.step(
        "the account's type is judged before another company's cost center",
        draft("2026-02-01", "2026-02-28", { payrollPayableAccount: s.world.bank, costCenter: s.world.otherCostCenter }),
        refuses(PayableAccountHasType),
        noEvents(),
      ),
      s.step(
        "another company's cost center is refused before being a group",
        draft("2026-02-01", "2026-02-28", { costCenter: s.world.otherMainCostCenter }),
        refuses(PayrollCostCenterNotInCompany),
        noEvents(),
      ),
      s.step(
        "and before finding no one to pay",
        draft("2025-12-01", "2025-12-31", { costCenter: s.world.otherCostCenter }),
        refuses(PayrollCostCenterNotInCompany),
        noEvents(),
      ),
    ];
  },
});
